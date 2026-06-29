let endActiveCall: (() => void) | null = null;

export function registerActiveCallEnder(fn: () => void): () => void {
  endActiveCall = fn;
  return () => {
    if (endActiveCall === fn) endActiveCall = null;
  };
}

export function endActiveCallOnSessionReplaced(): void {
  endActiveCall?.();
}