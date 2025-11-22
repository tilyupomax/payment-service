import { Payment, type PaymentSnapshot } from "../domain";
import type { PaymentEventStore } from "../database/payment-event-store.port";
import type { Clock } from "../../../shared/system";
import type { AppError } from "../../../shared/exceptions/errors";
import { createError } from "../../../shared/exceptions/errors";
import type { Result } from "../../../shared/utils/result.utils";
import { err, ok } from "../../../shared/utils/result.utils";
import type { UseCase } from "./types";

export type ProviderStatus = "customer_action" | "succeeded" | "failed";

export interface ProcessProviderCallbackCommand {
  paymentId: string;
  status: ProviderStatus;
  providerReference?: string;
  channel?: "web" | "mobile" | "widget";
  amountMinor?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface ProcessProviderCallbackResult {
  snapshot: PaymentSnapshot;
}

interface Dependencies {
  store: PaymentEventStore;
  clock: Clock;
}

export class ProcessProviderCallbackUseCase
  implements UseCase<ProcessProviderCallbackCommand, ProcessProviderCallbackResult>
{
  constructor(private readonly deps: Dependencies) {}

  async execute(command: ProcessProviderCallbackCommand): Promise<Result<ProcessProviderCallbackResult, AppError>> {
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

    const handlingResult = this.applyStatus(command, aggregate, now);
    if (!handlingResult.ok) {
      return handlingResult;
    }

    const newEvents = aggregate.pullEvents();
    if (newEvents.length === 0) {
      return err(createError("unexpected", "Webhook не изменил состояние платежа"));
    }

    const snapshot = aggregate.getSnapshot();

    const persistResult = await this.deps.store.append({
      paymentId: command.paymentId,
      events: newEvents,
      expectedVersion,
      snapshot
    });

    if (!persistResult.ok) {
      return persistResult;
    }

    return ok({ snapshot });
  }

  private applyStatus(
    command: ProcessProviderCallbackCommand,
    aggregate: Payment,
    now: Date
  ): Result<void, AppError> {
    switch (command.status) {
      case "customer_action": {
        const channel = command.channel ?? "web";
        return aggregate.registerCustomerAction(channel, now);
      }
      case "succeeded": {
        if (!command.providerReference) {
          return err(createError("validation", "Для успешного платежа требуется идентификатор провайдера"));
        }
        return aggregate.complete(command.providerReference, command.amountMinor ?? aggregate.getSnapshot().amountMinor, now);
      }
      case "failed": {
        const code = command.errorCode ?? "unknown";
        const reason = command.errorMessage ?? "Провайдер не уточнил причину";
        return aggregate.fail(reason, code, now);
      }
      default:
        return err(createError("validation", "Неизвестный статус провайдера", { status: command.status }));
    }
  }
}
