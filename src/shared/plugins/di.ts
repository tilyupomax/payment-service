import fp from "fastify-plugin";
import { fastifyAwilixPlugin } from "@fastify/awilix";

export const dependencyInjectionPlugin = fp(async (app) => {
  await app.register(fastifyAwilixPlugin, {
    disposeOnClose: true,
    disposeOnResponse: true
  });
});
