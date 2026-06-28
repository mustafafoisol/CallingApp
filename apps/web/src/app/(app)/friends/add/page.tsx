import { redirect } from "next/navigation";

export default function AddFriendPage() {
  redirect("/home?addFriend=1");
}