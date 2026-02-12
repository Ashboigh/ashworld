"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Database } from "lucide-react";
import { Button, Input, Label } from "@repo/ui";
import {
  createKnowledgeBaseSchema,
  type CreateKnowledgeBaseInput,
} from "@/lib/validations/knowledge-base";

interface CreateKBDialogProps {
  workspaceId: string;
}

export function CreateKBDialog({ workspaceId }: CreateKBDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateKnowledgeBaseInput>({
    resolver: zodResolver(createKnowledgeBaseSchema),
    defaultValues: {
      embeddingModel: "text-embedding-3-small",
      chunkSize: 1000,
      chunkOverlap: 200,
    },
  });

  const onSubmit = async (data: CreateKnowledgeBaseInput) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/knowledge-bases`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to create knowledge base");
        return;
      }

      toast.success("Knowledge base created");
      reset();
      setIsOpen(false);
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Create Knowledge Base
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Create Knowledge Base</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Product Documentation"
                  disabled={isLoading}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="description"
                  placeholder="Documentation and FAQs for our product"
                  disabled={isLoading}
                  {...register("description")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="embeddingModel">Embedding Model</Label>
                <select
                  id="embeddingModel"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  disabled={isLoading}
                  {...register("embeddingModel")}
                >
                  <option value="text-embedding-3-small">
                    text-embedding-3-small (Recommended)
                  </option>
                  <option value="text-embedding-3-large">
                    text-embedding-3-large (Higher quality)
                  </option>
                  <option value="text-embedding-ada-002">
                    text-embedding-ada-002 (Legacy)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chunkSize">Chunk Size</Label>
                  <Input
                    id="chunkSize"
                    type="number"
                    disabled={isLoading}
                    {...register("chunkSize", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
                  <Input
                    id="chunkOverlap"
                    type="number"
                    disabled={isLoading}
                    {...register("chunkOverlap", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
