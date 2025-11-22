import type { AppError, ErrorKind } from "../../../shared/exceptions/errors";
import { createError } from "../../../shared/exceptions/errors";
import type { Result } from "../../../shared/utils/result.utils";
import { err, ok } from "../../../shared/utils/result.utils";
import type {
  InitiatePaymentParams,
  PaymentDomainEvent,
  PaymentEventPayloadMap,
  PaymentSnapshot,
  RetryParams
} from "./payment-types";
import { PaymentEventType, PaymentState } from "./payment-types";

export class Payment {
  private readonly history: PaymentDomainEvent[] = [];
  private static readonly ISO_CURRENCY_REGEX = /^[A-Z]{3}$/;
  private constructor(private snapshot: PaymentSnapshot) {}

  static initiate(params: InitiatePaymentParams): Result<Payment, AppError> {
    const validationResult = Payment.validateInitiationParams(params);
    if (!validationResult.ok) {
      return validationResult;
    }

    const instance = new Payment(Payment.freshSnapshot(params.id));

    instance.recordEvent({
      type: PaymentEventType.PaymentInitiated,
      occurredAt: params.now,
      data: {
        paymentId: params.id,
        amountMinor: params.amountMinor,
        currency: params.currency,
        description: params.description ?? undefined,
        customerEmail: params.customerEmail ?? undefined,
        attempt: 1
      }
    });

    instance.recordCheckoutLinkPrepared(params.checkoutUrl, params.checkoutExpiresAt, params.now);

    return ok(instance);
  }

  static rehydrate(paymentId: string, events: PaymentDomainEvent[]): Result<Payment, AppError> {
    if (events.length === 0) {
      return err(createError("not-found", "Платёж не найден", { paymentId }));
    }

    const instance = new Payment(Payment.freshSnapshot(paymentId));
    for (const domainEvent of events) {
      instance.apply(domainEvent);
    }
    return ok(instance);
  }

  getSnapshot(): PaymentSnapshot {
    return { ...this.snapshot };
  }

  getVersion(): number {
    return this.snapshot.version;
  }

  pullEvents(): PaymentDomainEvent[] {
    return this.history.splice(0, this.history.length);
  }

  registerCustomerAction(
    channel: PaymentEventPayloadMap[PaymentEventType.CustomerActionRegistered]["channel"],
    occurredAt: Date
  ): Result<void, AppError> {
    const stateCheck = this.ensureState(
      [PaymentState.AwaitingCustomer],
      "invariant",
      "Отметить действие клиента можно только пока ссылка ещё активна"
    );
    if (!stateCheck.ok) {
      return stateCheck;
    }

    this.recordEvent({
      type: PaymentEventType.CustomerActionRegistered,
      occurredAt,
      data: {
        paymentId: this.snapshot.id,
        channel
      }
    });

    return ok(undefined);
  }

  complete(providerReference: string, amountMinor: number, occurredAt: Date): Result<void, AppError> {
    const stateCheck = this.ensureState(
      [PaymentState.Processing, PaymentState.AwaitingCustomer],
      "invariant",
      "Платёж нельзя подтвердить в текущем состоянии"
    );
    if (!stateCheck.ok) {
      return stateCheck;
    }

    this.recordEvent({
      type: PaymentEventType.PaymentCompleted,
      occurredAt,
      data: {
        paymentId: this.snapshot.id,
        providerReference,
        amountMinor
      }
    });

    return ok(undefined);
  }

  fail(reason: string, code: string, occurredAt: Date): Result<void, AppError> {
    if (this.snapshot.state === PaymentState.Succeeded) {
      return err(createError("conflict", "Нельзя пометить успешный платеж как неуспешный"));
    }

    this.recordEvent({
      type: PaymentEventType.PaymentFailed,
      occurredAt,
      data: {
        paymentId: this.snapshot.id,
        reason,
        code
      }
    });

    return ok(undefined);
  }

  requestRetry(params: RetryParams): Result<void, AppError> {
    const stateCheck = this.ensureState(
      [PaymentState.Failed],
      "invariant",
      "Повторная попытка доступна только после ошибки"
    );
    if (!stateCheck.ok) {
      return stateCheck;
    }

    const expiryCheck = Payment.ensureFutureCheckout(params.checkoutExpiresAt, params.now);
    if (!expiryCheck.ok) {
      return expiryCheck;
    }

    const nextAttempt = this.snapshot.attempt + 1;

    this.recordEvent({
      type: PaymentEventType.RetryRequested,
      occurredAt: params.now,
      data: {
        paymentId: this.snapshot.id,
        attempt: nextAttempt
      }
    });

    this.recordCheckoutLinkPrepared(params.checkoutUrl, params.checkoutExpiresAt, params.now);

    return ok(undefined);
  }

