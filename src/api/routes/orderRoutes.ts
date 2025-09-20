import { Router } from 'express';
import { AppDataSource } from '../../utils/dataSource';
import { Order, OrderStatus } from '../../entities/Order';
import { OrderItem } from '../../entities/OrderItem';
import { Product } from '../../entities/Product';
import { OutboxEvent } from '../../entities/OutboxEvent';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { UserRole } from '../../entities/Client';

const router = Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Cria um novo pedido (cliente)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                   required: [productId, quantity]
 *             required: [items]
 *     responses:
 *       201:
 *         description: Pedido criado
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  // Only clients can create orders
  if (req.user.role !== UserRole.CLIENT) {
    return res.status(403).json({ message: 'Only clients can create orders' });
  }

  const items: { productId: string; quantity: number }[] = req.body.items;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Order must contain items' });
  }

  const productRepo = AppDataSource.getRepository(Product);
  const orderRepo = AppDataSource.getRepository(Order);

  try {
    let order: Order | null = null;

    await AppDataSource.transaction(async (manager) => {
      order = manager.create(Order, {
        client: { id: req.user!.id },
        status: OrderStatus.PENDING_PAYMENT,
      });
      order.items = [];

      for (const item of items) {
        const product = await manager.findOne(Product, { where: { id: item.productId } });
        if (!product) throw new Error(`Product ${item.productId} not found`);

        const orderItem = manager.create(OrderItem, {
          product,
          quantity: item.quantity,
          priceAtPurchase: product.price,
        });
        order.items.push(orderItem);
      }

      await manager.save(order!);

      // Outbox record to publish event
      const payload = JSON.stringify({ orderId: order!.id, clientId: req.user!.id, items });
      const event = manager.create(OutboxEvent, {
        eventType: 'ORDER_CREATED',
        payload,
        processed: false,
      });
      await manager.save(event);
    });

    const fullOrder = await orderRepo.findOne({
      where: { id: order!.id },
      relations: ['items', 'items.product', 'client'],
    });

    return res.status(201).json(fullOrder);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Lista pedidos
 *     description: Admin vê todos os pedidos; cliente vê apenas os próprios pedidos.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const orderRepo = AppDataSource.getRepository(Order);
  let orders: Order[];

  if (req.user.role === UserRole.ADMIN) {
    orders = await orderRepo.find({ relations: ['items', 'items.product', 'client'] });
  } else {
    orders = await orderRepo.find({
      where: { client: { id: req.user.id } },
      relations: ['items', 'items.product', 'client'],
    });
  }

  res.json(orders);
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Detalha um pedido
 *     description: Admin pode ver qualquer pedido; cliente só vê o próprio.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pedido
 *     responses:
 *       200:
 *         description: Pedido encontrado
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Pedido não encontrado
 */
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.params;
  const orderRepo = AppDataSource.getRepository(Order);
  const order = await orderRepo.findOne({
    where: { id },
    relations: ['items', 'items.product', 'client'],
  });

  if (!order) return res.status(404).json({ message: 'Order not found' });

  if (req.user.role !== UserRole.ADMIN && order.client.id !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.json(order);
});

export default router;
