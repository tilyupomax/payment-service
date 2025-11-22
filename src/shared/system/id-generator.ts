import { randomUUID } from "node:crypto";
import type { IdGenerator } from "./ports";

export const uuidGenerator: IdGenerator = () => randomUUID();
