import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../../../shared/db/schema";
import type { PaymentDomainEvent, PaymentSnapshot } from "../domain";
import type { PaymentEventStore } from "./payment-event-store.port";
import type { AppError } from "../../../shared/exceptions/errors";
import { createError } from "../../../shared/exceptions/errors";
import { err, ok, type Result } from "../../../shared/utils/result.utils";

const { paymentEvents, payments } = schema;

type SQLiteDb = BetterSQLite3Database<typeof schema>;

export class SqlitePaymentEventStoreRepository implements PaymentEventStore {
  constructor(private readonly db: SQLiteDb) {}

  async append(params: {
    paymentId: string;
    events: PaymentDomainEvent[];
    expectedVersion: number;
    snapshot: PaymentSnapshot;
  }): Promise<Result<void, AppError>> {
    if (params.events.length === 0) {
      return ok(undefined);
    }

    const currentRow = this.db
      .select()
      .from(payments)
      .where(eq(payments.id, params.paymentId))
      .get();

    const currentVersion = currentRow?.version ?? 0;
    if (currentVersion !== params.expectedVersion) {
      return err(
        createError("conflict", "Версия платежа устарела", {
          paymentId: params.paymentId,
          expectedVersion: params.expectedVersion,
          actualVersion: currentVersion
        })
      );
    }

    this.db.transaction((tx) => {
      let version = params.expectedVersion;
      for (const event of params.events) {
        version += 1;
        tx.insert(paymentEvents)
          .values({
            id: randomUUID(),
            paymentId: params.paymentId,
            type: event.type,
            payload: JSON.stringify(event.data),
            occurredAt: event.occurredAt.toISOString(),
            version
          })
          .run();
      }

      const serialized = serializeSnapshot(params.snapshot);
      if (currentRow) {
        tx.update(payments)
          .set(serialized)
          .where(eq(payments.id, params.paymentId))
          .run();
      } else {
        tx.insert(payments)
          .values({ ...serialized, id: params.paymentId })
          .run();
      }
    });

    return ok(undefined);
  }

  async load(paymentId: string): Promise<Result<PaymentDomainEvent[], AppError>> {
    const result = await this.listHistory(paymentId);

    if (!result.ok) {
      return result;
    }

    if (result.value.length === 0) {
      return err(createError("not-found", "История платежа не найдена", { paymentId }));
    }

    return result;
  }

  async listHistory(paymentId: string): Promise<Result<PaymentDomainEvent[], AppError>> {
    const rows = this.db
      .select()
      .from(paymentEvents)
      .where(eq(paymentEvents.paymentId, paymentId))
      .orderBy(asc(paymentEvents.version))
      .all();

    const events = rows.map<PaymentDomainEvent>((row) => ({
      type: row.type as PaymentDomainEvent["type"],
      occurredAt: new Date(row.occurredAt),
      data: JSON.parse(row.payload) as PaymentDomainEvent["data"]
    }));

    return ok(events);
  }
}

const serializeSnapshot = (snapshot: PaymentSnapshot) => {
  const updatedAt = snapshot.updatedAt ?? snapshot.createdAt ?? new Date();
  const createdAt = snapshot.createdAt ?? updatedAt;
  const checkoutExpiresAt = snapshot.checkoutExpiresAt
    ? snapshot.checkoutExpiresAt instanceof Date
      ? snapshot.checkoutExpiresAt.toISOString()
      : snapshot.checkoutExpiresAt
    : null;

  return {
    amountMinor: snapshot.amountMinor,
    currency: snapshot.currency,
    state: snapshot.state,
    attempt: snapshot.attempt,
    description: snapshot.description ?? null,
    customerEmail: snapshot.customerEmail ?? null,
    checkoutUrl: snapshot.checkoutUrl ?? null,
    checkoutExpiresAt,
    providerReference: snapshot.providerReference ?? null,
    lastError: snapshot.lastError ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    version: snapshot.version
  };
};
