import express from "express";
import http from "node:http";
import WebSocket, { WebSocketServer } from "ws";
import { config } from "./config";
import { WebSocketManager } from "./realtime/websocket-manager";
import { subscribeOrderStatus } from "./messaging/redis";
import { startOrderConsumer, stopConsumer } from "./order/order-consumer";
import { createDemoOrder, getOrder } from "./order/order-service";
import { markPaymentSucceeded } from "./payment/payment-service";

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  path: "/ws"
});

const wsManager = new WebSocketManager();

wss.on("connection", (ws, request) => {
  const url = new URL(
    request.url ?? "/ws",
    "http://localhost"
  );

  // DEMO ONLY.
  // Production: authenticate JWT and derive userId from it.
  const userId = url.searchParams.get("userId");

  if (!userId) {
    ws.close(1008, "Missing userId");
    return;
  }

  wsManager.add(userId, ws);

  ws.send(JSON.stringify({
    type: "CONNECTED"
  }));

  ws.on("close", () => {
    wsManager.remove(userId, ws);
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/orders/:id", async (req, res) => {
  try {
    const order = await getOrder(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    return res.json(order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});

// Demo endpoint: create order
app.post("/demo/orders", async (req, res) => {
  const { orderId, userId } = req.body;

  await createDemoOrder(orderId, userId);

  res.status(201).json({
    orderId,
    status: "PENDING_PAYMENT"
  });
});

// Demo endpoint: simulate Paytm success
app.post("/demo/payments/success", async (req, res) => {
  const {
    orderId,
    userId,
    paymentId,
    amount
  } = req.body;

  const event = await markPaymentSucceeded(
    orderId,
    userId,
    paymentId,
    amount
  );

  res.json({
    accepted: true,
    eventId: event.eventId
  });
});

subscribeOrderStatus((event) => {
  wsManager.sendToUser(
    event.userId,
    event
  );
}).catch(console.error);

startOrderConsumer().catch(console.error);

server.listen(config.port, () => {
  console.log(`HTTP: http://localhost:${config.port}`);
  console.log(`WS: ws://localhost:${config.port}/ws`);
});

process.on("SIGTERM", () => {
  stopConsumer();
  server.close();
});
