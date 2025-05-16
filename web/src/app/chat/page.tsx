// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useState } from "react";
import { SettingsDialog } from "../settings/dialogs/settings-dialog";
import { AuthDialog } from "../auth/dialogs/auth-dialog";
import { UserNav } from "~/components/deer-flow/user-nav";

const Main = dynamic(() => import("./main"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <p className="text-lg font-light tracking-wider">加载中...</p>
    </div>
  ),
});

export default function ChatPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      {/* 导航栏 */}
      <nav className="fixed top-0 z-50 w-full bg-white/80 px-4 py-4 sm:py-6 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl sm:text-2xl font-light tracking-[0.2em]">🦌 Deep Quant</Link>
          <div className="flex items-center gap-2 sm:gap-6">
            <Suspense>
              <SettingsDialog />
            </Suspense>
            <UserNav onOpenAuth={() => setAuthOpen(true)} />
          </div>
        </div>
      </nav>

      {/* 主要内容区 */}
      <main className="flex flex-1 flex-col pt-14">
        <div className="flex flex-1 overflow-hidden">
          <Main />
        </div>
      </main>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900 py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-8">
          <div className="mb-8 sm:mb-12 text-center text-xl sm:text-2xl font-light tracking-[0.2em] text-white">🦌 Deep Quant</div>
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-12">
            <a href="#" className="text-sm font-light tracking-wider text-gray-400 hover:text-white">关于我们</a>
            <a href="#" className="text-sm font-light tracking-wider text-gray-400 hover:text-white">使用条款</a>
            <a href="#" className="text-sm font-light tracking-wider text-gray-400 hover:text-white">隐私政策</a>
            <a href="#" className="text-sm font-light tracking-wider text-gray-400 hover:text-white">联系我们</a>
          </div>
          <p className="text-center text-sm font-light tracking-wider text-gray-500">
            &copy; {new Date().getFullYear()} Deep Quant. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
