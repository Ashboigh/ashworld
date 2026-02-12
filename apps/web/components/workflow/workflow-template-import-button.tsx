"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { Loader2 } from "lucide-react";

interface WorkflowTemplateImportButtonProps {
  workspaceId: string;
}

export function WorkflowTemplateImportButton({
  workspaceId,
}: WorkflowTemplateImportButtonProps) {
  const [isImporting, setIsImporting] = useState(false);
  const router = useRouter();

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/workflows/import-templates`,
        { method: "POST" }
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to import templates");
      }

      const created = payload.created?.length ?? 0;
      const skipped = payload.skipped?.length ?? 0;

      toast.success(
        `Imported ${created} Amalena workflow${created === 1 ? "" : "s"}${
          skipped > 0 ? ` · ${skipped} already present` : ""
        }`
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Import failed"
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Button onClick={handleImport} disabled={isImporting}>
      {isImporting && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
      )}
      Load Amalena samples
    </Button>
  );
}
