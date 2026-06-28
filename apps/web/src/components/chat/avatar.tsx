import {
  avatarColorFromName,
  initialsFromName,
} from "@/lib/chat/avatar";

export function ChatAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "h-[30px] w-[30px] text-xs"
      : size === "lg"
        ? "h-12 w-12 text-lg"
        : "h-11 w-11 text-base";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeClass}`}
      style={{ backgroundColor: avatarColorFromName(name) }}
    >
      {initialsFromName(name)}
    </div>
  );
}