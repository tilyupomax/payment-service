import { describe, expect, it, vi } from "vitest";
import {
  CreatePaymentUseCase,
  ProcessProviderCallbackUseCase,
  RetryPaymentUseCase,
  type CreatePaymentCommand,
  type ProcessProviderCallbackCommand,
  type RetryPaymentCommand,
  type PaymentDomainEvent,
  type PaymentEventStore,
  PaymentState,
  PaymentEventType
} from "./index";
import type { CheckoutLinkProvider, Clock, IdGenerator } from "../../shared/system";
import { createError } from "../../shared/exceptions/errors";
import { err, ok } from "../../shared/utils/result.utils";

const buildEnvironment = (paymentId: string) => {
  let current = new Date("2024-05-05T10:00:00.000Z").getTime();
  const clock: Clock & { advance(ms: number): void } = {
    now: vi.fn(() => new Date(current)),
    advance(ms: number) {
      current += ms;
    }
  };

  const events: PaymentDomainEvent[] = [];
  const appendImpl: PaymentEventStore["append"] = async (batch) => {
    events.push(...batch.events);
    return ok(undefined);
  };
  const loadImpl: PaymentEventStore["load"] = async () => {
    if (events.length === 0) {
      return err(createError("not-found", "История не найдена", { paymentId }));
    }
    return ok([...events]);
  };
  const listHistoryImpl: PaymentEventStore["listHistory"] = async () => ok([...events]);
  const store: PaymentEventStore = {
    append: vi.fn(appendImpl),
    load: vi.fn(loadImpl),
    listHistory: vi.fn(listHistoryImpl)
  };
  const idGenerator: IdGenerator = () => paymentId;
  const checkoutLinkProvider: CheckoutLinkProvider = {
    issue: ({ paymentId: pid, attempt, issuedAt }) => ({
      url: `https://checkout.local/pay/${pid}?attempt=${attempt}`,
      expiresAt: new Date(issuedAt.getTime() + 15 * 60 * 1000)
    })
  };

  return {
    store,
    clock,
    createPayment: new CreatePaymentUseCase({
      store,
      clock,
      idGenerator,
      checkoutLinks: checkoutLinkProvider
    }),
    webhook: new ProcessProviderCallbackUseCase({ store, clock }),
    retryPayment: new RetryPaymentUseCase({ store, clock, checkoutLinks: checkoutLinkProvider }),
    paymentId
  };
};

describe("Бизнес-сценарии платежей", () => {
  it("создаёт платёж и записывает историю", async () => {
    const env = buildEnvironment("payment-create-test");
    const command: CreatePaymentCommand = {
      amountMinor: 5_000,
      currency: "RUB",
      description: "Оплата заказа",
      customerEmail: "merchant@example.com"
    };

    const creationResult = await env.createPayment.execute(command);

    expect(creationResult.ok).toBe(true);
    if (!creationResult.ok) {
      return;
    }

    expect(creationResult.value.snapshot.state).toBe(PaymentState.AwaitingCustomer);

    const history = await env.store.listHistory(env.paymentId);
    expect(history.ok).toBe(true);
    if (history.ok) {
      expect(history.value.length).toBeGreaterThan(0);
      const [first] = history.value;
      expect(first?.type).toBe("payment.initiated");
    }
  });

  it("фиксирует успешный webhook и закрывает платёж", async () => {
    const env = buildEnvironment("payment-webhook-test");
    await env.createPayment.execute({ amountMinor: 7_500, currency: "USD" });

    const result = await env.webhook.execute({
      paymentId: env.paymentId,
      status: "succeeded",
      providerReference: "ext-42",
      amountMinor: 7_500
    } satisfies ProcessProviderCallbackCommand);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.snapshot.state).toBe(PaymentState.Succeeded);
    const history = await env.store.listHistory(env.paymentId);
    if (history.ok) {
      expect(history.value.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("разрешает ретрай после ошибки провайдера", async () => {
    const env = buildEnvironment("payment-retry-test");
    await env.createPayment.execute({
      amountMinor: 12_500,
      currency: "EUR",
      description: "Первый заказ"
    });

    env.clock.advance(500);
    await env.webhook.execute({
      paymentId: env.paymentId,
      status: "customer_action",
      channel: "mobile"
    });

    env.clock.advance(500);
    const failureResult = await env.webhook.execute({
      paymentId: env.paymentId,
      status: "failed",
      errorCode: "card_declined",
      errorMessage: "Карта отклонена"
    } satisfies ProcessProviderCallbackCommand);

    expect(failureResult.ok).toBe(true);
    if (!failureResult.ok) {
      return;
    }

    expect(failureResult.value.snapshot.state).toBe(PaymentState.Failed);
    expect(failureResult.value.snapshot.lastError).toContain("card_declined");

    env.clock.advance(500);
    const retryResult = await env.retryPayment.execute({
      paymentId: env.paymentId
    } satisfies RetryPaymentCommand);

    expect(retryResult.ok).toBe(true);
    if (!retryResult.ok) {
      return;
    }

    expect(retryResult.value.snapshot.state).toBe(PaymentState.AwaitingCustomer);
    expect(retryResult.value.snapshot.attempt).toBe(2);
    expect(retryResult.value.snapshot.lastError).toBeNull();

    const history = await env.store.listHistory(env.paymentId);
    expect(history.ok).toBe(true);
    if (history.ok) {
      const types = history.value.map((event) => event.type);
      expect(types.filter((type) => type === PaymentEventType.PaymentFailed).length).toBe(1);
      expect(types).toContain(PaymentEventType.RetryRequested);
    }
  });
});
