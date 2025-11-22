import { z } from "zod";

const RawEnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().min(1).default("0.0.0.0"),
  DB_FILE: z.string().min(1).default("./sqlite/data.db"),
  CHECKOUT_BASE_URL: z.string().url().default("https://pay.local/"),
  CHECKOUT_LINK_TTL_MINUTES: z.coerce.number().int().positive().max(120).default(15)
});

export type RawEnv = z.infer<typeof RawEnvSchema>;

export type AppConfig = {
  env: RawEnv["NODE_ENV"];
  server: {
    port: number;
    host: string;
  };
  database: {
    file: string;
  };
  checkout: {
    baseUrl: string;
    linkTtlMinutes: number;
  };
};

let cachedConfig: AppConfig | null = null;

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => {
  if (env === process.env && cachedConfig) {
    return cachedConfig;
  }

  const parsed = RawEnvSchema.parse(env);

  const config: AppConfig = {
    env: parsed.NODE_ENV,
    server: {
      port: parsed.PORT,
      host: parsed.HOST
    },
    database: {
      file: parsed.DB_FILE
    },
    checkout: {
      baseUrl: parsed.CHECKOUT_BASE_URL,
      linkTtlMinutes: parsed.CHECKOUT_LINK_TTL_MINUTES
    }
  };

  if (env === process.env) {
    cachedConfig = config;
  }

  return config;
};
