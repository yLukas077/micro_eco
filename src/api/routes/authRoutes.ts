import { Router } from 'express';
import { AppDataSource } from '../../utils/dataSource';
import { Client, UserRole } from '../../entities/Client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Cadastra um novo usuário
 *     description: "Se não for passado role, será cadastrado como CLIENT. Para ADMIN, é preciso enviar role: ADMIN."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               cpfCnpj:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [CLIENT, ADMIN]
 *             required: [name, email, cpfCnpj, password]
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: Campos faltando
 *       409:
 *         description: Email ou CPF/CNPJ já existe
 */
router.post('/register', async (req, res) => {
  const { name, email, cpfCnpj, password, role } = req.body;
  if (!name || !email || !cpfCnpj || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  const repo = AppDataSource.getRepository(Client);
  const existing = await repo.findOne({ where: [{ email }, { cpfCnpj }] });
  if (existing) {
    return res.status(409).json({ message: 'Email or CPF/CNPJ already exists' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = repo.create({ name, email, cpfCnpj, password: hashed, role: role || UserRole.CLIENT });
  await repo.save(user);
  // Issue token
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '2h' });
  return res.status(201).json({ token });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Realiza login do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required: [email, password]
 *     responses:
 *       200:
 *         description: Token de autenticação retornado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: Campos faltando
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }
  const repo = AppDataSource.getRepository(Client);
  const user = await repo.findOne({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '2h' });
  res.json({ token });
});

export default router;
