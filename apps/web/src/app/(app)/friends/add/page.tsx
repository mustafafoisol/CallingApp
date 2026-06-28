import { AppShell } from "@/components/app-shell";
import { AddFriendForm } from "./add-friend-form";
import { PendingRequests } from "./pending-requests";

export default function AddFriendPage() {
  return (
    <AppShell title="Add Friend">
      <div className="space-y-6">
        <AddFriendForm />
        <PendingRequests />
      </div>
    </AppShell>
  );
}