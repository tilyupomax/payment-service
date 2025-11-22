import type { Cradle, RequestCradle } from "@fastify/awilix";
import { asFunction, type AwilixContainer } from "awilix";
import {
  CreatePaymentUseCase,
  ProcessProviderCallbackUseCase,
  RetryPaymentUseCase
} from "@/modules/payment";

export const ensurePaymentRequestScope = (scope: AwilixContainer<Cradle & RequestCradle>) => {
  if (scope.hasRegistration("createPayment")) {
    return;
  }

  scope.register({
    createPayment: asFunction(
      ({ store, clock, idGenerator, checkoutLinkProvider }: Cradle) =>
        new CreatePaymentUseCase({
          store,
          clock,
          idGenerator,
          checkoutLinks: checkoutLinkProvider
        })
    ).scoped(),
    processWebhook: asFunction(({ store, clock }: Cradle) =>
      new ProcessProviderCallbackUseCase({
        store,
        clock
      })
    ).scoped(),
    retryPayment: asFunction(({ store, clock, checkoutLinkProvider }: Cradle) =>
      new RetryPaymentUseCase({
        store,
        clock,
        checkoutLinks: checkoutLinkProvider
      })
    ).scoped()
  });
};
