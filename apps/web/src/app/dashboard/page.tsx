import { redirect } from "next/navigation";

import { getSession } from "@/server/auth";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-bold text-2xl">Dashboard</h1>
      <p className="text-muted-foreground">
        Signed in as @{session.user.username} ({session.user.name})
      </p>
    </div>
  );
}