  private recordEvent(event: PaymentDomainEvent): void {
    this.apply(event);
    this.history.push(event);
  }

  private apply(event: PaymentDomainEvent): void {
    const { snapshot } = this;

    switch (event.type) {
      case PaymentEventType.PaymentInitiated: {
        const data = this.getPayload(event, PaymentEventType.PaymentInitiated);
        snapshot.amountMinor = data.amountMinor;
        snapshot.currency = data.currency;
        snapshot.description = data.description ?? null;
        snapshot.customerEmail = data.customerEmail ?? null;
        snapshot.attempt = data.attempt;
        snapshot.state = PaymentState.AwaitingCustomer;
        snapshot.createdAt = event.occurredAt;
        snapshot.updatedAt = event.occurredAt;
        break;
      }
      case PaymentEventType.CheckoutLinkPrepared: {
        const data = this.getPayload(event, PaymentEventType.CheckoutLinkPrepared);
        snapshot.checkoutUrl = data.checkoutUrl;
        snapshot.checkoutExpiresAt = new Date(data.expiresAt);
        snapshot.state = PaymentState.AwaitingCustomer;
        snapshot.updatedAt = event.occurredAt;
        break;
      }
      case PaymentEventType.CustomerActionRegistered: {
        snapshot.state = PaymentState.Processing;
        snapshot.updatedAt = event.occurredAt;
        break;
      }
      case PaymentEventType.PaymentCompleted: {
        const data = this.getPayload(event, PaymentEventType.PaymentCompleted);
        snapshot.state = PaymentState.Succeeded;
        snapshot.providerReference = data.providerReference;
        snapshot.updatedAt = event.occurredAt;
        snapshot.lastError = null;
        break;
      }
      case PaymentEventType.PaymentFailed: {
        const data = this.getPayload(event, PaymentEventType.PaymentFailed);
        snapshot.state = PaymentState.Failed;
        snapshot.lastError = `${data.code}: ${data.reason}`;
        snapshot.updatedAt = event.occurredAt;
        break;
      }
      case PaymentEventType.RetryRequested: {
        const data = this.getPayload(event, PaymentEventType.RetryRequested);
        snapshot.attempt = data.attempt;
        snapshot.state = PaymentState.AwaitingCustomer;
        snapshot.lastError = null;
        snapshot.updatedAt = event.occurredAt;
        break;
      }
    }

    snapshot.version += 1;
  }

  private static freshSnapshot(id: string): PaymentSnapshot {
    return {
      id,
      amountMinor: 0,
      currency: "",
      attempt: 0,
      state: PaymentState.New,
      version: 0,
      checkoutExpiresAt: null,
      providerReference: null,
      lastError: null,
      description: null,
      customerEmail: null
    };
  }

  private static validateInitiationParams(params: InitiatePaymentParams): Result<void, AppError> {
    if (params.amountMinor <= 0) {
      return err(createError("validation", "Сумма платежа должна быть положительной"));
    }

    if (!Payment.ISO_CURRENCY_REGEX.test(params.currency)) {
      return err(createError("validation", "Валюта должна быть в формате ISO 4217", { currency: params.currency }));
    }

    return Payment.ensureFutureCheckout(params.checkoutExpiresAt, params.now);
  }

  private static ensureFutureCheckout(expiresAt: Date, now: Date): Result<void, AppError> {
    if (expiresAt.getTime() <= now.getTime()) {
      return err(createError("validation", "Время истечения ссылки должно быть в будущем"));
    }

    return ok(undefined);
  }

  private ensureState(
    allowedStates: PaymentState[],
    errorKind: ErrorKind,
    message: string,
    extraDetails: Record<string, unknown> = {}
  ): Result<void, AppError> {
    if (!allowedStates.includes(this.snapshot.state)) {
      return err(createError(errorKind, message, { state: this.snapshot.state, ...extraDetails }));
    }

    return ok(undefined);
  }

  private recordCheckoutLinkPrepared(checkoutUrl: string, checkoutExpiresAt: Date, occurredAt: Date): void {
    this.recordEvent({
      type: PaymentEventType.CheckoutLinkPrepared,
      occurredAt,
      data: {
        paymentId: this.snapshot.id,
        checkoutUrl,
        expiresAt: checkoutExpiresAt.toISOString()
      }
    });
  }

  private getPayload<TType extends PaymentEventType>(
    event: PaymentDomainEvent,
    type: TType
  ): PaymentEventPayloadMap[TType] {
    if (event.type !== type) {
      throw new Error(`Unexpected event type ${event.type}, expected ${type}`);
    }

    return event.data as PaymentEventPayloadMap[TType];
  }
}

