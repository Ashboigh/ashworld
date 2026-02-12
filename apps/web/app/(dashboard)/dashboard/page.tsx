import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata = {
  title: "Dashboard - Enterprise Chatbot Platform",
  description: "Manage your chatbots",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name || session?.user?.email}
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Chatbots</CardTitle>
            <CardDescription>Manage your AI chatbots</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Active chatbots</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>Recent chat activity</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Knowledge Bases</CardTitle>
            <CardDescription>Your data sources</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Connected sources</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Set up your first chatbot in a few steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Create a knowledge base and upload your documents</li>
            <li>Create a new chatbot and configure its settings</li>
            <li>Build a workflow using the visual builder</li>
            <li>Deploy your chatbot to your website or app</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
