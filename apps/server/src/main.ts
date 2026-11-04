import './config';
import { createApp } from './app';

async function main() {
  const instance = await createApp();
  await instance.app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
  const shutdown = async () => {
    await instance.close();
    process.exit(0);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
