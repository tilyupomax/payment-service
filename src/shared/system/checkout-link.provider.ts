import type { CheckoutLinkProvider, Clock } from "./ports";

interface CheckoutLinkProviderOptions {
  baseUrl: string;
  linkTtlMinutes: number;
}

export class ConfigCheckoutLinkProvider implements CheckoutLinkProvider {
  private readonly ttlMs: number;

  constructor(private readonly deps: { clock: Clock } & CheckoutLinkProviderOptions) {
    this.ttlMs = deps.linkTtlMinutes * 60 * 1000;
  }

  issue(input: { paymentId: string; attempt: number; issuedAt: Date }) {
    const expiresAt = new Date(input.issuedAt.getTime() + this.ttlMs);
    const url = new URL(`/pay/${input.paymentId}`, this.deps.baseUrl);
    url.searchParams.set("attempt", input.attempt.toString());

    return { url: url.toString(), expiresAt };
  }
}
