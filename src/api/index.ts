import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../utils/dataSource';
import dotenv from 'dotenv';
import morgan from 'morgan';
import routes from './routes';

dotenv.config();

async function bootstrap(): Promise<void> {
  try {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();

    const app = express();
    app.use(express.json());
    app.use(morgan('dev'));

    try {
      const swaggerUi = await import('swagger-ui-express');
      const { swaggerSpec } = await import('./docs/swagger');
      app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    } catch (err) {
      console.warn('Swagger modules not installed:', err);
    }

    app.use('/api', routes);

    app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    });

    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => {
      console.log(`API server listening on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to bootstrap application', err);
    process.exit(1);
  }
}

bootstrap();