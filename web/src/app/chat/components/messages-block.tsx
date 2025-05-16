// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { motion } from "framer-motion";
import { FastForward, Play } from "lucide-react";
import { useCallback, useRef, useState, useEffect } from "react";
import { toast } from 'sonner';
import { resolveServiceURL } from '~/core/api/resolve-service-url';
import { nanoid } from 'nanoid';

import { RainbowText } from "~/components/deer-flow/rainbow-text";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { fastForwardReplay } from "~/core/api";
import { useReplayMetadata } from "~/core/api/hooks";
import type { Option } from "~/core/messages";
import { useReplay } from "~/core/replay";
import { sendMessage, useMessageIds, useStore } from "~/core/store";
import { env } from "~/env";
import { cn } from "~/lib/utils";

import { ConversationStarter } from "./conversation-starter";
import { InputBox } from "./input-box";
import { MessageListView } from "./message-list-view";
import { Welcome } from "./welcome";

export function MessagesBlock({
  className,
  selectedChatId,
}: {
  className?: string;
  selectedChatId?: string | null;
}) {
  const messageIds = useMessageIds();
  const messageCount = messageIds.length;
  const responding = useStore((state) => state.responding);
  const { isReplay } = useReplay();
  const { title: replayTitle, hasError: replayHasError } = useReplayMetadata();
  const [replayStarted, setReplayStarted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [feedback, setFeedback] = useState<{ option: Option } | null>(null);

  // 加载选中的聊天记录
  useEffect(() => {
    if (selectedChatId) {
      const loadSelectedChat = async () => {
        const token = localStorage.getItem("auth_token");
        const userId = useStore.getState().userId;
        if (!token || !userId) return;
        
        try {
          const response = await fetch(resolveServiceURL(`reports/thread/${selectedChatId}?user_id=${userId}`), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            throw new Error('Failed to load chat history');
          }
          const report = await response.json();
          console.log('Received report:', report); // 添加日志
          
          // 转换消息格式
          if (report.messages && Array.isArray(report.messages)) {
            const formattedMessages = report.messages.map((msg: any) => ({
              id: msg.id || nanoid(), // 确保每条消息都有唯一ID
              threadId: selectedChatId,
              role: msg.role || 'assistant', // 如果没有role字段，默认为assistant
              agent: msg.agent || 'assistant', // 添加agent字段
              content: msg.content || '',
              contentChunks: [msg.content || ''],
              isStreaming: false,
              created_at: msg.created_at,
              finishReason: msg.finish_reason || null,
              toolCalls: msg.tool_calls || [],
              toolCallResults: msg.tool_call_results || []
            }));
            
            console.log('Formatted messages:', formattedMessages); // 添加日志
            
            // 清除现有消息
            useStore.setState({ messageIds: [], messages: new Map() });
            // 更新新消息
            useStore.getState().updateMessages(formattedMessages);
          }
        } catch (error) {
          console.error("Failed to load chat history:", error);
          toast.error("Failed to load chat history");
        }
      };
      loadSelectedChat();
    } else {
      // 如果没有选中的聊天，清空消息
      useStore.setState({ messageIds: [], messages: new Map() });
    }
  }, [selectedChatId]);

  const handleSend = useCallback(
    async (message: string, options?: { interruptFeedback?: string }) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      try {
        await sendMessage(
          message,
          {
            interruptFeedback:
              options?.interruptFeedback ?? feedback?.option.value,
            chatId: selectedChatId,  // 添加聊天ID
          },
          {
            abortSignal: abortController.signal,
          },
        );
      } catch {}
    },
    [feedback, selectedChatId],
  );

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const handleFeedback = useCallback(
    (feedback: { option: Option }) => {
      setFeedback(feedback);
    },
    [setFeedback],
  );

  const handleRemoveFeedback = useCallback(() => {
    setFeedback(null);
  }, [setFeedback]);

  const handleStartReplay = useCallback(() => {
    setReplayStarted(true);
    void sendMessage();
  }, [setReplayStarted]);

  const [fastForwarding, setFastForwarding] = useState(false);
  const handleFastForwardReplay = useCallback(() => {
    setFastForwarding(!fastForwarding);
    fastForwardReplay(!fastForwarding);
  }, [fastForwarding]);

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      <MessageListView
        className="flex-1 overflow-y-auto px-1 sm:px-0"
        onFeedback={handleFeedback}
        onSendMessage={handleSend}
      />
      {!isReplay ? (
        <div className="relative flex h-32 sm:h-42 shrink-0 pb-2 sm:pb-4">
          {!responding && messageCount === 0 && (
            <ConversationStarter
              className="absolute top-[-160px] sm:top-[-218px] left-0 w-full px-2 sm:px-0"
              onSend={handleSend}
            />
          )}
          <InputBox
            className="h-full w-full"
            responding={responding}
            feedback={feedback}
            onSend={handleSend}
            onCancel={handleCancel}
            onRemoveFeedback={handleRemoveFeedback}
          />
        </div>
      ) : (
        <>
          <div
            className={cn(
              "fixed bottom-[calc(50vh+50px)] sm:bottom-[calc(50vh+80px)] left-0 transition-all duration-500 ease-out px-2 sm:px-0",
              replayStarted && "pointer-events-none scale-150 opacity-0",
            )}
          >
            <Welcome />
          </div>
          <motion.div
            className="mb-2 sm:mb-4 h-fit w-full items-center justify-center px-2 sm:px-0"
            initial={{ opacity: 0, y: "20vh" }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card
              className={cn(
                "w-full transition-all duration-300",
                !replayStarted && "translate-y-[-40vh]",
              )}
            >
              <div className="flex-grow">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">
                    <RainbowText animated={responding}>
                      {responding ? "正在回放" : `${replayTitle}`}
                    </RainbowText>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    <RainbowText animated={responding}>
                      {responding
                        ? "Deep Quant 正在回放对话..."
                        : replayStarted
                          ? "回放已停止。"
                          : `您现在处于回放模式。点击右侧"播放"按钮开始。`}
                    </RainbowText>
                  </CardDescription>
                </CardHeader>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 sm:p-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleFastForwardReplay}
                >
                  <FastForward size={16} />
                  {fastForwarding ? "正常速度" : "快进"}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={handleStartReplay}
                  disabled={replayStarted}
                >
                  <Play size={16} />
                  播放
                </Button>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}
