import Redis from "ioredis";
import { config } from "../config";
import { OrderStatusChangedEvent } from "../events";

export const redisPublisher = new Redis(config.redisUrl);
export const redisSubscriber = new Redis(config.redisUrl);

const CHANNEL = "order-status";

export async function publishOrderStatus(
  event: OrderStatusChangedEvent
) {
  await redisPublisher.publish(
    CHANNEL,
    JSON.stringify(event)
  );
}

export async function subscribeOrderStatus(
  handler: (event: OrderStatusChangedEvent) => void
) {
  await redisSubscriber.subscribe(CHANNEL);

  redisSubscriber.on("message", (_channel, message) => {
    handler(JSON.parse(message));
  });
}
