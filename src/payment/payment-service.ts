import crypto from "node:crypto";
import { publishEvent } from "../messaging/sqs";
import { PaymentSucceededEvent } from "../events";

export async function markPaymentSucceeded(
  orderId: string,
  userId: string,
  paymentId: string,
  amount: number
) {
  // In production, verify the payment with the provider
  // before publishing this event.

  const event: PaymentSucceededEvent = {
    eventId: crypto.randomUUID(),
    type: "PaymentSucceeded",
    orderId,
    userId,
    paymentId,
    amount
  };

  await publishEvent(event);

  return event;
}
