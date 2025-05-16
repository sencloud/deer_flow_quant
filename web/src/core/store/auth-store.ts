import { create } from 'zustand';
import { getCurrentUser, login, register, logout as logoutApi } from '../api/auth';
import type { UserInfo } from '../api/auth';
import { useStore } from './store';  // 导入 store

interface AuthState {
  user: UserInfo | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log('Attempting to login...');
      const loginResponse = await login(email, password);  // 保存登录响应
      console.log('Login successful, got response:', loginResponse);
      console.log('Getting user info...');
      const user = await getCurrentUser();
      console.log('Got user info:', user);
      // 合并登录响应中的 id
      const userWithId = { ...user, id: loginResponse.id };
      set({ user: userWithId, isAuthenticated: true, error: null });
      console.log('Setting user ID in store:', userWithId.id);
      useStore.getState().setUserId(userWithId.id);
      console.log('Login process complete');
    } catch (error) {
      console.error('Login failed:', error);
      set({ error: error instanceof Error ? error.message : '登录失败' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (username: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      await register(username, email, password);
      set({ error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '注册失败' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    console.log('Logging out...');
    logoutApi();
    set({ user: null, isAuthenticated: false });
    useStore.getState().setUserId(null);
    console.log('Logout complete');
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      console.log('Checking auth status...');
      const user = await getCurrentUser();
      console.log('User is authenticated:', user);
      if (!user.id) {
        console.log('No user ID found in response, cannot proceed');
        throw new Error('No user ID found');
      }
      set({ user, isAuthenticated: true, error: null });
      useStore.getState().setUserId(user.id);
      console.log('Auth check complete, user ID set:', user.id);
    } catch (error) {
      console.log('Auth check failed:', error);
      set({ user: null, isAuthenticated: false });
      useStore.getState().setUserId(null);
    } finally {
      set({ isLoading: false });
    }
  },
})); 