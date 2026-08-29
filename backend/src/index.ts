import app from './app';
import { env } from './config/env';
import { testConnection } from './config/database';
import { initModels } from './models';
import { seedData } from './scripts/seed';

async function main(): Promise<void> {
  await testConnection();
  await initModels();
  await seedData();

  app.listen(env.port, () => {
    console.log(`健身会员系统 API 服务已启动: http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('服务启动失败:', err);
  process.exit(1);
});
