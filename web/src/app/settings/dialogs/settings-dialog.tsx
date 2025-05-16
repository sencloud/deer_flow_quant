// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Tooltip } from "~/components/deer-flow/tooltip";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Tabs, TabsContent } from "~/components/ui/tabs";
import { useReplay } from "~/core/replay";
import {
  type SettingsState,
  changeSettings,
  saveSettings,
  useSettingsStore,
} from "~/core/store";
import { cn } from "~/lib/utils";

import { SETTINGS_TABS } from "../tabs";

export function SettingsDialog() {
  const { isReplay } = useReplay();
  const [activeTabId, setActiveTabId] = useState(SETTINGS_TABS[0]!.id);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(useSettingsStore.getState());
  const [changes, setChanges] = useState<Partial<SettingsState>>({});

  const handleTabChange = useCallback(
    (newChanges: Partial<SettingsState>) => {
      setTimeout(() => {
        if (open) {
          setChanges((prev) => ({
            ...prev,
            ...newChanges,
          }));
        }
      }, 0);
    },
    [open],
  );

  const handleSave = useCallback(() => {
    if (Object.keys(changes).length > 0) {
      const newSettings: SettingsState = {
        ...settings,
        ...changes,
      };
      setSettings(newSettings);
      setChanges({});
      changeSettings(newSettings);
      saveSettings();
    }
    setOpen(false);
  }, [settings, changes]);

  const handleOpen = useCallback(() => {
    setSettings(useSettingsStore.getState());
  }, []);

  const handleClose = useCallback(() => {
    setChanges({});
  }, []);

  useEffect(() => {
    if (open) {
      handleOpen();
    } else {
      handleClose();
    }
  }, [open, handleOpen, handleClose]);

  const mergedSettings = useMemo<SettingsState>(() => {
    return {
      ...settings,
      ...changes,
    };
  }, [settings, changes]);

  if (isReplay) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={true}>
      <Tooltip title="设置">
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings />
          </Button>
        </DialogTrigger>
      </Tooltip>
      <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-[99999] sm:max-w-[850px] sm:max-h-[90vh] overflow-hidden bg-white dark:bg-zinc-950 border shadow-lg rounded-lg">
        <DialogHeader>
          <DialogTitle>系统设置</DialogTitle>
          <DialogDescription>
            在这里管理您的系统设置
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTabId}>
          <div className="flex h-[500px] w-full overflow-hidden border-y">
            <ul className="flex w-[200px] shrink-0 border-r p-2 overflow-y-auto">
              <div className="w-full">
                {SETTINGS_TABS.map((tab) => (
                  <li
                    key={tab.id}
                    className={cn(
                      "hover:accent-foreground hover:bg-accent mb-2 flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-3",
                      activeTabId === tab.id &&
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    )}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <tab.icon size={18} />
                    <span className="text-sm">{tab.label}</span>
                    {tab.badge && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-muted-foreground text-muted-foreground ml-auto px-1.5 py-0.5 text-xs",
                          activeTabId === tab.id &&
                            "border-primary-foreground text-primary-foreground",
                        )}
                      >
                        {tab.badge}
                      </Badge>
                    )}
                  </li>
                ))}
              </div>
            </ul>
            <div className="min-w-0 flex-grow">
              <div
                id="settings-content-scrollable"
                className="h-full w-full overflow-y-auto p-6"
              >
                {SETTINGS_TABS.map((tab) => (
                  <TabsContent key={tab.id} value={tab.id} className="mt-0">
                    <tab.component
                      settings={mergedSettings}
                      onChange={handleTabChange}
                    />
                  </TabsContent>
                ))}
              </div>
            </div>
          </div>
        </Tabs>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button className="w-24" type="submit" onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
