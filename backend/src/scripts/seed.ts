import bcrypt from 'bcryptjs';
import { Store, User } from '../models';

export async function seedData(): Promise<void> {
  const storeCount = await Store.count();
  if (storeCount === 0) {
    await Store.bulkCreate([
      { name: '总店', address: '示例路 1 号', phone: '010-88888888', businessHours: '08:00-22:00' },
      { name: '分店', address: '示例街 2 号', phone: '010-66666666', businessHours: '09:00-21:00' },
    ]);
    console.log('已初始化示例门店');
  }

  const userCount = await User.count();
  if (userCount === 0) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await User.bulkCreate([
      { username: 'admin', passwordHash, name: '系统管理员', role: 'admin', storeId: 1 },
      { username: 'frontdesk', passwordHash, name: '前台小李', role: 'frontdesk', storeId: 1 },
      { username: 'trainer', passwordHash, name: '教练小张', role: 'trainer', storeId: 1 },
    ]);
    console.log('已初始化员工账号 (默认密码 admin123)');
  }
}
