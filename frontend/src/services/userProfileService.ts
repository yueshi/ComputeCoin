// 用户信息API服务
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// 简单的logger
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[UserProfileService] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[UserProfileService] ${message}`, ...args)
};

export interface UserProfile {
  id?: number;
  name?: string;
  email?: string;
  bio?: string;
  website?: string;
  location?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    walletAddress: string;
    expiresIn: string;
  };
  error?: string;
}

export interface UserProfileResponse {
  success: boolean;
  data?: UserProfile;
  error?: string;
}

class UserProfileService {
  private token: string | null = null;

  constructor() {
    // 优先从cookie获取token，兼容localStorage
    this.token = this.getTokenFromCookie() || localStorage.getItem('profile_jwt_token');
  }

  /**
   * 从cookie获取token
   */
  private getTokenFromCookie(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth_token') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  /**
   * 设置JWT token (同时设置cookie和localStorage)
   */
  public setToken(token: string): void {
    this.token = token;
    
    // 设置cookie (httpOnly需要后端设置，这里设置前端可访问的cookie)
    const expires = new Date();
    expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000); // 24小时
    document.cookie = `auth_token=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`; 
    
    // 保持localStorage兼容性
    localStorage.setItem('profile_jwt_token', token);
  }

  /**
   * 清除token
   */
  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('profile_jwt_token');
    // 清除cookie
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * 检查token是否过期
   */
  public isTokenExpired(): boolean {
    if (!this.token) return true;
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true;
    }
  }

  /**
   * 自动刷新token
   */
  public async refreshToken(): Promise<boolean> {
    if (!this.token) {
      return false;
    }
    
    // 即使token过期也尝试刷新，后端可能会允许短时间内的刷新
    try {
      // 使用AbortController设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
      
      // 尝试使用当前token获取新的token
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.token) {
          this.setToken(data.data.token);
          logger.info('Token刷新成功');
          return true;
        }
      }
      
      // 刷新失败，清除无效token
      this.clearToken();
      return false;
    } catch (error) {
      logger.error('Token刷新失败:', error);
      // 发生错误时清除可能无效的token
      this.clearToken();
      return false;
    }
  }

  /**
   * 生成登录挑战
   */
  public async getChallenge(walletAddress: string): Promise<{ nonce: string; walletAddress: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/challenge`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ walletAddress }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '获取登录挑战失败');
    }

    return data.data;
  }

  /**
   * 验证签名并获取token
   */
  public async verifySignature(walletAddress: string, signature: string, nonce: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ walletAddress, signature, nonce }),
    });

    const data: AuthResponse = await response.json();

    if (!data.success || !data.data?.token) {
      throw new Error(data.error || '签名验证失败');
    }

    this.setToken(data.data.token);
    return data.data.token;
  }

  /**
   * 获取用户信息
   */
  public async getUserProfile(): Promise<UserProfile> {
    if (!this.token) {
      throw new Error('请先登录');
    }

    // 使用AbortController设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data: UserProfileResponse = await response.json();

      if (!data.success) {
        // 区分用户不存在和其他错误
        if (data.error?.includes('用户不存在') || response.status === 404) {
          throw new Error('用户不存在');
        }
        throw new Error(data.error || '获取用户信息失败');
      }

      if (!data.data) {
        throw new Error('用户信息为空');
      }

      return data.data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('获取用户信息超时，请检查网络连接');
      }
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  public async updateUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    if (!this.token) {
      throw new Error('请先登录');
    }

    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(profileData),
    });

    const data: UserProfileResponse = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || '更新用户信息失败');
    }

    return data.data;
  }

  /**
   * 删除用户信息
   */
  public async deleteUserProfile(): Promise<void> {
    if (!this.token) {
      throw new Error('请先登录');
    }

    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '删除用户信息失败');
    }

    this.clearToken();
  }

  /**
   * 检查是否已登录
   */
  public isLoggedIn(): boolean {
    return !!this.token && !this.isTokenExpired();
  }

  /**
   * 自动加载用户信息（钱包连接后调用）
   */
  public async autoLoadUserProfile(address: string): Promise<UserProfile | null> {
    try {
      // 如果已经登录且有有效token，直接加载用户信息
      if (this.isLoggedIn()) {
        return await this.getUserProfile();
      }
      
      // 如果没有token但token已过期，尝试刷新
      if (this.token && this.isTokenExpired()) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return await this.getUserProfile();
        }
      }
      
      // 如果仍然没有有效token，尝试静默登录（如果可能）
      // 这里返回null，让前端通过其他方式处理
      return null;
    } catch (error) {
      // 用户不存在是正常情况，不应该记录为错误
      if (error instanceof Error && error.message.includes('用户不存在')) {
        logger.info('用户尚未注册，这是正常情况');
        return null;
      }
      // 其他错误才记录为错误
      logger.error('自动加载用户信息失败:', error);
      return null;
    }
  }

  /**
   * 静默登录（钱包连接后自动尝试登录）
   */
  public async silentLogin(address: string): Promise<boolean> {
    try {
      // 如果已经登录，直接返回成功
      if (this.isLoggedIn()) {
        return true;
      }
      
      // 如果有token但过期，尝试刷新
      if (this.token && this.isTokenExpired()) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // 刷新成功，验证是否真的可以登录
          return this.isLoggedIn();
        } else {
          // 刷新失败，清除过期token
          this.clearToken();
          return false;
        }
      }
      
      // 没有token或token无效
      return false;
    } catch (error) {
      logger.error('静默登录失败:', error);
      // 发生错误时清除可能无效的token
      this.clearToken();
      return false;
    }
  }

  /**
   * 检查用户是否存在（无需认证）
   * @returns Promise<{exists: boolean, hasProfile: boolean, profile?: UserProfile}>
   */
  public async checkUserExists(address: string): Promise<{exists: boolean, hasProfile: boolean, profile?: UserProfile}> {
    try {
      console.log('[UserProfileService] checkUserExists called with address:', address);
      
      // 确保地址格式正确 - 使用校验和正确的地址格式
      let normalizedAddress;
      try {
        // 尝试多种方式来规范化地址
        if (typeof window !== 'undefined' && window.viem && window.viem.getAddress) {
          // 使用 viem 的 getAddress 函数
          normalizedAddress = window.viem.getAddress(address).toLowerCase();
        } else if (typeof window !== 'undefined' && window.ethers && window.ethers.getAddress) {
          // 使用 ethers 的 getAddress 函数
          normalizedAddress = window.ethers.getAddress(address).toLowerCase();
        } else {
          // 备用方案：先验证基本格式，再转换为小写
          if (!address.startsWith('0x') || address.length !== 42) {
            throw new Error('Invalid address format');
          }
          normalizedAddress = address.toLowerCase();
          console.warn('[UserProfileService] Using simple lowercase conversion - may have checksum issues');
        }
      } catch (error) {
        console.error('[UserProfileService] Address normalization failed:', error);
        throw new Error(`Invalid wallet address format: ${address}`);
      }
      
      console.log('[UserProfileService] normalizedAddress:', normalizedAddress);
      
      // 使用AbortController设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
      
      const url = `${API_BASE_URL}/users/exists/${normalizedAddress}`;
      console.log('[UserProfileService] fetching URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      console.log('[UserProfileService] response status:', response.status);
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (data.success && data.data) {
        return {
          exists: data.data.exists,
          hasProfile: data.data.hasProfile,
          profile: data.data.profile || undefined
        };
      }
      return { exists: false, hasProfile: false };
    } catch (error) {
      logger.error('检查用户存在失败:', error);
      // 网络错误或超时都返回false
      return { exists: false, hasProfile: false };
    }
  }

  /**
   * 登出
   */
  public logout(): void {
    this.clearToken();
  }
}

