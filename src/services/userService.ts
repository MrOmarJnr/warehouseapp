import { User } from '../types';

const API_BASE = '/api';

export const userService = {
  async createUser(data: Partial<User> & { password?: string }) {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': localStorage.getItem('userId') || ''
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create user');
    }
    const result = await response.json();
    return result.id;
  },

  async login(username: string, password: string) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Invalid username or password');
    }
    const user = await response.json();
    localStorage.setItem('userId', user.id);
    return user as User;
  },

  async getUsers() {
    const response = await fetch(`${API_BASE}/users`, {
      headers: {
        'x-user-id': localStorage.getItem('userId') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return await response.json() as User[];
  },

  async getUser(uid: string) {
    const response = await fetch(`${API_BASE}/users/${uid}`, {
      headers: {
        'x-user-id': localStorage.getItem('userId') || ''
      }
    });
    if (!response.ok) return null;
    return await response.json() as User;
  },

  // Simplified subscription for demo - just poll or return static
  subscribeToUsers(callback: (users: User[]) => void) {
    const interval = setInterval(async () => {
      try {
        const users = await this.getUsers();
        callback(users);
      } catch (err) {
        console.error('User subscription error:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  },

  async resetPassword(userId: string, newPassword: string) {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': localStorage.getItem('userId') || ''
      },
      body: JSON.stringify({ password: newPassword })
    });
    if (!response.ok) throw new Error('Failed to reset password');
  },

  async updateUser(userId: string, data: Partial<User>) {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': localStorage.getItem('userId') || ''
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update user');
  },

  async bootstrapAdmin() {
    // Backend handles bootstrapping
    return false;
  }
};
