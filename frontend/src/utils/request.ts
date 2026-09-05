import axios, { type AxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';

const instance = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

instance.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || '请求失败，请稍后重试';
    if (status === 401) {
      const auth = useAuthStore();
      auth.logout();
      if (router.currentRoute.value.path !== '/login') {
        router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } });
      }
      ElMessage.error('登录已过期，请重新登录');
    } else {
      ElMessage.error(message);
    }
    return Promise.reject(error);
  }
);

interface Request {
  get<T = any>(_url: string, _config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(_url: string, _data?: unknown, _config?: AxiosRequestConfig): Promise<T>;
  put<T = any>(_url: string, _data?: unknown, _config?: AxiosRequestConfig): Promise<T>;
  delete<T = any>(_url: string, _config?: AxiosRequestConfig): Promise<T>;
}

const request = instance as unknown as Request;

export default request;
