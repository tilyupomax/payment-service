export enum PaymentState {
  New = "new",
  AwaitingCustomer = "awaiting_customer",
  Processing = "processing",
  Succeeded = "succeeded",
  Failed = "failed"
}

export enum PaymentEventType {
  PaymentInitiated = "payment.initiated",
  CheckoutLinkPrepared = "payment.checkout_link_prepared",
  CustomerActionRegistered = "payment.customer_action_registered",
  PaymentCompleted = "payment.completed",
  PaymentFailed = "payment.failed",
  RetryRequested = "payment.retry_requested"
}

export type PaymentEventPayloadMap = {
  [PaymentEventType.PaymentInitiated]: {
    paymentId: string;
    amountMinor: number;
    currency: string;
    description?: string;
    customerEmail?: string;
    attempt: number;
  };
  [PaymentEventType.CheckoutLinkPrepared]: {
    paymentId: string;
    checkoutUrl: string;
    expiresAt: string;
  };
  [PaymentEventType.CustomerActionRegistered]: {
    paymentId: string;
    channel: "web" | "mobile" | "widget";
  };
  [PaymentEventType.PaymentCompleted]: {
    paymentId: string;
    providerReference: string;
    amountMinor: number;
  };
  [PaymentEventType.PaymentFailed]: {
    paymentId: string;
    reason: string;
    code: string;
  };
  [PaymentEventType.RetryRequested]: {
    paymentId: string;
    attempt: number;
  };
};

export type PaymentDomainEvent<TType extends PaymentEventType = PaymentEventType> = {
  type: TType;
  occurredAt: Date;
  data: PaymentEventPayloadMap[TType];
};

export interface PaymentSnapshot {
  id: string;
  amountMinor: number;
  currency: string;
  description?: string | null;
  customerEmail?: string | null;
  attempt: number;
  state: PaymentState;
  checkoutUrl?: string;
  checkoutExpiresAt?: Date | null;
  providerReference?: string | null;
  lastError?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  version: number;
}

export interface PaymentHistoryPortion {
  events: PaymentDomainEvent[];
}

export interface InitiatePaymentParams {
  id: string;
  amountMinor: number;
  currency: string;
  description?: string | null;
  customerEmail?: string | null;
  checkoutUrl: string;
  checkoutExpiresAt: Date;
  now: Date;
}

export interface RetryParams {
  checkoutUrl: string;
  checkoutExpiresAt: Date;
  now: Date;
}
