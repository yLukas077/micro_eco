import { getRabbitChannel, EXCHANGE_NAME } from '../utils/rabbitmq';
import amqp from 'amqplib';


async function startPaymentService(): Promise<void> {
  const channel = await getRabbitChannel();
  const queue = 'order_created';
  await channel.assertQueue(queue, {
    durable: true,
    deadLetterExchange: EXCHANGE_NAME,
    deadLetterRoutingKey: 'order_created.dlq',
  });
  await channel.bindQueue(queue, EXCHANGE_NAME, 'ORDER_CREATED');
  await channel.prefetch(1);
  console.log('[payment] Waiting for ORDER_CREATED events');
  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const content = msg.content.toString();
      const data = JSON.parse(content);
      const { orderId } = data;
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 2000 + 500));
      const success = Math.random() < 0.8;
      const eventType = success ? 'PAYMENT_CONFIRMED' : 'PAYMENT_FAILED';
      const payload = JSON.stringify({ orderId });
      await channel.publish(EXCHANGE_NAME, eventType, Buffer.from(payload), { persistent: true });
      console.log(`[payment] Processed payment for order ${orderId}: ${eventType}`);
      channel.ack(msg);
    } catch (err) {
      console.error('[payment] Error processing payment', err);
      channel.nack(msg, false, false);
    }
  });
}

startPaymentService().catch((err) => {
  console.error('Payment service failed to start', err);
  process.exit(1);
});