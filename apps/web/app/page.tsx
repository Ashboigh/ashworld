import Link from "next/link";
import { Button } from "@repo/ui";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Enterprise Chatbot Platform
        </h1>
        <p className="text-muted-foreground text-lg max-w-md">
          Build, deploy, and manage AI-powered chatbots with custom knowledge
          bases and visual workflow builders.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
