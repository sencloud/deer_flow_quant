// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

'use client';

import { useEffect } from 'react';
import { useAuthStore } from '~/core/store/auth-store';

export function AuthCheck() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    console.log('AuthCheck component mounted, checking auth...');
    checkAuth().catch((error) => {
      console.log('Initial auth check failed:', error);
    });
  }, [checkAuth]);

  return null;
} 