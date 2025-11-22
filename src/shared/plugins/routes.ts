import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { paymentRoutesPlugin } from "@/modules/payment/routes/payments";

export const routesPlugin: FastifyPluginAsync = fp(async (app) => {
  await app.register(paymentRoutesPlugin);
});
