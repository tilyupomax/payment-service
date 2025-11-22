import { asFunction, asValue } from "awilix";
import { diContainer, type Cradle } from "@fastify/awilix";
import { buildServer } from "./shared/app/server";
import { createDatabase } from "./shared/db/connection";
import { SqlitePaymentEventStoreRepository } from "./modules/payment";
import { ConfigCheckoutLinkProvider, SystemClock, uuidGenerator } from "./shared/system";
import { loadConfig } from "./config/env";

const config = loadConfig();

diContainer.register({
  config: asValue(config),
  db: asFunction(() => createDatabase(config.database.file)).singleton(),
  store: asFunction(({ db }: Pick<Cradle, "db">) => new SqlitePaymentEventStoreRepository(db)).singleton(),
  clock: asFunction(() => new SystemClock()).singleton(),
  idGenerator: asValue(uuidGenerator),
  checkoutLinkProvider: asFunction(({ clock, config }: Pick<Cradle, "clock" | "config">) =>
    new ConfigCheckoutLinkProvider({
      clock,
      baseUrl: config.checkout.baseUrl,
      linkTtlMinutes: config.checkout.linkTtlMinutes
    })
  ).singleton()
});

const server = buildServer({
  logger: config.env !== "test"
});

const start = async () => {
  try {
    const address = await server.listen({
      port: config.server.port,
      host: config.server.host
    });
    server.log.info({ address }, "HTTP server started");
  } catch (error) {
    server.log.error({ err: error }, "Failed to start HTTP server");
    process.exit(1);
  }
};

const registerGracefulShutdown = (signals: readonly NodeJS.Signals[]) => {
  let closing: Promise<void> | null = null;

  const handleShutdown = async (signal: NodeJS.Signals) => {
    if (closing) {
      server.log.info({ signal }, "Shutdown already requested");
      return closing;
    }

    server.log.info({ signal }, "Received shutdown signal");
    closing = server.close();

    try {
      await closing;
      server.log.info("HTTP server closed gracefully");
      process.exit(0);
    } catch (error) {
      server.log.error({ err: error }, "Error while shutting down HTTP server");
      process.exit(1);
    }
  };

  for (const signal of signals) {
    process.once(signal, () => {
      void handleShutdown(signal);
    });
  }
};

registerGracefulShutdown(["SIGINT", "SIGTERM"]);

void start();
