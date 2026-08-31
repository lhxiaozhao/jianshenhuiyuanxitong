<template>
  <el-container class="main-layout">
    <el-aside
      width="220px"
      class="main-aside"
    >
      <div class="logo">
        健身会员系统
      </div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="#001529"
        text-color="rgba(255, 255, 255, 0.65)"
        active-text-color="#ffffff"
      >
        <el-menu-item
          v-for="item in menuItems"
          :key="item.path"
          :index="item.path"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="main-header">
        <div class="page-title">
          {{ currentTitle }}
        </div>
        <div class="header-right">
          <el-tag size="small">
            {{ roleText }}
          </el-tag>
          <span class="username">{{ auth.user?.name }}</span>
          <el-button
            type="danger"
            link
            @click="handleLogout"
          >
            退出登录
          </el-button>
        </div>
      </el-header>
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const allMenus = [
  { path: '/dashboard', title: '工作台', icon: 'Odometer' },
  { path: '/stores', title: '门店管理', icon: 'OfficeBuilding', roles: ['admin'] },
  { path: '/members', title: '会员管理', icon: 'User' },
  { path: '/card-types', title: '卡类型', icon: 'CreditCard', roles: ['admin', 'frontdesk'] },
  { path: '/courses', title: '课程管理', icon: 'Basketball', roles: ['admin', 'frontdesk', 'trainer'] },
  { path: '/bookings', title: '预约管理', icon: 'Calendar' },
  { path: '/wallets', title: '钱包与账单', icon: 'Wallet', roles: ['admin', 'frontdesk', 'member'] },
  { path: '/points', title: '积分明细', icon: 'Medal', roles: ['admin', 'frontdesk', 'member'] },
  { path: '/benefits', title: '权益管理', icon: 'Present', roles: ['admin', 'frontdesk'] },
];

const menuItems = computed(() => {
  const role = auth.user?.role;
  if (role === 'admin') {
    return allMenus;
  }
  return allMenus.filter((item) => !item.roles || item.roles.includes(role));
});

const currentTitle = computed(() => (route.meta.title as string) || '');

const roleText = computed(() => {
  const map: Record<string, string> = { admin: '管理员', frontdesk: '前台', trainer: '教练', member: '会员' };
  return map[auth.user?.role ?? ''] || auth.user?.role || '';
});

async function handleLogout(): Promise<void> {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' });
    auth.logout();
    router.push('/login');
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.main-aside {
  background-color: #001529;
  overflow-x: hidden;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 2px;
  background-color: #002140;
}

.main-aside :deep(.el-menu) {
  border-right: none;
}

.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 14px;
  color: #303133;
}

.main-content {
  background-color: #f5f7fa;
}
</style>
