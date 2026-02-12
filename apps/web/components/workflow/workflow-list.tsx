"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitBranch,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Star,
  StarOff,
} from "lucide-react";
import { Button } from "@repo/ui";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatDistanceToNow } from "date-fns";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  triggerType: string;
  isDefault: boolean;
  version: number;
  nodeCount: number;
  edgeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowListProps {
  workflows: Workflow[];
  workspaceId: string;
  orgSlug: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  published: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const triggerLabels: Record<string, string> = {
  conversation_start: "On Start",
  keyword: "Keyword",
  intent: "Intent",
  api: "API",
};

export function WorkflowList({ workflows, workspaceId, orgSlug }: WorkflowListProps) {
  const router = useRouter();
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteWorkflowId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/workflows/${deleteWorkflowId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Workflow deleted");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete workflow");
    } finally {
      setIsDeleting(false);
      setDeleteWorkflowId(null);
    }
  };

  const handleSetDefault = async (workflowId: string, isDefault: boolean) => {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/workflows/${workflowId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDefault: !isDefault }),
        }
      );

      if (!response.ok) throw new Error("Failed to update");

      toast.success(isDefault ? "Removed as default" : "Set as default workflow");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update workflow");
    }
  };

  if (workflows.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No workflows yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first workflow to automate conversations.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <div
            key={workflow.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-background hover:bg-muted/30 transition-colors"
          >
            <Link
              href={`/${orgSlug}/workflows/${workflow.id}`}
              className="flex-1 min-w-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <GitBranch className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{workflow.name}</h3>
                    {workflow.isDefault && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                    <Badge variant="outline" className={statusColors[workflow.status]}>
                      {workflow.status}
                    </Badge>
                    <Badge variant="outline">
                      {triggerLabels[workflow.triggerType] || workflow.triggerType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">v{workflow.version}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {workflow.description || "No description"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {workflow.nodeCount} nodes • {workflow.edgeCount} connections •
                    Updated {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => router.push(`/${orgSlug}/workflows/${workflow.id}`)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSetDefault(workflow.id, workflow.isDefault)}
                >
                  {workflow.isDefault ? (
                    <>
                      <StarOff className="w-4 h-4 mr-2" />
                      Remove Default
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Set as Default
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeleteWorkflowId(workflow.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <AlertDialog
        open={!!deleteWorkflowId}
        onOpenChange={() => setDeleteWorkflowId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workflow? This action cannot be
              undone and will remove all versions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
