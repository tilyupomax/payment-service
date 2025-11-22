import { requestContext } from "@fastify/request-context";

export const getRequestId = (): string => requestContext.get("requestId") ?? "unknown-request";
