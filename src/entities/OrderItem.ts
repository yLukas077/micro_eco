import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Order } from './Order';
import { Product } from './Product';

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.items, { nullable: false, onDelete: 'CASCADE' })
  order!: Order;

  @ManyToOne(() => Product, (product) => product.items, { nullable: false })
  product!: Product;

  @Column('int')
  quantity!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  priceAtPurchase!: number;
}