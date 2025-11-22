import { describe, expect, it } from "vitest";
import { Payment } from "./payment";
import { PaymentEventType, PaymentState, type InitiatePaymentParams } from "./payment-types";

const BASE_NOW = new Date("2024-01-01T12:00:00.000Z");

const createInitiationParams = (overrides: Partial<InitiatePaymentParams> = {}): InitiatePaymentParams => ({
  id: "pay-test",
  amountMinor: 25_00,
  currency: "USD",
  description: "Test order",
  customerEmail: "buyer@example.com",
  checkoutUrl: "https://checkout.test/session/pay-test",
  checkoutExpiresAt: new Date(BASE_NOW.getTime() + 5 * 60 * 1000),
  now: BASE_NOW,
  ...overrides
});

const createInitiatedPayment = (overrides: Partial<InitiatePaymentParams> = {}) => {
  const result = Payment.initiate(createInitiationParams(overrides));
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
};

describe("Payment domain", () => {

  it("rejects initiation when currency is not ISO 4217", () => {
    const result = Payment.initiate(createInitiationParams({ currency: "rub" }));

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.kind).toBe("validation");
    expect(result.error.message).toContain("Валюта");
  });

  it("moves to succeeded after customer action and completion", () => {
    const payment = createInitiatedPayment();

    const actionTime = new Date(BASE_NOW.getTime() + 1_000);
    const completionTime = new Date(BASE_NOW.getTime() + 2_000);

    const actionResult = payment.registerCustomerAction("web", actionTime);
    expect(actionResult.ok).toBe(true);
    if (!actionResult.ok) {
      throw new Error(actionResult.error.message);
    }

    const completionResult = payment.complete("prov-42", payment.getSnapshot().amountMinor, completionTime);
    expect(completionResult.ok).toBe(true);
    if (!completionResult.ok) {
      throw new Error(completionResult.error.message);
    }

    const snapshot = payment.getSnapshot();
    expect(snapshot.state).toBe(PaymentState.Succeeded);
    expect(snapshot.providerReference).toBe("prov-42");
    expect(snapshot.lastError).toBeNull();
    expect(snapshot.updatedAt).toEqual(completionTime);

    const eventTypes = payment.pullEvents().map((event) => event.type);
    expect(eventTypes).toContain(PaymentEventType.PaymentCompleted);
    expect(eventTypes.filter((type) => type === PaymentEventType.PaymentInitiated).length).toBe(1);
  });

  it("allows retry after failure and prepares a fresh checkout link", () => {
    const payment = createInitiatedPayment();

    const failureTime = new Date(BASE_NOW.getTime() + 1_000);
    const retryTime = new Date(BASE_NOW.getTime() + 2_000);
    const nextExpiry = new Date(BASE_NOW.getTime() + 30 * 60 * 1000);

    const failureResult = payment.fail("Card declined", "card_declined", failureTime);
    expect(failureResult.ok).toBe(true);
    if (!failureResult.ok) {
      throw new Error(failureResult.error.message);
    }

    const retryResult = payment.requestRetry({
      checkoutUrl: "https://checkout.test/session/pay-test/attempt-2",
      checkoutExpiresAt: nextExpiry,
      now: retryTime
    });
    expect(retryResult.ok).toBe(true);
    if (!retryResult.ok) {
      throw new Error(retryResult.error.message);
    }

    const snapshot = payment.getSnapshot();
    expect(snapshot.state).toBe(PaymentState.AwaitingCustomer);
    expect(snapshot.attempt).toBe(2);
    expect(snapshot.lastError).toBeNull();
    expect(snapshot.checkoutExpiresAt).toEqual(nextExpiry);

    const eventTypes = payment.pullEvents().map((event) => event.type);
    expect(eventTypes.slice(-3)).toEqual([
      PaymentEventType.PaymentFailed,
      PaymentEventType.RetryRequested,
      PaymentEventType.CheckoutLinkPrepared
    ]);
  });

  it("rejects retry requests when the new checkout link is already expired", () => {
    const payment = createInitiatedPayment();
    const failureResult = payment.fail("Insufficient funds", "card_declined", new Date(BASE_NOW.getTime() + 500));
    expect(failureResult.ok).toBe(true);
    if (!failureResult.ok) {
      throw new Error(failureResult.error.message);
    }

    const retryResult = payment.requestRetry({
      checkoutUrl: "https://checkout.test/session/pay-test/attempt-2",
      checkoutExpiresAt: new Date(BASE_NOW.getTime() - 1_000),
      now: new Date(BASE_NOW.getTime())
    });

    expect(retryResult.ok).toBe(false);
    if (retryResult.ok) {
      return;
    }

    expect(retryResult.error.kind).toBe("validation");
    expect(retryResult.error.message).toContain("Время истечения");
  });

  it("does not allow failing a succeeded payment", () => {
    const payment = createInitiatedPayment();
    const completionResult = payment.complete("prov-84", payment.getSnapshot().amountMinor, new Date(BASE_NOW.getTime() + 1_000));
    expect(completionResult.ok).toBe(true);
    if (!completionResult.ok) {
      throw new Error(completionResult.error.message);
    }

    const failureResult = payment.fail("should not happen", "unexpected", new Date(BASE_NOW.getTime() + 2_000));
    expect(failureResult.ok).toBe(false);
    if (failureResult.ok) {
      return;
    }

    expect(failureResult.error.kind).toBe("conflict");
    expect(failureResult.error.message).toContain("Нельзя пометить успешный платеж");
  });
});
