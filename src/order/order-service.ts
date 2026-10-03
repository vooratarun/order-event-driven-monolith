import { PoolClient } from "pg";
import { transaction } from "../db";
import { PaymentSucceededEvent } from "../events";
import { OrderState, assertTransition } from "./order-state";
import { publishOrderStatus } from "../messaging/redis";

export async function createDemoOrder(
  orderId: string,
  userId: string
) {
  await transaction(async (client) => {
    await client.query(
      `INSERT INTO orders
       (id, customer_id, status, total_amount)
       VALUES ($1, $2, $3, $4)`,
      [orderId, userId, OrderState.PENDING_PAYMENT, 650]
    );

    await client.query(
      `INSERT INTO order_state_history
       (order_id, from_state, to_state, reason)
       VALUES ($1, NULL, $2, $3)`,
      [orderId, OrderState.PENDING_PAYMENT, "Order created"]
    );
  });
}

export async function handlePaymentSucceeded(
  event: PaymentSucceededEvent
) {
  let newStatus: OrderState | null = null;

  await transaction(async (client: PoolClient) => {
    const processed = await client.query(
      `SELECT event_id
       FROM processed_events
       WHERE event_id = $1`,
      [event.eventId]
    );

    if (processed.rowCount) {
      return;
    }

    const result = await client.query(
      `SELECT status
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [event.orderId]
    );

    if (!result.rowCount) {
      throw new Error(`Order not found: ${event.orderId}`);
    }

    const current = result.rows[0].status as OrderState;
    assertTransition(current, OrderState.PAID);

    await client.query(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [OrderState.PAID, event.orderId]
    );

    await client.query(
      `INSERT INTO order_state_history
       (order_id, from_state, to_state, reason)
       VALUES ($1, $2, $3, $4)`,
      [
        event.orderId,
        current,
        OrderState.PAID,
        "Payment verified"
      ]
    );

    await client.query(
      `INSERT INTO processed_events(event_id)
       VALUES ($1)`,
      [event.eventId]
    );

    newStatus = OrderState.PAID;
  });

  // Publish only after the DB transaction has committed.
  if (newStatus) {
    await publishOrderStatus({
      type: "ORDER_STATUS_CHANGED",
      orderId: event.orderId,
      userId: event.userId,
      status: newStatus
    });
  }
}

export async function getOrder(orderId: string) {
  const result = await transaction(async (client) => {
    return client.query(
      `SELECT id, customer_id, status, total_amount,
              created_at, updated_at
       FROM orders
       WHERE id = $1`,
      [orderId]
    );
  });

  return result.rows[0] ?? null;
}
