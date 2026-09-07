/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://trackersystem-fda5.onrender.com';

export function useApi() {
  const { token, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: any
  ) => {
    setLoading(true);
    setError(null);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 401) {
        logout();
        toast.error('Session expired. Please login again.');
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }));
        const errorMessage = errorData.detail || 'Request failed';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (err: any) {
      if (err.message !== 'Unauthorized') {
        setError(err.message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  return {
    get: (endpoint: string) => request(endpoint, 'GET'),
    post: (endpoint: string, body: any) => request(endpoint, 'POST', body),
    patch: (endpoint: string, body: any) => request(endpoint, 'PATCH', body),
    del: (endpoint: string) => request(endpoint, 'DELETE'),
    loading,
    error,
  };
}
