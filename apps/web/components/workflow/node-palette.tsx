"use client";

import { useMemo } from "react";
import {
  Play,
  Bot,
  Search,
  Brain,
  GitBranch,
  Split,
  MessageSquare,
  LayoutGrid,
  FormInput,
  Variable,
  Globe,
  UserCheck,
  Square,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NODE_METADATA,
  NODE_CATEGORIES,
  type NodeType,
  type NodeCategory,
} from "@/lib/workflow";

const iconMap: Record<string, LucideIcon> = {
  Play,
  Bot,
  Search,
  Brain,
  GitBranch,
  Split,
  MessageSquare,
  LayoutGrid,
  FormInput,
  Variable,
  Globe,
  UserCheck,
  Square,
};

const categoryLabels: Record<NodeCategory, string> = {
  [NODE_CATEGORIES.TRIGGERS]: "Triggers",
  [NODE_CATEGORIES.AI_KNOWLEDGE]: "AI & Knowledge",
  [NODE_CATEGORIES.LOGIC]: "Logic",
  [NODE_CATEGORIES.ACTIONS]: "Actions",
  [NODE_CATEGORIES.HANDOFF]: "Handoff",
  [NODE_CATEGORIES.END]: "End",
};

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: NodeType) => void;
}

export function NodePalette({ onDragStart }: NodePaletteProps) {
  const groupedNodes = useMemo(() => {
    const groups: Record<NodeCategory, typeof NODE_METADATA[NodeType][]> = {
      [NODE_CATEGORIES.TRIGGERS]: [],
      [NODE_CATEGORIES.AI_KNOWLEDGE]: [],
      [NODE_CATEGORIES.LOGIC]: [],
      [NODE_CATEGORIES.ACTIONS]: [],
      [NODE_CATEGORIES.HANDOFF]: [],
      [NODE_CATEGORIES.END]: [],
    };

    Object.values(NODE_METADATA).forEach((meta) => {
      groups[meta.category].push(meta);
    });

    return groups;
  }, []);

  return (
    <div className="w-64 border-r bg-muted/30 overflow-y-auto">
      <div className="p-4">
        <h2 className="font-semibold text-sm mb-4">Node Palette</h2>

        {Object.entries(groupedNodes).map(([category, nodes]) => {
          if (nodes.length === 0) return null;

          return (
            <div key={category} className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {categoryLabels[category as NodeCategory]}
              </h3>
              <div className="space-y-1">
                {nodes.map((meta) => {
                  const Icon = iconMap[meta.icon] || Square;

                  return (
                    <div
                      key={meta.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, meta.type)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md cursor-grab",
                        "border bg-background hover:bg-accent transition-colors",
                        "active:cursor-grabbing"
                      )}
                    >
                      <div
                        className="flex items-center justify-center w-6 h-6 rounded"
                        style={{ backgroundColor: meta.color }}
                      >
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{meta.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
