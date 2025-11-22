import { Payment, type PaymentSnapshot } from "../domain";
import type { CheckoutLinkProvider, Clock, IdGenerator } from "../../../shared/system";
import type { AppError } from "../../../shared/exceptions/errors";
import { createError } from "../../../shared/exceptions/errors";
import type { Result } from "../../../shared/utils/result.utils";
import { err, ok } from "../../../shared/utils/result.utils";
import type { PaymentEventStore } from "../database/payment-event-store.port";
import type { UseCase } from "./types";

export interface CreatePaymentCommand {
  amountMinor: number;
  currency: string;
  description?: string;
  customerEmail?: string;
}

export interface CreatePaymentResult {
  snapshot: PaymentSnapshot;
}

interface Dependencies {
  store: PaymentEventStore;
  clock: Clock;
  idGenerator: IdGenerator;
  checkoutLinks: CheckoutLinkProvider;
}

export class CreatePaymentUseCase implements UseCase<CreatePaymentCommand, CreatePaymentResult> {
  constructor(private readonly deps: Dependencies) {}

  async execute(command: CreatePaymentCommand): Promise<Result<CreatePaymentResult, AppError>> {
    const paymentId = this.deps.idGenerator();
    const now = this.deps.clock.now();
    const checkoutLink = this.deps.checkoutLinks.issue({
      paymentId,
      attempt: 1,
      issuedAt: now
    });

    const aggregateResult = Payment.initiate({
      id: paymentId,
      amountMinor: command.amountMinor,
      currency: command.currency,
      description: command.description ?? null,
      customerEmail: command.customerEmail ?? null,
      checkoutUrl: checkoutLink.url,
      checkoutExpiresAt: checkoutLink.expiresAt,
      now
    });

    if (!aggregateResult.ok) {
      return aggregateResult;
    }

    const aggregate = aggregateResult.value;
    const events = aggregate.pullEvents();

    if (events.length === 0) {
      return err(createError("unexpected", "Платёж не сгенерировал событий", { paymentId }));
    }

    const snapshot = aggregate.getSnapshot();

    const persistenceResult = await this.deps.store.append({
      paymentId,
      events,
      expectedVersion: 0,
      snapshot
    });

    if (!persistenceResult.ok) {
      return persistenceResult;
    }

    return ok({ snapshot });
  }
}
