// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { useCallback, useMemo, useState } from "react";
import { useStore } from "~/core/store";
import { cn } from "~/lib/utils";
import { MessagesBlock } from "./components/messages-block";
import { ResearchBlock } from "./components/research-block";
import { ChatHistorySidebar } from "./components/chat-history-sidebar";

export default function Main() {
  const openResearchId = useStore((state) => state.openResearchId);
  const doubleColumnMode = useMemo(
    () => openResearchId !== null,
    [openResearchId],
  );
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  
  const handleSelectChat = useCallback((chatId: string) => {
    setSelectedChatId(chatId);
    // TODO: 加载选中的聊天记录
  }, []);
  
  const handleNewChat = useCallback(() => {
    setSelectedChatId(null);
    // TODO: 清空当前聊天记录
  }, []);
  
  return (
    <div className="flex h-[calc(100vh-140px)] sm:h-[calc(100vh-180px)] w-full">
      {/* 聊天历史侧边栏 */}
      <ChatHistorySidebar
        className="hidden sm:flex border-r"
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />
      
      {/* 主要内容区域 */}
      <div className="flex flex-1 justify-center">
        <div
          className={cn(
            "flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 px-2 sm:px-0 pt-2 sm:pt-0 w-full",
            doubleColumnMode ? "gap-4 sm:gap-8" : ""
          )}
        >
          <MessagesBlock
            className={cn(
              "shrink-0 transition-all duration-300 ease-out",
              !doubleColumnMode
                ? "w-full sm:w-[768px] translate-x-0 sm:translate-x-[min(calc((100vw-538px-256px)*0.75/2),960px/2)]"
                : "w-full sm:w-[538px]",
              doubleColumnMode ? "h-[calc(50vh-100px)] sm:h-full" : "h-full"
            )}
            selectedChatId={selectedChatId}
          />
          <ResearchBlock
            className={cn(
              "w-full sm:w-[min(calc((100vw-538px-256px)*0.75),960px)] transition-all duration-300 ease-out",
              !doubleColumnMode ? "h-0 sm:scale-0 overflow-hidden" : "h-[calc(50vh-100px)] sm:h-full",
            )}
            researchId={openResearchId}
          />
        </div>
      </div>
    </div>
  );
}
