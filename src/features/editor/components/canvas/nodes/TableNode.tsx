/**
 * Table node renderer for Canvas mode
 * Re-exports EditableTable to provide full editing capabilities
 */

"use client";

import { memo } from "react";
import type { EditorNode } from "@/features/editor/types";
import { EditableTable } from "@/features/editor/components/edit-mode/components/blocks";

interface TableNodeProps {
  node: EditorNode;
}

export const TableNode = memo(function TableNode({ node }: TableNodeProps) {
  return <EditableTable node={node} />;
});
