import swaggerJSDoc from 'swagger-jsdoc';

const options: any = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RayLabs E-commerce API',
      version: '1.0.0',
      description:
        'API REST do desafio técnico da RayLabs. Inclui autenticação por JWT, cadastro de clientes e produtos, pedidos e fluxo assíncrono de pagamento/estoque.',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['src/api/routes/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
