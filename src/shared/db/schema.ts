import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const payments = sqliteTable(
  "payments",
  {
    id: text("payment_id").primaryKey(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    state: text("state").notNull(),
    attempt: integer("attempt").notNull(),
    description: text("description"),
    customerEmail: text("customer_email"),
    checkoutUrl: text("checkout_url"),
    checkoutExpiresAt: text("checkout_expires_at"),
    providerReference: text("provider_reference"),
    lastError: text("last_error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    version: integer("version").notNull()
  },
  (table) => [index("idx_payments_state").on(table.state)]
);

export const paymentEvents = sqliteTable(
  "payment_events",
  {
    id: text("event_id").primaryKey(),
    paymentId: text("payment_id").notNull(),
    type: text("type").notNull(),
    payload: text("payload").notNull(),
    occurredAt: text("occurred_at").notNull(),
    version: integer("version").notNull()
  },
  (table) => [
    index("idx_payment_events_payment").on(table.paymentId),
    index("idx_payment_events_version").on(table.paymentId, table.version)
  ]
);
