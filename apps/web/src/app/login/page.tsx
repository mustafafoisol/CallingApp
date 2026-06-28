import { MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LoginButton } from "./login-button";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <MessageCircle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">CallingApp</h1>
          <p className="text-sm text-muted">
            Free 1-on-1 chat. Sign in to get your unique ID.
          </p>
        </div>
        <LoginButton />
        <p className="text-xs text-muted">
          By continuing you agree to use Google sign-in for authentication.
        </p>
      </Card>
    </div>
  );
}