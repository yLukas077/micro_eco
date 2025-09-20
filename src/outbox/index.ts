import { AppDataSource } from '../utils/dataSource';
import { OutboxEvent } from '../entities/OutboxEvent';
import { getRabbitChannel, EXCHANGE_NAME } from '../utils/rabbitmq';

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 1000;

async function processOutbox(): Promise<void> {
  const outboxRepo = AppDataSource.getRepository(OutboxEvent);
  const channel = await getRabbitChannel();

  const events = await outboxRepo.find({
    where: { processed: false }, 
    take: 10,
  });

  for (const event of events) {
    if (event.attempts >= MAX_ATTEMPTS) continue;
    try {
      channel.publish(EXCHANGE_NAME, event.eventType, Buffer.from(event.payload), { persistent: true });
      event.processed = true;
      await outboxRepo.save(event);
      console.log(`[outbox] published ${event.eventType} event ${event.id}`);
    } catch (err) {
      console.error(`[outbox] failed to publish event ${event.id}`, err);
      event.attempts = (event.attempts || 0) + 1;
      await outboxRepo.save(event);
    }
  }
}

async function run(): Promise<void> {
  try {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
    console.log('[outbox] started');
    setInterval(() => {
      processOutbox().catch((err) => console.error(err));
    }, POLL_INTERVAL_MS);
  } catch (err) {
    console.error('Outbox service failed to start', err);
    process.exit(1);
  }
}

run();
