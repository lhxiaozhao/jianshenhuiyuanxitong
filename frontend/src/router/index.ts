import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

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
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
      { path: 'stores', name: 'stores', component: () => import('@/views/StoreListView.vue') },
      { path: 'members', name: 'members', component: () => import('@/views/MemberListView.vue') },
      { path: 'card-types', name: 'card-types', component: () => import('@/views/CardTypeListView.vue') },
      { path: 'courses', name: 'courses', component: () => import('@/views/CourseListView.vue') },
      { path: 'bookings', name: 'bookings', component: () => import('@/views/BookingListView.vue') },
      { path: 'wallets', name: 'wallets', component: () => import('@/views/WalletListView.vue') },
      { path: 'points', name: 'points', component: () => import('@/views/PointsView.vue') },
      { path: 'benefits', name: 'benefits', component: () => import('@/views/BenefitListView.vue') },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
