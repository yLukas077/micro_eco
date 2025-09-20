import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1694799999999 implements MigrationInterface {
  name = 'Init1694799999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."client_role_enum" AS ENUM('CLIENT','ADMIN');`);
    await queryRunner.query(`CREATE TYPE "public"."order_status_enum" AS ENUM('PENDING_PAYMENT','PAYMENT_FAILED','CONFIRMED','CANCELLED');`);
    await queryRunner.query(`CREATE TABLE "client" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "email" character varying NOT NULL, "cpfCnpj" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."client_role_enum" NOT NULL DEFAULT 'CLIENT', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_email" UNIQUE ("email"), CONSTRAINT "UQ_cpf_cnpj" UNIQUE ("cpfCnpj"), CONSTRAINT "PK_client_id" PRIMARY KEY ("id"));`);
    await queryRunner.query(`CREATE TABLE "order" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."order_status_enum" NOT NULL DEFAULT 'PENDING_PAYMENT', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "clientId" uuid NOT NULL, CONSTRAINT "PK_order_id" PRIMARY KEY ("id"));`);
    await queryRunner.query(`CREATE TABLE "product" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "price" numeric(10,2) NOT NULL, "stock" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_product_id" PRIMARY KEY ("id"));`);
    await queryRunner.query(`CREATE TABLE "order_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL, "priceAtPurchase" numeric(10,2) NOT NULL, "orderId" uuid NOT NULL, "productId" uuid NOT NULL, CONSTRAINT "PK_order_item_id" PRIMARY KEY ("id"));`);
    await queryRunner.query(`CREATE TABLE "outbox_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventType" character varying NOT NULL, "payload" text NOT NULL, "processed" boolean NOT NULL DEFAULT false, "attempts" integer NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_outbox_event_id" PRIMARY KEY ("id"));`);
    await queryRunner.query(`ALTER TABLE "order" ADD CONSTRAINT "FK_order_client" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;`);
    await queryRunner.query(`ALTER TABLE "order_item" ADD CONSTRAINT "FK_order_item_order" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION;`);
    await queryRunner.query(`ALTER TABLE "order_item" ADD CONSTRAINT "FK_order_item_product" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_item" DROP CONSTRAINT "FK_order_item_product"`);
    await queryRunner.query(`ALTER TABLE "order_item" DROP CONSTRAINT "FK_order_item_order"`);
    await queryRunner.query(`ALTER TABLE "order" DROP CONSTRAINT "FK_order_client"`);
    await queryRunner.query(`DROP TABLE "outbox_event"`);
    await queryRunner.query(`DROP TABLE "order_item"`);
    await queryRunner.query(`DROP TABLE "product"`);
    await queryRunner.query(`DROP TABLE "order"`);
    await queryRunner.query(`DROP TYPE "public"."order_status_enum"`);
    await queryRunner.query(`DROP TABLE "client"`);
    await queryRunner.query(`DROP TYPE "public"."client_role_enum"`);
  }
}