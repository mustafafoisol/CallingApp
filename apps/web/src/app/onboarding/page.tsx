import { OnboardingForm } from "./onboarding-form";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Set up your profile</h1>
          <p className="text-sm text-muted">
            Choose a display name. We will generate your unique user ID.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}