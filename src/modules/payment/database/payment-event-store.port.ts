import type { PaymentDomainEvent, PaymentSnapshot } from "../domain";
import type { AppError } from "../../../shared/exceptions/errors";
import type { Result } from "../../../shared/utils/result.utils";

export interface PaymentEventStore {
  append(batch: {
    paymentId: string;
    events: PaymentDomainEvent[];
    expectedVersion: number;
    snapshot: PaymentSnapshot;
  }): Promise<Result<void, AppError>>;

  load(paymentId: string): Promise<Result<PaymentDomainEvent[], AppError>>;

  listHistory(paymentId: string): Promise<Result<PaymentDomainEvent[], AppError>>;
}
