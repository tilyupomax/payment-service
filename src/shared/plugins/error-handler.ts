import fp from "fastify-plugin";
import { replyWithUnknownError } from "@/shared/exceptions/http-errors";

export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler((error, _request, reply) => replyWithUnknownError(reply, error));
});
