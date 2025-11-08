import { redirect } from "next/navigation";
import ClientProfilePage from "./client-profile-page";

export default async function ProfilePage(props: PageProps<"/profile/[userId]">) {
  const { userId } = await props.params;

  if (!userId) {
    redirect("/signin");
    return;
  }

  return <ClientProfilePage userId={userId} />;
}
