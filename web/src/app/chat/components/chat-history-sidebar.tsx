import { useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { resolveServiceURL } from '~/core/api/resolve-service-url';
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Trash, Plus } from "lucide-react";
import { useStore } from "~/core/store";

interface ChatHistory {
  id: number;           // report id
  thread_id: string;    // chat thread id
  title: string;        // report title
  content: string;      // report content
  created_at: string;   // 创建时间
  updated_at: string;   // 更新时间
  user_id: number;      // 用户ID
}

export function ChatHistorySidebar({
  className,
  onSelectChat,
  onNewChat,
}: {
  className?: string;
  onSelectChat?: (chatId: string) => void;
  onNewChat?: () => void;
}) {
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const userId = useStore(state => state.userId);

  // 加载聊天历史
  const loadChatHistories = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token || !userId) return;
    
    try {
      const response = await fetch(resolveServiceURL(`reports?user_id=${userId}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to load chat histories');
      }
      const data = await response.json();
      setChatHistories(data);
    } catch (error) {
      console.error("Failed to load chat histories:", error);
      toast.error("Failed to load chat histories");
    }
  }, [userId]);

  // 在组件挂载时加载聊天历史
  useEffect(() => {
    loadChatHistories();
  }, [loadChatHistories]);

  // 删除聊天记录
  const handleDeleteChat = async (reportId: number, threadId: string) => {
    const token = localStorage.getItem("auth_token");
    if (!token || !userId) return;
    
    try {
      const response = await fetch(resolveServiceURL(`reports/${reportId}?user_id=${userId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }
      setChatHistories(prev => prev.filter(chat => chat.id !== reportId));
      if (selectedChatId === threadId) {
        setSelectedChatId(null);
      }
      toast.success("Chat deleted successfully");
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast.error("Failed to delete chat");
    }
  };

  const handleSelectChat = (threadId: string) => {
    setSelectedChatId(threadId);
    onSelectChat?.(threadId);
  };

  const handleNewChat = () => {
    setSelectedChatId(null);
    onNewChat?.();
  };

  return (
    <div className={cn("flex flex-col w-64 p-4 mt-14", className)}>
      <Button 
        className="mb-4 w-full"
        onClick={handleNewChat}
      >
        <Plus className="mr-2 h-4 w-4" />
        新对话
      </Button>
      
      <div className="flex flex-col space-y-2">
        {chatHistories.map((chat) => (
          <div
            key={chat.id}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800",
              selectedChatId === chat.thread_id && "bg-gray-100 dark:bg-gray-800"
            )}
            onClick={() => handleSelectChat(chat.thread_id)}
          >
            <div className="flex flex-col flex-1 min-w-0">
              <div className="font-medium truncate">{chat.title || '新对话'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {new Date(chat.updated_at).toLocaleString()}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteChat(chat.id, chat.thread_id);
              }}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
} 