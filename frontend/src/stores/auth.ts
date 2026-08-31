import { defineStore } from 'pinia';
import { ref } from 'vue';
import request from '@/utils/request';

export interface AuthUser {
  id: number;
  username?: string;
  memberNo?: string;
  name: string;
  phone?: string;
  role: string;
  storeId: number | null;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '');
  const user = ref<AuthUser | null>(JSON.parse(localStorage.getItem('user') || 'null'));

  async function login(username: string, password: string): Promise<void> {
    const data = await request.post('/auth/login', { username, password });
    token.value = data.token;
    localStorage.setItem('token', data.token);
    await fetchProfile();
  }

  async function fetchProfile(): Promise<void> {
    const data = await request.get('/auth/profile');
    user.value = data;
    localStorage.setItem('user', JSON.stringify(data));
  }

  function logout(): void {
    token.value = '';
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  return { token, user, login, fetchProfile, logout };
});
