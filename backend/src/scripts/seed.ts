import { sequelize } from '../config/database';

export async function seedData(): Promise<void> {
  const count = await sequelize.getQueryInterface().showAllTables();
  if (count.length === 0) {
    console.log('数据库为空，跳过初始化数据');
  }
}
