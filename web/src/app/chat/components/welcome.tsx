// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { motion } from "framer-motion";

import { cn } from "~/lib/utils";

export function Welcome({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("flex flex-col", className)}
      style={{ transition: "all 0.2s ease-out" }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <h3 className="mb-2 text-center text-3xl font-light tracking-wider">
        👋 欢迎使用
      </h3>
      <div className="text-muted-foreground px-4 text-center text-lg font-light tracking-wider">
        <span className="text-2xl tracking-[0.2em]">Deep Quant</span>
        <br />
        <p className="mt-4">
          <span className="hidden sm:inline">基于先进人工智能的金融市场分析平台，</span>
          <span className="sm:hidden">探索市场趋势，</span>
          <br />
          <span className="hidden sm:inline">帮助您把握市场动向，</span>
          优化投资决策。
        </p>
      </div>
    </motion.div>
  );
}
