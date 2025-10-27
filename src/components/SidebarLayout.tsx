"use client";

import { usePathname } from "next/navigation";
import { UserInfo } from "@/components/UserInfo";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  // For login page, render without sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // For all other pages, render with sidebar
  return (
    <>
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-gray-900 text-white z-50 overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold">QT Office</h2>
        </div>
        <nav className="p-4 space-y-2">
          <a href="/write-checks" className="flex items-center px-3 py-2 rounded-md transition-colors text-gray-300 hover:text-white hover:bg-gray-700">
            <span className="mr-3">📝</span>
            Write Checks
          </a>
          <a href="/reports" className="flex items-center px-3 py-2 rounded-md transition-colors text-gray-300 hover:text-white hover:bg-gray-700">
            <span className="mr-3">📊</span>
            Reports
          </a>
          <a href="/vendors" className="flex items-center px-3 py-2 rounded-md transition-colors text-gray-300 hover:text-white hover:bg-gray-700">
            <span className="mr-3">👥</span>
            Vendors
          </a>
          <a href="/check-print" className="flex items-center px-3 py-2 rounded-md transition-colors text-gray-300 hover:text-white hover:bg-gray-700">
            <span className="mr-3">🖨️</span>
            Check Print
          </a>
          <a href="/add-bank" className="flex items-center px-3 py-2 rounded-md transition-colors text-gray-300 hover:text-white hover:bg-gray-700">
            <span className="mr-3">🏦</span>
            Add Bank
          </a>
          <a href="/file-management" className="flex items-center px-3 py-2 rounded-md transition-colors text-gray-300 hover:text-white hover:bg-gray-700">
            <span className="mr-3">📁</span>
            File Management
          </a>
          <a href="/user-management" className="flex items-center px-3 py-2 rounded-md transition-colors text-gray-300 hover:text-white hover:bg-gray-700">
            <span className="mr-3">👥</span>
            User Management
          </a>
        </nav>
      </div>
      
      {/* Main Content Area */}
      <div className="ml-64 min-h-screen bg-background">
        {/* Top Navbar */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-foreground">QT Office</h1>
            </div>
            <div className="flex items-center space-x-4">
              <UserInfo />
            </div>
          </div>
        </div>
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </>
  );
}

