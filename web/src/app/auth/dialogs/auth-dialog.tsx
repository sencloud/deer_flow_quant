// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { useAuthStore } from "~/core/store/auth-store";

export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, isLoading } = useAuthStore();
  
  // 表单引用
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';

    try {
      if (isLogin) {
        await login(email, password);
        toast.success("登录成功");
      } else {
        const username = usernameRef.current?.value || '';
        const confirmPassword = confirmPasswordRef.current?.value || '';
        
        if (password !== confirmPassword) {
          toast.error("两次输入的密码不一致");
          return;
        }
        
        await register(username, email, password);
        toast.success("注册成功，请登录");
        setIsLogin(true);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-900 border border-gray-100 dark:border-gray-800 shadow-2xl">
        <DialogHeader className="relative border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <motion.h2 
            className="text-2xl font-light tracking-wider text-center text-gray-800 dark:text-gray-200"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {isLogin ? "欢迎回来" : "创建账号"}
          </motion.h2>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          {!isLogin && (
            <div className="space-y-2">
              <Label className="text-sm font-light text-gray-700 dark:text-gray-300">用户名</Label>
              <Input
                ref={usernameRef}
                type="text"
                placeholder="your_username"
                className="h-12 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-gray-700 rounded-xl font-light text-gray-900 dark:text-gray-100"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-light text-gray-700 dark:text-gray-300">邮箱</Label>
            <Input
              ref={emailRef}
              type="email"
              placeholder="your@email.com"
              className="h-12 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-gray-700 rounded-xl font-light text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-light text-gray-700 dark:text-gray-300">密码</Label>
            <Input
              ref={passwordRef}
              type="password"
              placeholder="••••••••"
              className="h-12 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-gray-700 rounded-xl font-light text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          {!isLogin && (
            <div className="space-y-2">
              <Label className="text-sm font-light text-gray-700 dark:text-gray-300">确认密码</Label>
              <Input
                ref={confirmPasswordRef}
                type="password"
                placeholder="••••••••"
                className="h-12 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-gray-700 rounded-xl font-light text-gray-900 dark:text-gray-100"
                required
              />
            </div>
          )}
          <motion.div
            className="pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              type="submit"
              className={cn(
                "w-full h-12 rounded-xl font-light tracking-wider transition-all duration-300",
                "bg-black hover:bg-black/90 text-white",
                isLoading && "opacity-70"
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              ) : (
                isLogin ? "登 录" : "注 册"
              )}
            </Button>
          </motion.div>
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-light transition-colors"
            >
              {isLogin ? "还没有账号？点击注册" : "已有账号？点击登录"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 