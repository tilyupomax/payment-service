import type { FastifyReply, FastifyRequest } from "fastify";
import { replyWithAppError } from "@/shared/exceptions/http-errors";
import { sendResult } from "@/shared/utils/send-result.utils";
import {
  buildCreatePaymentCommand,
  buildWebhookCommand,
  formatHistory
} from "./utils";
import type { CreatePaymentBody, PaymentIdParams, WebhookBody } from "./schema";

const resolveCradle = (request: FastifyRequest) => request.diScope.cradle;

export const createPaymentHandler = async (
  request: FastifyRequest<{ Body: CreatePaymentBody }>,
  reply: FastifyReply
) => {
  const result = await resolveCradle(request).createPayment.execute(
    buildCreatePaymentCommand(request.body)
  );

  return sendResult(reply, result, 201);
};
export const processWebhookHandler = async (
  request: FastifyRequest<{ Body: WebhookBody }>,
  reply: FastifyReply
) => {
  const result = await resolveCradle(request).processWebhook.execute(
    buildWebhookCommand(request.body)
  );

  return sendResult(reply, result, 202);
};

export const retryPaymentHandler = async (
  request: FastifyRequest<{ Params: PaymentIdParams }>,
  reply: FastifyReply
) => {
  const result = await resolveCradle(request).retryPayment.execute({
    paymentId: request.params.paymentId
  });

  return sendResult(reply, result, 202);
};

export const paymentHistoryHandler = async (
  request: FastifyRequest<{ Params: PaymentIdParams }>,
  reply: FastifyReply
) => {
  const historyResult = await resolveCradle(request).store.listHistory(request.params.paymentId);

  if (!historyResult.ok) {
    return replyWithAppError(reply, historyResult.error);
  }

  return reply.send(formatHistory(request.params.paymentId, historyResult.value));
};
