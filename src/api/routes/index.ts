import { Router } from 'express';
import authRoutes from './authRoutes';
import clientRoutes from './clientRoutes';
import productRoutes from './productRoutes';
import orderRoutes from './orderRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);

export default router;