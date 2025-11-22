import fp from "fastify-plugin";
import compress from "@fastify/compress";

export const compressPlugin = fp(async (app) => {
  await app.register(compress, {
    global: true
  });
});
