"use client";

import {
  Save,
  Play,
  Upload,
  History,
  Download,
  Upload as Import,
  MoreHorizontal,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@repo/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface WorkflowToolbarProps {
  workflowName: string;
  status: "draft" | "published" | "archived";
  version: number;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onPublish: () => void;
  onTest: () => void;
  onExport: () => void;
  onImport: () => void;
  onViewHistory: () => void;
}

export function WorkflowToolbar({
  workflowName,
  status,
  version,
  isSaving,
  hasUnsavedChanges,
  onSave,
  onPublish,
  onTest,
  onExport,
  onImport,
  onViewHistory,
}: WorkflowToolbarProps) {
  const statusColors = {
    draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    published: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">{workflowName}</h1>
        <Badge variant="outline" className={statusColors[status]}>
          {status}
        </Badge>
        <span className="text-sm text-muted-foreground">v{version}</span>
        {hasUnsavedChanges && (
          <span className="text-sm text-amber-600">Unsaved changes</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving || !hasUnsavedChanges}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : hasUnsavedChanges ? (
            <Save className="w-4 h-4 mr-2" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          {isSaving ? "Saving..." : hasUnsavedChanges ? "Save" : "Saved"}
        </Button>

        <Button variant="outline" size="sm" onClick={onTest}>
          <Play className="w-4 h-4 mr-2" />
          Test
        </Button>

        <Button
          size="sm"
          onClick={onPublish}
          disabled={status === "published" || hasUnsavedChanges}
        >
          <Upload className="w-4 h-4 mr-2" />
          Publish
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewHistory}>
              <History className="w-4 h-4 mr-2" />
              Version History
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onImport}>
              <Import className="w-4 h-4 mr-2" />
              Import JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
