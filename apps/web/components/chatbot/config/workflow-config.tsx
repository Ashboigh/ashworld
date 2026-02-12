"use client";

import Link from "next/link";
import { Label } from "@repo/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitBranch, ExternalLink } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
}

interface WorkflowConfigProps {
  data: {
    defaultWorkflowId: string;
  };
  onChange: (updates: Partial<WorkflowConfigProps["data"]>) => void;
  workflows: Workflow[];
  disabled?: boolean;
}

export function WorkflowConfig({ data, onChange, workflows, disabled }: WorkflowConfigProps) {
  const selectedWorkflow = workflows.find((w) => w.id === data.defaultWorkflowId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Workflow Settings</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Connect a workflow to define how your chatbot handles conversations
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="defaultWorkflowId">Default Workflow</Label>
          <Select
            value={data.defaultWorkflowId || "none"}
            onValueChange={(value) =>
              onChange({ defaultWorkflowId: value === "none" ? "" : value })
            }
            disabled={disabled}
          >
            <SelectTrigger id="defaultWorkflowId">
              <SelectValue placeholder="Select a workflow" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No workflow (AI-only mode)</SelectItem>
              {workflows.map((workflow) => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            The workflow that will be executed when users send messages
          </p>
        </div>

        {selectedWorkflow && (
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{selectedWorkflow.name}</h4>
                  <Link
                    href={`#`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
                {selectedWorkflow.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedWorkflow.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!data.defaultWorkflowId && (
          <div className="p-4 rounded-lg border border-dashed">
            <div className="text-center">
              <GitBranch className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <h4 className="font-medium mb-1">No workflow selected</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Without a workflow, the chatbot will use AI-only mode and respond
                based on the persona instructions.
              </p>
              {workflows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No published workflows available.{" "}
                  <Link href="#" className="text-primary hover:underline">
                    Create a workflow
                  </Link>{" "}
                  first.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
            How workflows work
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Workflows define the conversation flow using visual nodes</li>
            <li>• They can include AI responses, conditions, and user input capture</li>
            <li>• Only published workflows can be used with chatbots</li>
            <li>• Without a workflow, the chatbot uses free-form AI conversations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
