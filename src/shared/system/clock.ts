import type { Clock } from "./ports";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
