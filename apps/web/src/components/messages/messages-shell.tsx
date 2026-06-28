import { cn } from "@/lib/utils";
import { ContactsSidebar } from "./contacts-sidebar";

export function MessagesShell({
  activeConversationId,
  children,
}: {
  activeConversationId?: string | null;
  children: React.ReactNode;
}) {
  const chatOpen = !!activeConversationId;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[1200px] flex-col bg-white lg:my-0 lg:h-dvh">
      <div className="flex min-h-0 flex-1 overflow-hidden lg:rounded-none lg:border-0">
        <aside
          className={cn(
            "flex w-full shrink-0 flex-col border-r border-[var(--chat-border)] lg:w-[340px]",
            chatOpen ? "hidden lg:flex" : "flex",
          )}
        >
          <ContactsSidebar activeConversationId={activeConversationId} />
        </aside>

        <main
          className={cn(
            "flex min-w-0 flex-1 flex-col bg-[var(--chat-bg)]",
            chatOpen ? "flex" : "hidden lg:flex",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}