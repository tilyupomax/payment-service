import type { FastifyPluginAsync } from "fastify";
import { type ZodTypeProvider } from "fastify-type-provider-zod";
import {
  createPaymentBodySchema,
  paymentIdParamsSchema,
  webhookBodySchema
} from "./schema";
import {
  createPaymentHandler,
  paymentHistoryHandler,
  processWebhookHandler,
  retryPaymentHandler
} from "./handlers";
import { ensurePaymentRequestScope } from "./scope";

export const paymentRoutesPlugin: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.addHook("onRequest", async (request) => {
    ensurePaymentRequestScope(request.diScope);
  });

  server.post(
    "/payments",
    {
      schema: {
        body: createPaymentBodySchema
      }
    },
    createPaymentHandler
  );

  server.post(
    "/payment/webhook",
    {
      schema: {
        body: webhookBodySchema
      }
    },
    processWebhookHandler
  );

  server.post(
    "/payments/:paymentId/retry",
    {
      schema: {
        params: paymentIdParamsSchema
      }
    },
    retryPaymentHandler
  );

  server.get(
    "/payments/:paymentId/history",
    {
      schema: {
        params: paymentIdParamsSchema
      }
    },
    paymentHistoryHandler
  );
};

export const registerPaymentRoutes = paymentRoutesPlugin;
