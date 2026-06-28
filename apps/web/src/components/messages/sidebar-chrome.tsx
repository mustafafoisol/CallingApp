"use client";

import { Suspense, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AddFriendDialog } from "@/components/friends/add-friend-dialog";

function SidebarChromeInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("addFriend") === "1") {
      setOpen(true);
    }
  }, [searchParams]);

  function closeDialog() {
    setOpen(false);
    if (searchParams.get("addFriend") === "1") {
      router.replace(pathname);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--chat-text)]">
          Messages
        </h1>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--chat-coral)] text-white shadow-[0_2px_8px_rgba(242,107,82,0.35)]"
          aria-label="Add friend"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <AddFriendDialog open={open} onClose={closeDialog} />
    </>
  );
}

export function SidebarChrome() {
  return (
    <Suspense fallback={
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--chat-text)]">
          Messages
        </h1>
        <div className="h-[34px] w-[34px] rounded-full bg-[var(--chat-coral)]/50" />
      </div>
    }>
      <SidebarChromeInner />
    </Suspense>
  );
}