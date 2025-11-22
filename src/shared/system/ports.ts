export interface Clock {
  now(): Date;
}

export type IdGenerator = () => string;

export interface CheckoutLinkProvider {
  issue(input: { paymentId: string; attempt: number; issuedAt: Date }): { url: string; expiresAt: Date };
}
