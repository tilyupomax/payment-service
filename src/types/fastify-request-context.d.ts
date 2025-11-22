declare module "@fastify/request-context" {
  import type { FastifyPluginCallback } from "fastify";

  interface RequestContextData {
    requestId?: string;
    [key: string]: unknown;
  }

  interface RequestContext {
    get<T = unknown>(key: string): T | undefined;
    set<T = unknown>(key: string, value: T): void;
  }

  export const requestContext: RequestContext;
  export const fastifyRequestContext: FastifyPluginCallback;
  export type { RequestContextData };
  export default fastifyRequestContext;
}
