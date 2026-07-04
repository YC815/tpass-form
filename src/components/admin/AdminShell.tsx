import Link from "next/link";
import { LayoutDashboard, Users } from "lucide-react";
import { authConfig } from "@/config/auth";
import { PortalLink } from "@/components/common/PortalLink";

export function AdminShell({
  email,
  superAdmin,
  children,
}: {
  email: string;
  superAdmin: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-50 h-16 bg-background/90 backdrop-blur-md border-b-2 border-foreground/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PortalLink href={authConfig.portalUrl} />
            <Link
              href="/admin"
              className="font-mono text-lg font-extrabold tracking-tight text-foreground"
            >
              T<span className="text-primary">-</span>Form
              <span className="ml-2 rounded-md border-2 border-foreground bg-primary px-1.5 py-0.5 align-middle font-mono text-[10px] font-bold text-primary-foreground">
                ADMIN
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline rounded-md border-2 border-foreground bg-card px-2 py-0.5 font-mono text-[11px] font-bold text-foreground">
              {email}
            </span>
            <form method="post" action={authConfig.logoutUrl}>
              <button
                type="submit"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                登出
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex gap-8">
        <nav className="hidden md:flex w-44 shrink-0 flex-col gap-2">
          <AdminNavLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />}>
            我的問卷
          </AdminNavLink>
          {superAdmin && (
            <AdminNavLink href="/admin/members" icon={<Users className="h-4 w-4" />}>
              成員名單
            </AdminNavLink>
          )}
        </nav>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function AdminNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-xl border-2 border-foreground bg-card px-3 py-2 font-bold text-sm text-foreground shadow-[2px_2px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--color-foreground)]"
    >
      {icon}
      {children}
    </Link>
  );
}
