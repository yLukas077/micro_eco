import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Client } from '../entities/Client';
import { Product } from '../entities/Product';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { OutboxEvent } from '../entities/OutboxEvent';
import dotenv from 'dotenv';

dotenv.config();

function createDataSource(): DataSource {
  const entities = [Client, Product, Order, OrderItem, OutboxEvent];

  const migrations =
    process.env.NODE_ENV === 'production'
      ? ['dist/migrations/*.js']
      : ['src/migrations/*.ts'];

    return new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database:
        process.env.NODE_ENV === 'test'
          ? process.env.DB_NAME || 'raylabs_test'
          : process.env.DB_NAME || 'raylabs',
      entities,
      synchronize: process.env.NODE_ENV === 'test',
      migrationsRun: process.env.NODE_ENV === 'test', 
      migrations,
      logging: false,
    });
       
}

export const AppDataSource = createDataSource();
