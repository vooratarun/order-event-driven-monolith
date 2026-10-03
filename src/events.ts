export type PaymentSucceededEvent = {
  eventId: string;
  type: "PaymentSucceeded";
  orderId: string;
  userId: string;
  paymentId: string;
  amount: number;
};

export type DomainEvent = PaymentSucceededEvent;

export type OrderStatusChangedEvent = {
  type: "ORDER_STATUS_CHANGED";
  orderId: string;
  userId: string;
  status: string;
};
