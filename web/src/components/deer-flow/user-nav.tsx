import { User, LogOut } from "lucide-react";
import { useEffect } from "react";
import { useAuthStore } from "~/core/store/auth-store";
import { Button } from "~/components/ui/button";
import { Tooltip } from "./tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface UserNavProps {
  onOpenAuth: () => void;
}

export function UserNav({ onOpenAuth }: UserNavProps) {
  const { user, isAuthenticated, logout, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return (
      <Tooltip title="登录/注册">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-black/5 transition-colors duration-200"
          onClick={onOpenAuth}
        >
          <User className="h-5 w-5" />
        </Button>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip title="个人中心">
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-black/5 transition-colors duration-200"
          >
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            logout();
            onOpenAuth();
          }}
          className="text-red-600 dark:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 