// React Hook for user profile
import { useState, useEffect, useCallback } from 'react';

// 创建单例实例
export const userProfileService = new UserProfileService();

export const useUserProfile = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!userProfileService.isLoggedIn()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const profile = await userProfileService.getUserProfile();
      setUserProfile(profile);
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载用户信息失败');
      // 如果是认证错误，清除token
      if (err.message.includes('token') || err.message.includes('认证')) {
        userProfileService.clearToken();
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 自动加载用户信息（钱包连接后调用）
  const autoLoadProfile = useCallback(async (address: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const profile = await userProfileService.autoLoadUserProfile(address);
      if (profile) {
        setUserProfile(profile);
        setIsInitialized(true);
      } else {
        // 如果无法加载用户信息，清除可能过期的状态
        setUserProfile(null);
        setIsInitialized(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '自动加载用户信息失败');
      // 发生错误时清除用户状态
      setUserProfile(null);
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 检查用户是否存在
  const checkUserExists = useCallback(async (address: string) => {
    try {
      return await userProfileService.checkUserExists(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : '检查用户存在失败');
      return false;
    }
  }, []);

  // 静默登录
  const silentLogin = useCallback(async (address: string) => {
    try {
      const result = await userProfileService.silentLogin(address);
      if (!result) {
        // 静默登录失败时清除用户状态
        setUserProfile(null);
        setIsInitialized(false);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '静默登录失败');
      // 发生错误时清除用户状态
      setUserProfile(null);
      setIsInitialized(false);
      return false;
    }
  }, []);

  const updateProfile = async (profileData) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedProfile = await userProfileService.updateUserProfile(profileData);
      setUserProfile(updatedProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新用户信息失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (walletAddress, signature, nonce) => {
    setIsLoading(true);
    setError(null);

    try {
      await userProfileService.verifySignature(walletAddress, signature, nonce);
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    userProfileService.logout();
    setUserProfile(null);
    setError(null);
  };

  return {
    userProfile,
    isLoading,
    error,
    isInitialized,
    loadProfile,
    autoLoadProfile,
    checkUserExists,
    silentLogin,
    updateProfile,
    login,
    logout,
    isLoggedIn: userProfileService.isLoggedIn(),
  };
};

