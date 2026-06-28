import {
  avatarColorFromName,
  initialsFromName,
} from "@/lib/chat/avatar";

export function ChatAvatar({
  name,
  size = "md",
  showOnline,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  showOnline?: boolean;
}) {
  const sizeClass =
    size === "sm"
      ? "h-[30px] w-[30px] text-xs"
      : size === "lg"
        ? "h-12 w-12 text-lg"
        : "h-11 w-11 text-base";

  return (
    <div className="relative shrink-0">
      <div
        className={`flex items-center justify-center rounded-full font-semibold text-white ${sizeClass}`}
        style={{ backgroundColor: avatarColorFromName(name) }}
      >
        {initialsFromName(name)}
      </div>
      {showOnline && (
        <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-[#34B27B]" />
      )}
    </div>
  );
}