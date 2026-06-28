export default function ChatLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--chat-bg)]">
      <div className="flex items-center gap-3 border-b border-[#EBE3DD] px-5 py-3.5">
        <div className="h-9 w-9 animate-pulse rounded-full bg-[#F1E9E3]" />
        <div className="h-4 w-28 animate-pulse rounded bg-[#F1E9E3]" />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-3.5 overflow-hidden px-7 py-5">
        <div className="flex justify-start">
          <div className="h-10 w-48 animate-pulse rounded-[18px] bg-[#F1E9E3]" />
        </div>
        <div className="flex justify-end">
          <div className="h-10 w-56 animate-pulse rounded-[18px] bg-[#F1E9E3]" />
        </div>
        <div className="flex justify-start">
          <div className="h-10 w-40 animate-pulse rounded-[18px] bg-[#F1E9E3]" />
        </div>
      </div>
      <div className="shrink-0 px-5 pb-4 pt-3.5">
        <div className="h-12 animate-pulse rounded-[26px] bg-[#F1E9E3]" />
      </div>
    </div>
  );
}