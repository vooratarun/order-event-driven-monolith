import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand
} from "@aws-sdk/client-sqs";
import { config } from "../config";
import { DomainEvent } from "../events";

export const sqs = new SQSClient({
  region: config.awsRegion,
  endpoint: config.sqsEndpoint || undefined
});

export async function publishEvent(event: DomainEvent) {
  await sqs.send(new SendMessageCommand({
    QueueUrl: config.orderQueueUrl,
    MessageBody: JSON.stringify(event)
  }));
}

export async function receiveMessages() {
  return sqs.send(new ReceiveMessageCommand({
    QueueUrl: config.orderQueueUrl,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20,
    VisibilityTimeout: 30
  }));
}

export async function deleteMessage(receiptHandle: string) {
  await sqs.send(new DeleteMessageCommand({
    QueueUrl: config.orderQueueUrl,
    ReceiptHandle: receiptHandle
  }));
}
