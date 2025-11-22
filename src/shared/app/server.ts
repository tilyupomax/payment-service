import Fastify from "fastify";
import { type FastifyServerOptions } from "fastify";
import { type ZodTypeProvider } from "fastify-type-provider-zod";
import { corePlugin } from "../plugins/core";
import { routesPlugin } from "../plugins/routes";
import { randomUUID } from "crypto";

type BuildServerOptions = Pick<FastifyServerOptions, "logger">;

export const buildServer = (options: BuildServerOptions = {}) => {
  const app = Fastify({
    logger: options.logger ?? false,
    genReqId(req) {
      return (req.headers["request-id"] as string) ?? randomUUID();
    }
  }).withTypeProvider<ZodTypeProvider>();

  app.register(corePlugin);
  app.register(routesPlugin);

  return app;
};
