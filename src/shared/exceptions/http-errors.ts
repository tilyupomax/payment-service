import type { FastifyReply } from "fastify";
import type { AppError, ErrorKind } from "@/shared/exceptions/errors";
import { getRequestId } from "@/shared/app/app-request-context";

const errorStatusMap: Record<ErrorKind, number> = {
  validation: 400,
  "not-found": 404,
  conflict: 409,
  invariant: 422,
  infrastructure: 503,
  unexpected: 500
};

const resolveStatusCode = (kind: ErrorKind): number => errorStatusMap[kind] ?? 500;

export const replyWithAppError = (reply: FastifyReply, error: AppError) => {
  const statusCode = resolveStatusCode(error.kind);
  return reply.status(statusCode).send({
    statusCode,
    message: error.message,
    error: error.kind,
    details: error.details,
    correlationId: getRequestId()
  });
};

export const replyWithUnknownError = (reply: FastifyReply, error: unknown) => {
  reply.log.error({ err: error }, "Unhandled error during request processing");
  return reply.status(500).send({
    statusCode: 500,
    message: "Internal Server Error",
    error: "unexpected",
    correlationId: getRequestId()
  });
};
