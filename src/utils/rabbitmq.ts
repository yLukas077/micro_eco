import * as amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = process.env.RABBITMQ_EXCHANGE || 'events';

let connection: any = null;
let channel: any = null;

/**
 * Returns a shared RabbitMQ channel. On first call establishes a connection
 * and asserts the default topic exchange. Subsequent calls reuse the same channel.
 */
export async function getRabbitChannel(): Promise<any> {
  if (channel) return channel;

  if (!connection) {
    connection = await amqp.connect(RABBITMQ_URL);
  }

  channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

  return channel;
}

export { EXCHANGE_NAME };
