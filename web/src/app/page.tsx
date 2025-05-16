// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tooltip } from "~/components/deer-flow/tooltip";
import { useState } from "react";
import { AuthDialog } from "./auth/dialogs/auth-dialog";
import { Suspense } from "react";
import { SettingsDialog } from "./settings/dialogs/settings-dialog";
import { ThemeToggle } from "../components/deer-flow/theme-toggle";
import { UserNav } from "~/components/deer-flow/user-nav";

export default function HomePage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      {/* 导航栏 */}
      <nav className="fixed top-0 z-50 w-full bg-white/80 px-4 sm:px-8 py-4 sm:py-6 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl sm:text-2xl font-light tracking-[0.2em]">🦌 Deep Quant</Link>
          <div className="flex items-center gap-2 sm:gap-6">
            <UserNav onOpenAuth={() => setAuthOpen(true)} />
          </div>
        </div>
      </nav>

      {/* 主要内容区 */}
      <main className="flex-1 pt-20 sm:pt-24">
        {/* Hero Section */}
        <section className="relative min-h-[600px] h-screen">
          <div className="absolute inset-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-cover"
            >
              <source src="/videos/market-bg.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/40" />
          </div>
          <div className="container relative mx-auto flex h-full items-center px-4 sm:px-8">
            <div className="max-w-2xl text-white">
              <h1 className="mb-4 sm:mb-6 text-4xl sm:text-7xl font-light tracking-wider">Deep Quant</h1>
              <h2 className="mb-4 sm:mb-8 text-xl sm:text-2xl font-light tracking-widest">预测市场趋势 · 把握投资机会</h2>
              <p className="mb-8 sm:mb-12 text-base sm:text-lg font-light leading-relaxed tracking-wide text-gray-200">
                基于人工智能的金融市场趋势预测分析平台，帮助投资者把握市场动向，优化投资决策。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                <Link 
                  href="/chat"
                  className="text-center border border-white px-8 sm:px-12 py-3 sm:py-4 text-sm font-light tracking-widest transition-colors hover:bg-white hover:text-black"
                >
                  市场分析
                </Link>
                <button className="text-center border border-transparent bg-white px-8 sm:px-12 py-3 sm:py-4 text-sm font-light tracking-widest text-black transition-colors hover:bg-transparent hover:border-white hover:text-white">
                  投资策略
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 sm:py-32">
          <div className="container mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 px-4 sm:px-8">
            <StatsCard 
              title="ACCURACY" 
              value="98%" 
              description="预测准确率"
            />
            <StatsCard 
              title="TRADERS" 
              value="5000+" 
              description="活跃交易者"
            />
            <StatsCard 
              title="SIGNALS" 
              value="200+" 
              description="每日信号"
            />
            <StatsCard 
              title="MARKETS" 
              value="50+" 
              description="覆盖市场"
            />
          </div>
        </section>

        {/* Trending Section */}
        <section className="bg-neutral-50 py-16 sm:py-32">
          <div className="container mx-auto px-4 sm:px-8">
            <h2 className="mb-8 sm:mb-16 text-center text-2xl sm:text-4xl font-light tracking-[0.2em]">MARKET TRENDS</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <TrendCard
                image="https://placehold.co/600x800/f5f5f5/666666.png?text=Technical+Analysis"
                title="TECHNICAL ANALYSIS"
                description="技术分析与趋势预测"
              />
              <TrendCard
                image="https://placehold.co/600x800/f5f5f5/666666.png?text=Fundamental+Analysis"
                title="FUNDAMENTAL ANALYSIS"
                description="基本面分析与研究"
              />
              <TrendCard
                image="https://placehold.co/600x800/f5f5f5/666666.png?text=Quantitative+Trading"
                title="QUANTITATIVE TRADING"
                description="量化交易策略"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-8">
          <div className="mb-8 sm:mb-12 text-center text-xl sm:text-2xl font-light tracking-[0.2em]">🦌 Deep Quant</div>
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-12">
            <a href="#" className="text-sm font-light tracking-wider text-gray-600 hover:text-black">关于我们</a>
            <a href="#" className="text-sm font-light tracking-wider text-gray-600 hover:text-black">使用条款</a>
            <a href="#" className="text-sm font-light tracking-wider text-gray-600 hover:text-black">隐私政策</a>
            <a href="#" className="text-sm font-light tracking-wider text-gray-600 hover:text-black">联系我们</a>
          </div>
          <p className="text-center text-sm font-light tracking-wider text-gray-400">
            &copy; {new Date().getFullYear()} Deep Quant. All rights reserved.
          </p>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}

function StatsCard({ title, value, description }: { 
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="group cursor-pointer text-center">
      <h3 className="mb-3 sm:mb-4 text-xs sm:text-sm font-light tracking-[0.2em] text-gray-400">{title}</h3>
      <p className="mb-2 text-3xl sm:text-5xl font-light tracking-wider transition-transform group-hover:scale-110">{value}</p>
      <p className="text-xs sm:text-sm font-light tracking-wider text-gray-600">{description}</p>
    </div>
  );
}

function TrendCard({ image, title, description }: {
  image: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group cursor-pointer overflow-hidden">
      <div className="relative mb-4 sm:mb-6 aspect-[3/4] overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </div>
      <h3 className="mb-2 text-xs sm:text-sm font-light tracking-[0.2em]">{title}</h3>
      <p className="text-xs sm:text-sm font-light tracking-wider text-gray-600">{description}</p>
    </div>
  );
}
