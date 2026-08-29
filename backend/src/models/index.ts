import { sequelize } from '../config/database';

export async function initModels(): Promise<void> {
  await sequelize.sync();
}
