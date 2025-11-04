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

  // For all other pages, render with top navbar only (no sidebar)
  return (
    <>
      {/* Main Content Area with Top Navbar */}
      <div className="min-h-screen bg-background">
        {/* Top Navbar */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-6">
              <h1 className="text-lg font-semibold text-foreground">QT Office</h1>
              <nav className="hidden md:flex items-center gap-4 text-sm">
                <a
                  href="/write-checks"
                  aria-current={pathname === "/write-checks" ? "page" : undefined}
                  className={`${pathname === "/write-checks" ? "text-foreground font-medium border-b-2 border-primary" : "text-foreground/80 hover:text-foreground"} transition-colors pb-1`}
                >
                  Write Checks
                </a>
                <a
                  href="/reports"
                  aria-current={pathname === "/reports" ? "page" : undefined}
                  className={`${pathname === "/reports" ? "text-foreground font-medium border-b-2 border-primary" : "text-foreground/80 hover:text-foreground"} transition-colors pb-1`}
                >
                  Reports
                </a>
                <a
                  href="/add-bank"
                  aria-current={pathname === "/add-bank" ? "page" : undefined}
                  className={`${pathname === "/add-bank" ? "text-foreground font-medium border-b-2 border-primary" : "text-foreground/80 hover:text-foreground"} transition-colors pb-1`}
                >
                  Add Bank
                </a>
                <a
                  href="/add-user"
                  aria-current={pathname === "/add-user" ? "page" : undefined}
                  className={`${pathname === "/add-user" ? "text-foreground font-medium border-b-2 border-primary" : "text-foreground/80 hover:text-foreground"} transition-colors pb-1`}
                >
                  Add User
                </a>
                <a
                  href="/add-vendor"
                  aria-current={pathname === "/add-vendor" ? "page" : undefined}
                  className={`${pathname === "/add-vendor" ? "text-foreground font-medium border-b-2 border-primary" : "text-foreground/80 hover:text-foreground"} transition-colors pb-1`}
                >
                  Add Vendors
                </a>
              </nav>
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

