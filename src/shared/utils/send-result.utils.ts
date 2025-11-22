import type { FastifyReply } from "fastify";
import type { Result } from "@/shared/utils/result.utils";
import type { AppError } from "@/shared/exceptions/errors";
import { replyWithAppError } from "@/shared/exceptions/http-errors";

export const sendResult = <T>(reply: FastifyReply, result: Result<T, AppError>, successStatus = 200) => {
  if (!result.ok) {
    return replyWithAppError(reply, result.error);
  }

  if (successStatus !== 200) {
    return reply.status(successStatus).send(result.value);
  }

  return reply.send(result.value);
};
