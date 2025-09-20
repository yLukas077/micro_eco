import { Router } from 'express';
import { AppDataSource } from '../../utils/dataSource';
import { Client, UserRole } from '../../entities/Client';
import { Order } from '../../entities/Order';
import { authenticate, authorizeRoles, AuthRequest } from '../middlewares/auth';

const router = Router();

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: Lista todos os clientes (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de clientes
 *       403:
 *         description: Sem permissão
 */
router.get('/', authenticate, authorizeRoles(UserRole.ADMIN), async (_req, res) => {
  const repo = AppDataSource.getRepository(Client);
  const clients = await repo.find({ select: ['id', 'name', 'email', 'cpfCnpj', 'role', 'createdAt', 'updatedAt'] });
  res.json(clients);
});

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Detalha um cliente (self ou admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Não encontrado
 */
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (req.user.role !== UserRole.ADMIN && req.user.id !== id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const repo = AppDataSource.getRepository(Client);
  const client = await repo.findOne({ where: { id }, select: ['id', 'name', 'email', 'cpfCnpj', 'role', 'createdAt', 'updatedAt'] });
  if (!client) {
    return res.status(404).json({ message: 'Client not found' });
  }
  res.json(client);
});

/**
 * @swagger
 * /api/clients/{id}/orders:
 *   get:
 *     summary: Lista pedidos de um cliente (self ou admin)
 *     description: Admin vê qualquer cliente; o próprio cliente vê apenas seus pedidos.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Lista de pedidos do cliente
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Cliente não encontrado
 */
router.get('/:id/orders', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (req.user.role !== UserRole.ADMIN && req.user.id !== id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const repo = AppDataSource.getRepository(Order);
  const orders = await repo.find({ where: { client: { id } }, relations: ['items', 'items.product'] });
  res.json(orders);
});

export default router;
