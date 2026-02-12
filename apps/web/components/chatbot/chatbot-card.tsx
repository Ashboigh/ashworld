"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  MessageSquare,
  Globe,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Settings,
  Users,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface ChatbotData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  personaName: string | null;
  aiModel: string;
  conversationCount: number;
  channelCount: number;
  activeConversations: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatbotCardProps {
  chatbot: ChatbotData;
  orgSlug: string;
  workspaceId: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  archived: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export function ChatbotCard({ chatbot, orgSlug, workspaceId }: ChatbotCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/chatbots/${chatbot.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update chatbot");
      }

      toast.success(`Chatbot ${newStatus === "active" ? "activated" : "paused"}`);
      router.refresh();
    } catch {
      toast.error("Failed to update chatbot status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/chatbots/${chatbot.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete chatbot");
      }

      toast.success("Chatbot deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete chatbot");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const formattedDate = new Date(chatbot.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  <Link
                    href={`/${orgSlug}/chatbots/${chatbot.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {chatbot.name}
                  </Link>
                </CardTitle>
                {chatbot.personaName && (
                  <p className="text-sm text-muted-foreground">
                    {chatbot.personaName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[chatbot.status] || statusColors.draft}>
                {chatbot.status}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/${orgSlug}/chatbots/${chatbot.id}`}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${orgSlug}/chatbots/${chatbot.id}/conversations`}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Conversations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {chatbot.status === "active" ? (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("paused")}
                      disabled={isUpdating}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </DropdownMenuItem>
                  ) : chatbot.status !== "archived" ? (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("active")}
                      disabled={isUpdating}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Activate
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {chatbot.description && (
            <CardDescription className="mt-2 line-clamp-2">
              {chatbot.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{chatbot.conversationCount} conversations</span>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <span>{chatbot.channelCount} channels</span>
            </div>
          </div>
          {chatbot.activeConversations > 0 && (
            <div className="mt-2 flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <Users className="w-4 h-4" />
              <span>{chatbot.activeConversations} active now</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0 text-xs text-muted-foreground">
          <span>Updated {formattedDate}</span>
          <span className="mx-2">·</span>
          <span className="truncate">{chatbot.aiModel}</span>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chatbot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{chatbot.name}&quot;? This will
              permanently delete all conversations and messages. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
