"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Settings, Shield } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  storeId: string;
  createdAt: string;
  updatedAt: string;
  store: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
}

export function UserInfo() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkAuth = async () => {
      try {
        const savedToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth-token='))
          ?.split('=')[1];

        if (savedToken) {
          const response = await fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${savedToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          } else {
            // Token is invalid, remove it
            document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [mounted]);

  const handleLogout = () => {
    setUser(null);
    document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    // Call logout API for cleanup
    fetch("/api/auth/logout", { method: "POST" }).catch(console.error);
    
    // Redirect to login
    router.push('/login');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'MANAGER':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'USER':
        return <User className="h-4 w-4 text-green-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'text-red-600 bg-red-50';
      case 'MANAGER':
        return 'text-blue-600 bg-blue-50';
      case 'USER':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-gray-200 rounded-full h-8 w-8"></div>
        <div className="animate-pulse bg-gray-200 rounded h-4 w-20"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Button 
        onClick={() => router.push('/login')}
        variant="outline"
        size="sm"
      >
        <User className="h-4 w-4 mr-2" />
        Login
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" alt={user.username} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
              {getRoleIcon(user.role)}
              <span className="ml-1">{user.role}</span>
            </div>
            {user.store && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.store.name}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/user-management')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


