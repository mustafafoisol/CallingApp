import Link from "next/link";
import { Home, Settings, UserPlus } from "lucide-react";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/friends/add", label: "Add", icon: UserPlus },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-[var(--chat-sidebar)]">
      {title && (
        <header className="sticky top-0 z-10 border-b border-[var(--chat-border)] bg-[var(--chat-surface)]/95 px-4 py-4 backdrop-blur">
          <h1 className="text-lg font-semibold text-[var(--chat-text)]">
            {title}
          </h1>
        </header>
      )}
      <main className="flex-1 px-4 py-4">{children}</main>
      <nav className="sticky bottom-0 border-t border-[var(--chat-border)] bg-[var(--chat-surface)]/95 px-4 py-3 backdrop-blur">
        <div className="grid grid-cols-3 gap-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs text-[var(--chat-muted)] hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}