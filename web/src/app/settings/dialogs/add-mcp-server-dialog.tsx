// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

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
import { Textarea } from "~/components/ui/textarea";
import { queryMCPServerMetadata } from "~/core/api";
import {
  MCPConfigSchema,
  type MCPServerMetadata,
  type SimpleMCPServerMetadata,
  type SimpleSSEMCPServerMetadata,
  type SimpleStdioMCPServerMetadata,
} from "~/core/mcp";

export function AddMCPServerDialog({
  onAdd,
}: {
  onAdd?: (servers: MCPServerMetadata[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>("");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const handleChange = useCallback((value: string) => {
    setInput(value);
    if (!value.trim()) {
      setValidationError(null);
      return;
    }
    setValidationError(null);
    try {
      const parsed = JSON.parse(value);
      if (!("mcpServers" in parsed)) {
        setValidationError("缺少 `mcpServers` 字段");
        return;
      }
    } catch {
      setValidationError("无效的 JSON 格式");
      return;
    }
    const result = MCPConfigSchema.safeParse(JSON.parse(value));
    if (!result.success) {
      if (result.error.errors[0]) {
        const error = result.error.errors[0];
        if (error.code === "invalid_union") {
          if (error.unionErrors[0]?.errors[0]) {
            setValidationError(error.unionErrors[0].errors[0].message);
            return;
          }
        }
      }
      const errorMessage =
        result.error.errors[0]?.message ?? "验证失败";
      setValidationError(errorMessage);
      return;
    }

    const keys = Object.keys(result.data.mcpServers);
    if (keys.length === 0) {
      setValidationError("在 `mcpServers` 中缺少服务器名称");
      return;
    }
  }, []);
  const handleAdd = useCallback(async () => {
    const config = MCPConfigSchema.parse(JSON.parse(input));
    setInput(JSON.stringify(config, null, 2));
    const addingServers: SimpleMCPServerMetadata[] = [];
    for (const [key, server] of Object.entries(config.mcpServers)) {
      if ("command" in server) {
        const metadata: SimpleStdioMCPServerMetadata = {
          transport: "stdio",
          name: key,
          command: server.command,
          args: server.args,
          env: server.env,
        };
        addingServers.push(metadata);
      } else if ("url" in server) {
        const metadata: SimpleSSEMCPServerMetadata = {
          transport: "sse",
          name: key,
          url: server.url,
        };
        addingServers.push(metadata);
      }
    }
    setProcessing(true);

    const results: MCPServerMetadata[] = [];
    let processingServer: string | null = null;
    try {
      setError(null);
      for (const server of addingServers) {
        processingServer = server.name;
        const metadata = await queryMCPServerMetadata(server);
        results.push({ ...metadata, name: server.name, enabled: true });
      }
      if (results.length > 0) {
        onAdd?.(results);
      }
      setInput("");
      setOpen(false);
    } catch (e) {
      console.error(e);
      setError(`添加服务器失败: ${processingServer}`);
    } finally {
      setProcessing(false);
    }
  }, [input, onAdd]);

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={true}>
      <DialogTrigger asChild>
        <Button size="sm">添加服务器</Button>
      </DialogTrigger>
      <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-[99999] sm:max-w-[560px] sm:max-h-[90vh] overflow-hidden bg-white dark:bg-zinc-950 border shadow-lg rounded-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle>添加新的 MCP 服务器</DialogTitle>
          <DialogDescription>
            DeerFlow 使用标准的 JSON MCP 配置来创建新服务器。
            <br />
            在下方粘贴你的配置，然后点击"添加"来添加新服务器。
          </DialogDescription>
        </DialogHeader>

        <main className="my-4">
          <Textarea
            className="h-[360px] font-mono text-sm"
            placeholder={
              '示例:\n\n{\n  "mcpServers": {\n    "我的服务器": {\n      "command": "python",\n      "args": [\n        "-m", "mcp_server"\n      ],\n      "env": {\n        "API_KEY": "你的API密钥"\n      }\n    }\n  }\n}'
            }
            value={input}
            onChange={(e) => handleChange(e.target.value)}
          />
        </main>

        <DialogFooter>
          <div className="flex h-10 w-full items-center justify-between gap-2">
            <div className="text-destructive flex-grow overflow-hidden text-sm">
              {validationError ?? error}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button
                className="w-24"
                type="submit"
                disabled={!input.trim() || !!validationError || processing}
                onClick={handleAdd}
              >
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                添加
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
