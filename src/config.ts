import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  awsRegion: process.env.AWS_REGION ?? "ap-south-1",
  sqsEndpoint: process.env.SQS_ENDPOINT,
  orderQueueUrl: process.env.ORDER_QUEUE_URL!
};
