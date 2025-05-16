// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { motion } from "framer-motion";
import { FastForward, Play } from "lucide-react";
import { useCallback, useRef, useState } from "react";

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

export function MessagesBlock({ className }: { className?: string }) {
  const messageIds = useMessageIds();
  const messageCount = messageIds.length;
  const responding = useStore((state) => state.responding);
  const { isReplay } = useReplay();
  const { title: replayTitle, hasError: replayHasError } = useReplayMetadata();
  const [replayStarted, setReplayStarted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [feedback, setFeedback] = useState<{ option: Option } | null>(null);
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
          },
          {
            abortSignal: abortController.signal,
          },
        );
      } catch {}
    },
    [feedback],
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
              <div className="flex items-center justify-between">
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
                {!replayHasError && (
                  <div className="pr-2 sm:pr-4">
                    {responding && (
                      <Button
                        className={cn(
                          "text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10",
                          fastForwarding && "animate-pulse"
                        )}
                        variant={fastForwarding ? "default" : "outline"}
                        onClick={handleFastForwardReplay}
                      >
                        <FastForward size={14} className="mr-1 sm:mr-2" />
                        快进
                      </Button>
                    )}
                    {!replayStarted && (
                      <Button 
                        className="w-18 sm:w-24 text-xs sm:text-sm h-8 sm:h-10" 
                        onClick={handleStartReplay}
                      >
                        <Play size={14} className="mr-1 sm:mr-2" />
                        播放
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
            {!replayStarted && env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY && (
              <div className="text-muted-foreground w-full text-center text-xs px-4 mt-2">
                * 本站仅用于演示目的。如果您想尝试自己的问题，请{" "}
                <a
                  className="underline"
                  href="https://github.com/bytedance/deer-flow"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  点击这里
                </a>{" "}
                克隆到本地运行。
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
