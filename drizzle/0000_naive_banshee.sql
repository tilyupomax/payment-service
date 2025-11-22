CREATE TABLE `payment_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`occurred_at` text NOT NULL,
	`version` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_payment_events_payment` ON `payment_events` (`payment_id`);--> statement-breakpoint
CREATE INDEX `idx_payment_events_version` ON `payment_events` (`payment_id`,`version`);--> statement-breakpoint
CREATE TABLE `payments` (
	`payment_id` text PRIMARY KEY NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`state` text NOT NULL,
	`attempt` integer NOT NULL,
	`description` text,
	`customer_email` text,
	`checkout_url` text,
	`checkout_expires_at` text,
	`provider_reference` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_payments_state` ON `payments` (`state`);