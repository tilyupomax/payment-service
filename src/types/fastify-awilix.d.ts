import type { AwilixContainer } from "awilix";
import type { DatabaseClient } from "../shared/db/connection";
import type {
  CreatePaymentUseCase,
  ProcessProviderCallbackUseCase,
  RetryPaymentUseCase,
  type PaymentEventStore
} from "../modules/payment";
import type { Clock, CheckoutLinkProvider, IdGenerator } from "../shared/system";
import type { AppConfig } from "../config/env";

declare module "@fastify/awilix" {
  interface Cradle {
    config: AppConfig;
    db: DatabaseClient;
    store: PaymentEventStore;
    clock: Clock;
    idGenerator: IdGenerator;
    checkoutLinkProvider: CheckoutLinkProvider;
  }

  interface RequestCradle {
    createPayment: CreatePaymentUseCase;
    processWebhook: ProcessProviderCallbackUseCase;
    retryPayment: RetryPaymentUseCase;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    diScope: AwilixContainer<import("@fastify/awilix").Cradle & import("@fastify/awilix").RequestCradle>;
  }
}
