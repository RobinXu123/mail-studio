"use client";

import type { EditorNode } from "@/features/editor/types";

interface EditableDividerProps {
  node: EditorNode;
}

export function EditableDivider({ node }: EditableDividerProps) {
  const borderColor = (node.props["border-color"] as string) || "#e2e8f0";
  const borderWidth = (node.props["border-width"] as string) || "1px";
  const containerBgColor = node.props["container-background-color"] as string;

  return (
    <div className="py-4" style={{ backgroundColor: containerBgColor }}>
      <hr
        style={{
          borderColor,
          borderWidth,
          borderStyle: "solid",
        }}
      />
    </div>
  );
}
