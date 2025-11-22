import { Payment, type PaymentSnapshot } from "../domain";
import type { PaymentEventStore } from "../database/payment-event-store.port";
import type { CheckoutLinkProvider, Clock } from "../../../shared/system";
import type { AppError } from "../../../shared/exceptions/errors";
import { createError } from "../../../shared/exceptions/errors";
import type { Result } from "../../../shared/utils/result.utils";
import { err, ok } from "../../../shared/utils/result.utils";
import type { UseCase } from "./types";

export interface RetryPaymentCommand {
  paymentId: string;
}

export interface RetryPaymentResult {
  snapshot: PaymentSnapshot;
}

interface Dependencies {
  store: PaymentEventStore;
  clock: Clock;
  checkoutLinks: CheckoutLinkProvider;
}

export class RetryPaymentUseCase implements UseCase<RetryPaymentCommand, RetryPaymentResult> {
  constructor(private readonly deps: Dependencies) {}

  async execute(command: RetryPaymentCommand): Promise<Result<RetryPaymentResult, AppError>> {
    const historyResult = await this.deps.store.load(command.paymentId);
    if (!historyResult.ok) {
      return historyResult;
    }

    const aggregateResult = Payment.rehydrate(command.paymentId, historyResult.value);
    if (!aggregateResult.ok) {
      return aggregateResult;
    }

    const aggregate = aggregateResult.value;
    const expectedVersion = aggregate.getVersion();
    const now = this.deps.clock.now();

    const checkoutLink = this.deps.checkoutLinks.issue({
      paymentId: command.paymentId,
      attempt: aggregate.getSnapshot().attempt + 1,
      issuedAt: now
    });

    const retryResult = aggregate.requestRetry({
      checkoutUrl: checkoutLink.url,
      checkoutExpiresAt: checkoutLink.expiresAt,
      now
    });

    if (!retryResult.ok) {
      return retryResult;
    }

    const events = aggregate.pullEvents();
    if (events.length === 0) {
      return err(createError("unexpected", "Повторная попытка не сгенерировала события"));
    }

    const snapshot = aggregate.getSnapshot();

    const persistResult = await this.deps.store.append({
      paymentId: command.paymentId,
      events,
      expectedVersion,
      snapshot
    });

    if (!persistResult.ok) {
      return persistResult;
    }

    return ok({ snapshot });
  }
}
