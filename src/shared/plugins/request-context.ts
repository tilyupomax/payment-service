import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { fastifyRequestContext, requestContext } from "@fastify/request-context";

export const requestContextPlugin: FastifyPluginAsync = fp(async (app) => {
  await app.register(fastifyRequestContext);
  app.addHook("onRequest", async (request) => {
    requestContext.set("requestId", String(request.id));
  });
});
