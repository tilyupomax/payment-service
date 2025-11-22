import { describe, expect, it } from "vitest";
import { ConfigCheckoutLinkProvider } from "./checkout-link.provider";
import type { Clock } from "./ports";

const buildProvider = (now: Date) => {
  const clock: Clock = {
    now: () => now
  };

  return new ConfigCheckoutLinkProvider({
    clock,
    baseUrl: "https://checkout.test/",
    linkTtlMinutes: 15
  });
};

describe("ConfigCheckoutLinkProvider", () => {
  it("issues deterministic checkout links with TTL", () => {
    const issuedAt = new Date("2024-02-02T10:00:00.000Z");
    const provider = buildProvider(issuedAt);

    const link = provider.issue({ paymentId: "pay-42", attempt: 3, issuedAt });

    expect(link.url).toBe("https://checkout.test/pay/pay-42?attempt=3");
    expect(link.expiresAt.toISOString()).toBe("2024-02-02T10:15:00.000Z");
  });
});
