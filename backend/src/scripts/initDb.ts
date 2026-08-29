import { Sequelize } from 'sequelize';
import { env } from '../config/env';

async function initDb(): Promise<void> {
  const sequelize = new Sequelize('', env.db.user, env.db.password, {
    host: env.db.host,
    port: env.db.port,
    dialect: 'mysql',
    logging: false,
  });

  const [rows] = await sequelize.query(
    `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${env.db.name}'`
  );
  if ((rows as unknown[]).length === 0) {
    await sequelize.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`数据库 ${env.db.name} 已创建`);
  } else {
    console.log(`数据库 ${env.db.name} 已存在`);
  }
  await sequelize.close();
}

initDb().catch((err) => {
  console.error('初始化数据库失败:', err);
  process.exit(1);
});
