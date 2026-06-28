"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SettingsDialog } from "./settings-dialog";

function SettingsDialogHostInner({
  displayName,
  publicId,
  avatarUrl,
}: {
  displayName: string;
  publicId: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(searchParams.get("settings") === "1");
  }, [searchParams]);

  function closeDialog() {
    setOpen(false);
    if (searchParams.get("settings") === "1") {
      router.replace(pathname);
    }
  }

  return (
    <SettingsDialog
      open={open}
      onClose={closeDialog}
      displayName={displayName}
      publicId={publicId}
      avatarUrl={avatarUrl}
    />
  );
}

export function SettingsDialogHost({
  displayName,
  publicId,
  avatarUrl,
}: {
  displayName: string;
  publicId: string;
  avatarUrl: string | null;
}) {
  return (
    <Suspense fallback={null}>
      <SettingsDialogHostInner
        displayName={displayName}
        publicId={publicId}
        avatarUrl={avatarUrl}
      />
    </Suspense>
  );
}