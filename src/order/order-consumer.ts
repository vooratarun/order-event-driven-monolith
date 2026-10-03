import { deleteMessage, receiveMessages } from "../messaging/sqs";
import { handlePaymentSucceeded } from "./order-service";
import { PaymentSucceededEvent } from "../events";

let running = true;

export function stopConsumer() {
  running = false;
}

export async function startOrderConsumer() {
  console.log("SQS order consumer started");

  while (running) {
    try {
      const response = await receiveMessages();

      for (const message of response.Messages ?? []) {
        try {
          const event = JSON.parse(
            message.Body!
          ) as PaymentSucceededEvent;

          if (event.type === "PaymentSucceeded") {
            await handlePaymentSucceeded(event);
          }

          await deleteMessage(
            message.ReceiptHandle!
          );
        } catch (error) {
          // Do NOT delete failed messages.
          // SQS will retry after VisibilityTimeout.
          console.error("Message processing failed", error);
        }
      }
    } catch (error) {
      console.error("SQS polling failed", error);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}
