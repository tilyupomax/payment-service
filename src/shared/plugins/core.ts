import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { validationPlugin } from "./validation";
import { helmetPlugin } from "./helmet";
import { corsPlugin } from "./cors";
import { compressPlugin } from "./compress";
import { rateLimitPlugin } from "./rate-limit";
import { sensiblePlugin } from "./sensible";
import { dependencyInjectionPlugin } from "./di";
import { errorHandlerPlugin } from "./error-handler";
import { requestContextPlugin } from "./request-context";

export const corePlugin: FastifyPluginAsync = fp(async (app) => {
  await app.register(requestContextPlugin);
  await app.register(validationPlugin);
  await app.register(helmetPlugin);
  await app.register(corsPlugin);
  await app.register(compressPlugin);
  await app.register(rateLimitPlugin);
  await app.register(sensiblePlugin);
  await app.register(dependencyInjectionPlugin);
  await app.register(errorHandlerPlugin);
});
