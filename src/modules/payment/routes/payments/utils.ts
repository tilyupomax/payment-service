import type {
	CreatePaymentCommand,
	ProcessProviderCallbackCommand,
	PaymentDomainEvent
} from "@/modules/payment";
import type { CreatePaymentBody, WebhookBody } from "./schema";

export const buildCreatePaymentCommand = (body: CreatePaymentBody): CreatePaymentCommand => {
	const command: CreatePaymentCommand = {
		amountMinor: body.amountMinor,
		currency: body.currency
	};

	if (body.description) {
		command.description = body.description;
	}

	if (body.customerEmail) {
		command.customerEmail = body.customerEmail;
	}

	return command;
};

export const buildWebhookCommand = (body: WebhookBody): ProcessProviderCallbackCommand =>
	body as ProcessProviderCallbackCommand;

export const formatHistory = (paymentId: string, events: PaymentDomainEvent[]) => ({
	paymentId,
	events: events.map((event) => ({
		type: event.type,
		occurredAt: event.occurredAt.toISOString(),
		data: event.data
	}))
});
