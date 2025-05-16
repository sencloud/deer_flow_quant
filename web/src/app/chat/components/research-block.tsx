// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { Check, Copy, Headphones, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ScrollContainer } from "~/components/deer-flow/scroll-container";
import { Tooltip } from "~/components/deer-flow/tooltip";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useReplay } from "~/core/replay";
import { closeResearch, listenToPodcast, useStore } from "~/core/store";
import { cn } from "~/lib/utils";

import { ResearchActivitiesBlock } from "./research-activities-block";
import { ResearchReportBlock } from "./research-report-block";

export function ResearchBlock({
  className,
  researchId = null,
}: {
  className?: string;
  researchId: string | null;
}) {
  const reportId = useStore((state) =>
    researchId ? state.researchReportIds.get(researchId) : undefined,
  );
  const [activeTab, setActiveTab] = useState("activities");
  const hasReport = useStore((state) =>
    researchId ? state.researchReportIds.has(researchId) : false,
  );
  const reportStreaming = useStore((state) =>
    reportId ? (state.messages.get(reportId)?.isStreaming ?? false) : false,
  );
  const { isReplay } = useReplay();
  useEffect(() => {
    if (hasReport) {
      setActiveTab("report");
    }
  }, [hasReport]);

  const handleGeneratePodcast = useCallback(async () => {
    if (!researchId) {
      return;
    }
    await listenToPodcast(researchId);
  }, [researchId]);

  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    if (!reportId) {
      return;
    }
    const report = useStore.getState().messages.get(reportId);
    if (!report) {
      return;
    }
    void navigator.clipboard.writeText(report.content);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  }, [reportId]);

  // When the research id changes, set the active tab to activities
  useEffect(() => {
    if (!hasReport) {
      setActiveTab("activities");
    }
  }, [hasReport, researchId]);

  return (
    <div className={cn("h-full w-full overflow-hidden", className)}>
      <Card className={cn("relative h-full w-full pt-4 flex flex-col", className)}>
        <div className="absolute right-2 sm:right-4 flex h-9 items-center justify-center gap-1 sm:gap-2">
          {hasReport && !reportStreaming && (
            <>
              <Tooltip title="生成播客">
                <Button
                  className="text-gray-400"
                  size="icon"
                  variant="ghost"
                  disabled={isReplay}
                  onClick={handleGeneratePodcast}
                >
                  <Headphones className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Tooltip>
              <Tooltip title="复制">
                <Button
                  className="text-gray-400"
                  size="icon"
                  variant="ghost"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : <Copy className="h-4 w-4 sm:h-5 sm:w-5" />}
                </Button>
              </Tooltip>
            </>
          )}
          <Tooltip title="关闭">
            <Button
              className="text-gray-400"
              size="sm"
              variant="ghost"
              onClick={() => {
                closeResearch();
              }}
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Tooltip>
        </div>
        <Tabs
          className="flex h-full w-full flex-col overflow-hidden"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value)}
        >
          <div className="flex w-full justify-center mb-2">
            <TabsList className="h-8 sm:h-10">
              <TabsTrigger
                className="px-4 sm:px-8 text-sm sm:text-base"
                value="report"
                disabled={!hasReport}
              >
                研报
              </TabsTrigger>
              <TabsTrigger className="px-4 sm:px-8 text-sm sm:text-base" value="activities">
                分析过程
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent
            className="flex-1 min-h-0 px-5 overflow-hidden"
            value="report"
            forceMount
            hidden={activeTab !== "report"}
          >
            <ScrollContainer
              className="h-full pb-20"
              scrollShadowColor="var(--card)"
              autoScrollToBottom={!hasReport || reportStreaming}
            >
              {reportId && researchId && (
                <ResearchReportBlock
                  className="mt-4"
                  researchId={researchId}
                  messageId={reportId}
                />
              )}
            </ScrollContainer>
          </TabsContent>
          <TabsContent
            className="flex-1 min-h-0 px-5 overflow-hidden"
            value="activities"
            forceMount
            hidden={activeTab !== "activities"}
          >
            <ScrollContainer
              className="h-full pb-20"
              scrollShadowColor="var(--card)"
              autoScrollToBottom={!hasReport || reportStreaming}
            >
              {researchId && (
                <ResearchActivitiesBlock
                  className="mt-4"
                  researchId={researchId}
                />
              )}
            </ScrollContainer>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
