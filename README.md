# Node.js Event-Driven Modular Monolith

Architecture:

Payment module -> SQS -> Order consumer -> PostgreSQL -> Redis Pub/Sub -> WebSocket -> Client

## Components

- Node.js + TypeScript
- Express
- SQS (LocalStack for local development)
- PostgreSQL
- Redis Pub/Sub
- WebSocket (`ws`)

## Run

### 1. Start infrastructure

```bash
docker compose up -d
```

### 2. Create the SQS queue

```bash
aws --endpoint-url=http://localhost:4566 \
  --region ap-south-1 \
  sqs create-queue \
  --queue-name order-events
```

If AWS CLI is not installed, install it or use LocalStack's tooling.

The returned queue URL should normally be:

```text
http://localhost:4566/000000000000/order-events
```

### 3. Initialize PostgreSQL

```bash
psql postgres://postgres:postgres@localhost:5432/orders \
  -f sql/schema.sql
```

### 4. Install Node dependencies

```bash
npm install
```

### 5. Configure environment

```bash
cp .env.example .env
```

### 6. Start the app

```bash
npm run dev
```

## Test the flow

Create an order:

```bash
curl -X POST http://localhost:3000/demo/orders \
  -H 'content-type: application/json' \
  -d '{
    "orderId": "00000000-0000-0000-0000-000000000001",
    "userId": "USER-101"
  }'
```

Connect a WebSocket client:

```text
ws://localhost:3000/ws?userId=USER-101
```

Then simulate payment success:

```bash
curl -X POST http://localhost:3000/demo/payments/success \
  -H 'content-type: application/json' \
  -d '{
    "orderId": "00000000-0000-0000-0000-000000000001",
    "userId": "USER-101",
    "paymentId": "PAY-5001",
    "amount": 650
  }'
```

The flow is:

```text
POST payment success
        |
        v
Payment Module
        |
        v
      SQS
        |
        v
Order Consumer
        |
        +--> PostgreSQL transaction
        |
        +--> Redis Pub/Sub
                    |
                    v
              WebSocket
                    |
                    v
               USER-101
```

## Production notes

1. Never trust `userId` from the WebSocket query string. Authenticate the connection with a JWT and derive the user ID from the verified claims.
2. SQS messages are at-least-once. Keep event handling idempotent.
3. `processed_events` protects against duplicate `PaymentSucceeded` events.
4. Delete an SQS message only after successful processing.
5. Configure an SQS DLQ and redrive policy.
6. Publish the Redis notification only after the PostgreSQL transaction commits.
7. Redis Pub/Sub is not durable. PostgreSQL remains the source of truth.
8. On WebSocket reconnect, the client should call `GET /orders/:id` to recover current state.
9. For multiple Node.js instances, every instance subscribes to Redis Pub/Sub and maintains only its local WebSocket connections.
10. For a production system, add authentication, structured logging, metrics, tracing, graceful shutdown, retries, rate limiting, and health/readiness endpoints.
# order-event-driven-monolith
