import request from 'supertest';
import express from 'express';
process.env.NODE_ENV = 'test';

import { AppDataSource } from '../utils/dataSource';
import routes from '../api/routes';
import dotenv from 'dotenv';

dotenv.config();


async function createTestApp() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
  }
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  return app;
}

describe('API integration tests', () => {
  let app: express.Express;
  let clientToken: string;
  let adminToken: string;
  let productId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it('registers a new client', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', cpfCnpj: '12345678900', password: 'password' })
      .expect(201);
    expect(res.body.token).toBeDefined();
    clientToken = res.body.token;
  });

  it('registers an admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin', email: 'admin@example.com', cpfCnpj: '00011122233', password: 'adminpass', role: 'ADMIN' })
      .expect(201);
    adminToken = res.body.token;
  });

  it('admin creates a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Product 1', price: 10.5, stock: 100 })
      .expect(201);
    expect(res.body.id).toBeDefined();
    productId = res.body.id;
  });

  it('client cannot create product', async () => {
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ name: 'Fail Product', price: 5, stock: 1 })
      .expect(403);
  });

  it('client creates an order', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ items: [{ productId, quantity: 2 }] })
      .expect(201);
    expect(res.body.status).toBe('PENDING_PAYMENT');
    expect(res.body.items.length).toBe(1);
  });
});