import { AppDataSource } from '../utils/dataSource';
import { getRabbitChannel, EXCHANGE_NAME } from '../utils/rabbitmq';
import { Order, OrderStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';

async function handlePaymentConfirmed(orderId: string, channel: any, msg: any): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    // Lock order row
    const order = await queryRunner.manager.findOne(Order, { where: { id: orderId }, relations: ['items', 'items.product'] });
    if (!order) throw new Error('Order not found');
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      // Already processed; ack and return
      await queryRunner.release();
      channel.ack(msg);
      return;
    }
    // Check each item
    for (const item of order.items) {
      // Lock product row
      const product = await queryRunner.manager.findOne(Product, { where: { id: item.product.id }, lock: { mode: 'pessimistic_write' } });
      if (!product) throw new Error('Product not found');
      if (product.stock < item.quantity) {
        // Not enough stock -> cancel order
        order.status = OrderStatus.CANCELLED;
        await queryRunner.manager.save(order);
        await queryRunner.commitTransaction();
        await queryRunner.release();
        channel.ack(msg);
        console.log(`[inventory] Order ${orderId} cancelled due to insufficient stock`);
        return;
      }
    }
    // Sufficient stock for all items -> deduct
    for (const item of order.items) {
      const product = await queryRunner.manager.findOne(Product, { where: { id: item.product.id }, lock: { mode: 'pessimistic_write' } });
      if (!product) throw new Error('Product not found');
      product.stock -= item.quantity;
      await queryRunner.manager.save(product);
    }
    order.status = OrderStatus.CONFIRMED;
    await queryRunner.manager.save(order);
    await queryRunner.commitTransaction();
    await queryRunner.release();
    channel.ack(msg);
    console.log(`[inventory] Order ${orderId} confirmed and stock updated`);
  } catch (err) {
    console.error(`[inventory] Error handling payment confirmed for order ${orderId}`, err);
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
    channel.nack(msg, false, false);
  }
}

async function handlePaymentFailed(orderId: string, channel: any, msg: any): Promise<void> {
  const orderRepo = AppDataSource.getRepository(Order);
  try {
    const order = await orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    // Only update if still pending
    if (order.status === OrderStatus.PENDING_PAYMENT) {
      order.status = OrderStatus.PAYMENT_FAILED;
      await orderRepo.save(order);
      console.log(`[inventory] Order ${orderId} marked as payment failed`);
    }
    channel.ack(msg);
  } catch (err) {
    console.error(`[inventory] Error handling payment failed for order ${orderId}`, err);
    channel.nack(msg, false, false);
  }
}

async function startInventoryService(): Promise<void> {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  const channel = await getRabbitChannel();
  // Payment confirmed queue
  const confirmedQueue = 'payment_confirmed';
  await channel.assertQueue(confirmedQueue, { durable: true });
  await channel.bindQueue(confirmedQueue, EXCHANGE_NAME, 'PAYMENT_CONFIRMED');
  // Payment failed queue
  const failedQueue = 'payment_failed';
  await channel.assertQueue(failedQueue, { durable: true });
  await channel.bindQueue(failedQueue, EXCHANGE_NAME, 'PAYMENT_FAILED');
  console.log('[inventory] Waiting for payment events');
  channel.consume(confirmedQueue, async (msg) => {
    if (!msg) return;
    const data = JSON.parse(msg.content.toString());
    const orderId = data.orderId;
    await handlePaymentConfirmed(orderId, channel, msg);
  });
  channel.consume(failedQueue, async (msg) => {
    if (!msg) return;
    const data = JSON.parse(msg.content.toString());
    const orderId = data.orderId;
    await handlePaymentFailed(orderId, channel, msg);
  });
}

startInventoryService().catch((err) => {
  console.error('Inventory service failed to start', err);
  process.exit(1);
});