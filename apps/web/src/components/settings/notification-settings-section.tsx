"use client";

import { useEffect, useState } from "react";
import { isNotificationSupported } from "@/lib/notifications/browser-message-notification";
import {
  isBrowserNotificationsEnabled,
  setBrowserNotificationsEnabled,
} from "@/lib/notifications/notification-prefs";
import {
  isMessageSoundEnabled,
  setMessageSoundEnabled,
} from "@/lib/notifications/message-sound-prefs";

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[13px] border border-[#EBE3DD] bg-[#F8F2ED] px-4 py-3">
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-[var(--chat-text)]">
          {label}
        </span>
        <span className="mt-1 block text-[12.5px] text-[#A8998F]">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-[var(--chat-coral)]"
      />
    </label>
  );
}

export function NotificationSettingsSection() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopEnabled, setDesktopEnabled] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [requestingPermission, setRequestingPermission] = useState(false);

  useEffect(() => {
    setSoundEnabled(isMessageSoundEnabled());
    setDesktopEnabled(isBrowserNotificationsEnabled());
    if (isNotificationSupported()) {
      setPermission(Notification.permission);
    }
  }, []);

  function handleSoundToggle(enabled: boolean) {
    setMessageSoundEnabled(enabled);
    setSoundEnabled(enabled);
  }

  function handleDesktopToggle(enabled: boolean) {
    setBrowserNotificationsEnabled(enabled);
    setDesktopEnabled(enabled);
  }

  async function enableDesktopNotifications() {
    if (!isNotificationSupported()) return;

    setRequestingPermission(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        setBrowserNotificationsEnabled(true);
        setDesktopEnabled(true);
      }
    } finally {
      setRequestingPermission(false);
    }
  }

  return (
    <div className="space-y-3 px-6 py-4">
      <div>
        <h3 className="text-[12.5px] font-semibold text-[var(--chat-muted)]">
          Notifications
        </h3>
        <p className="mt-1 text-[12.5px] text-[#A8998F]">
          Control sounds and desktop alerts for new messages.
        </p>
      </div>

      <ToggleRow
        label="Message sounds"
        description="Play a sound when a new message arrives in another chat."
        checked={soundEnabled}
        onChange={handleSoundToggle}
      />

      {!isNotificationSupported() ? (
        <p className="rounded-[13px] border border-[#EBE3DD] bg-[#F8F2ED] px-4 py-3 text-[12.5px] text-[#A8998F]">
          Desktop notifications are not supported in this browser.
        </p>
      ) : permission === "denied" ? (
        <p className="rounded-[13px] border border-[#EBE3DD] bg-[#F8F2ED] px-4 py-3 text-[12.5px] text-[#A8998F]">
          Desktop notifications are blocked. Unblock this site in your browser
          settings. Unread badges will still update in the sidebar.
        </p>
      ) : permission === "default" ? (
        <div className="rounded-[13px] border border-[#EBE3DD] bg-[#F8F2ED] px-4 py-3">
          <p className="text-[14px] font-semibold text-[var(--chat-text)]">
            Desktop notifications
          </p>
          <p className="mt-1 text-[12.5px] text-[#A8998F]">
            Show an OS alert when a new message arrives while this tab is in the
            background.
          </p>
          <button
            type="button"
            onClick={() => void enableDesktopNotifications()}
            disabled={requestingPermission}
            className="mt-3 rounded-[21px] bg-[var(--chat-coral)] px-[18px] py-2.5 text-[13.5px] font-semibold text-white shadow-[0_2px_8px_rgba(242,107,82,0.3)] disabled:opacity-50"
          >
            Enable notifications
          </button>
        </div>
      ) : (
        <ToggleRow
          label="Desktop notifications"
          description="Show an OS alert when this tab is in the background."
          checked={desktopEnabled}
          onChange={handleDesktopToggle}
        />
      )}
    </div>
  );
}