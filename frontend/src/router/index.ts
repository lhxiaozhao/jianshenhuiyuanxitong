import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '工作台', icon: 'Odometer' } },
      { path: 'stores', name: 'stores', component: () => import('@/views/StoreListView.vue'), meta: { title: '门店管理', icon: 'OfficeBuilding', roles: ['admin'] } },
      { path: 'members', name: 'members', component: () => import('@/views/MemberListView.vue'), meta: { title: '会员管理', icon: 'User' } },
      { path: 'card-types', name: 'card-types', component: () => import('@/views/CardTypeListView.vue'), meta: { title: '卡类型', icon: 'CreditCard', roles: ['admin', 'frontdesk'] } },
      { path: 'courses', name: 'courses', component: () => import('@/views/CourseListView.vue'), meta: { title: '课程管理', icon: 'Basketball', roles: ['admin', 'frontdesk', 'trainer'] } },
      { path: 'bookings', name: 'bookings', component: () => import('@/views/BookingListView.vue'), meta: { title: '预约管理', icon: 'Calendar' } },
      { path: 'wallets', name: 'wallets', component: () => import('@/views/WalletListView.vue'), meta: { title: '钱包与账单', icon: 'Wallet', roles: ['admin', 'frontdesk', 'member'] } },
      { path: 'points', name: 'points', component: () => import('@/views/PointsView.vue'), meta: { title: '积分明细', icon: 'Medal', roles: ['admin', 'frontdesk', 'member'] } },
      { path: 'benefits', name: 'benefits', component: () => import('@/views/BenefitListView.vue'), meta: { title: '权益管理', icon: 'Present', roles: ['admin', 'frontdesk'] } },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (to.meta.public) {
    return true;
  }

  if (!auth.token) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  if (!auth.user) {
    try {
      await auth.fetchProfile();
    } catch {
      auth.logout();
      return { path: '/login' };
    }
  }

  const roles = to.meta.roles as string[] | undefined;
  if (roles && auth.user && !roles.includes(auth.user.role)) {
    return { path: '/dashboard' };
  }

  return true;
});

export default router;
