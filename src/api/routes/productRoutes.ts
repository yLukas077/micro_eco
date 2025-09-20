import { Router } from 'express';
import { AppDataSource } from '../../utils/dataSource';
import { Product } from '../../entities/Product';
import { authenticate, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../../entities/Client';

const router = Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Lista todos os produtos
 *     responses:
 *       200:
 *         description: Lista de produtos
 */
router.get('/', async (_req, res) => {
  const repo = AppDataSource.getRepository(Product);
  const products = await repo.find();
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Detalha um produto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do produto
 *     responses:
 *       200:
 *         description: Produto encontrado
 *       404:
 *         description: Produto não encontrado
 */
router.get('/:id', async (req, res) => {
  const repo = AppDataSource.getRepository(Product);
  const product = await repo.findOne({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Cria um novo produto (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *             required: [name, price, stock]
 *     responses:
 *       201:
 *         description: Produto criado
 */
router.post('/', authenticate, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  const { name, price, stock } = req.body;
  if (!name || price == null || stock == null) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  const repo = AppDataSource.getRepository(Product);
  const product = repo.create({ name, price, stock });
  await repo.save(product);
  res.status(201).json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Atualiza um produto (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do produto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Produto atualizado
 *       404:
 *         description: Produto não encontrado
 */
router.put('/:id', authenticate, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  const { id } = req.params;
  const repo = AppDataSource.getRepository(Product);
  const product = await repo.findOne({ where: { id } });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const { name, price, stock } = req.body;
  if (name !== undefined) product.name = name;
  if (price !== undefined) product.price = price;
  if (stock !== undefined) product.stock = stock;
  await repo.save(product);
  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Remove um produto (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do produto
 *     responses:
 *       204:
 *         description: Produto removido
 *       404:
 *         description: Produto não encontrado
 */
router.delete('/:id', authenticate, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  const { id } = req.params;
  const repo = AppDataSource.getRepository(Product);
  const product = await repo.findOne({ where: { id } });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  await repo.remove(product);
  res.status(204).end();
});

export default router;
