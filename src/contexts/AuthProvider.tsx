/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { UserInfo } from '../types';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('gps_token'));
  const [user, setUser] = useState<UserInfo | null>(JSON.parse(localStorage.getItem('gps_user') || 'null'));
  const [isLoading, setIsLoading] = useState(false);

  const login = (newToken: string, newUser: UserInfo) => {
    localStorage.setItem('gps_token', newToken);
    localStorage.setItem('gps_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('gps_token');
    localStorage.removeItem('gps_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
