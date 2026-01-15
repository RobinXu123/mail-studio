"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useEditorStore } from "@/stores/editor";
import { EditorNode, MJMLComponentType } from "@/types/editor";
import { componentDefinitions, createNode } from "@/lib/mjml/schema";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Image,
  Minus,
  MousePointerClick,
  Plus,
  GripVertical,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function EditMode() {
  const document = useEditorStore((s) => s.document);

  return (
    <div className="h-full bg-white overflow-auto">
      <div className="max-w-[650px] mx-auto py-12 px-8">
        {/* Email Header */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            <span className="w-16">From</span>
            <input
              type="text"
              placeholder="Your Name <email@example.com>"
              className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            <span className="w-16">To</span>
            <input
              type="text"
              placeholder="Recipient(s)"
              className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="w-16">Subject</span>
            <input
              type="text"
              placeholder="Email subject"
              className="flex-1 bg-transparent outline-none text-gray-900 font-medium placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Email Body */}
        <div className="space-y-1">
          {document.children?.map((section) => (
            <EditSection key={section.id} node={section} />
          ))}
          <AddBlockButton parentId={document.id} />
        </div>
      </div>
    </div>
  );
}

function EditSection({ node }: { node: EditorNode }) {
  return (
    <div className="space-y-1">
      {node.children?.map((column) => (
        <EditColumn key={column.id} node={column} parentId={node.id} />
      ))}
    </div>
  );
}

function EditColumn({
  node,
  parentId,
}: {
  node: EditorNode;
  parentId: string;
}) {
  return (
    <div className="space-y-1">
      {node.children?.map((child) => (
        <EditBlock key={child.id} node={child} parentId={node.id} />
      ))}
      <AddBlockButton parentId={node.id} />
    </div>
  );
}

function EditBlock({ node, parentId }: { node: EditorNode; parentId: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const { removeNode, selectedId, setSelectedId } = useEditorStore();
  const isSelected = selectedId === node.id;

  const handleDelete = useCallback(() => {
    removeNode(node.id);
  }, [node.id, removeNode]);

  return (
    <div
      className={cn(
        "group relative rounded-lg transition-all duration-150",
        isHovered && "bg-gray-50",
        isSelected && "bg-blue-50/50 ring-2 ring-blue-200"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setSelectedId(node.id)}
    >
      {/* Block Controls */}
      <div
        className={cn(
          "absolute -left-10 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 transition-opacity",
          (isHovered || isSelected) && "opacity-100"
        )}
      >
        <button
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 cursor-grab"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Block Content */}
      <div className="py-1">
        {node.type === "mj-text" && <EditableText node={node} />}
        {node.type === "mj-image" && <EditableImage node={node} />}
        {node.type === "mj-button" && <EditableButton node={node} />}
        {node.type === "mj-divider" && <EditableDivider node={node} />}
        {node.type === "mj-spacer" && <EditableSpacer node={node} />}
      </div>
    </div>
  );
}

function EditableText({ node }: { node: EditorNode }) {
  const { updateNodeContent, updateNodeProps, selectedId } = useEditorStore();
  const [showToolbar, setShowToolbar] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedId === node.id;

  const handleInput = useCallback(() => {
    if (contentRef.current) {
      updateNodeContent(node.id, contentRef.current.innerHTML);
    }
  }, [node.id, updateNodeContent]);

  const handleFocus = () => setShowToolbar(true);
  const handleBlur = () => {
    // Delay hiding to allow toolbar click
    setTimeout(() => setShowToolbar(false), 200);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleInput();
  };

  const style = {
    fontSize: (node.props["font-size"] as string) || "16px",
    fontWeight: node.props["font-weight"] as string,
    fontFamily: node.props["font-family"] as string,
    color: (node.props["color"] as string) || "#333",
    lineHeight: (node.props["line-height"] as string) || "1.6",
    textAlign: node.props["align"] as "left" | "center" | "right",
  };

  return (
    <div className="relative">
      {/* Floating Toolbar */}
      {(showToolbar || isSelected) && (
        <div className="absolute -top-10 left-0 z-50 flex items-center gap-1 p-1 bg-white rounded-lg shadow-lg border border-gray-200">
          <button
            onClick={() => execCommand("bold")}
            className="p-1.5 rounded hover:bg-gray-100"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => execCommand("italic")}
            className="p-1.5 rounded hover:bg-gray-100"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => execCommand("underline")}
            className="p-1.5 rounded hover:bg-gray-100"
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={() => updateNodeProps(node.id, { align: "left" })}
            className={cn(
              "p-1.5 rounded hover:bg-gray-100",
              node.props["align"] === "left" && "bg-gray-100"
            )}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateNodeProps(node.id, { align: "center" })}
            className={cn(
              "p-1.5 rounded hover:bg-gray-100",
              node.props["align"] === "center" && "bg-gray-100"
            )}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateNodeProps(node.id, { align: "right" })}
            className={cn(
              "p-1.5 rounded hover:bg-gray-100",
              node.props["align"] === "right" && "bg-gray-100"
            )}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={() => {
              const url = prompt("Enter URL:");
              if (url) execCommand("createLink", url);
            }}
            className="p-1.5 rounded hover:bg-gray-100"
            title="Add Link"
          >
            <Link className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="outline-none min-h-[1.6em] px-2 py-1"
        style={style}
        dangerouslySetInnerHTML={{ __html: node.content || "" }}
      />
    </div>
  );
}

function EditableImage({ node }: { node: EditorNode }) {
  const { updateNodeProps } = useEditorStore();
  const [isEditing, setIsEditing] = useState(false);

  const src = node.props["src"] as string;
  const alt = (node.props["alt"] as string) || "";
  const align = (node.props["align"] as string) || "center";

  return (
    <div
      className="py-2"
      style={{ textAlign: align as "left" | "center" | "right" }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="max-w-full h-auto rounded-lg cursor-pointer hover:ring-2 hover:ring-blue-200"
          style={{ display: "inline-block" }}
          onClick={() => setIsEditing(true)}
        />
      ) : (
        <button
          onClick={() => {
            const url = prompt("Enter image URL:");
            if (url) updateNodeProps(node.id, { src: url });
          }}
          className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
        >
          <Image className="w-8 h-8 mx-auto mb-2" />
          Click to add image
        </button>
      )}
    </div>
  );
}

function EditableButton({ node }: { node: EditorNode }) {
  const { updateNodeContent, updateNodeProps, selectedId } = useEditorStore();
  const [showToolbar, setShowToolbar] = useState(false);
  const isSelected = selectedId === node.id;

  const bgColor = (node.props["background-color"] as string) || "#2563eb";
  const textColor = (node.props["color"] as string) || "#ffffff";
  const borderRadius = (node.props["border-radius"] as string) || "6px";
  const align = (node.props["align"] as string) || "center";

  return (
    <div
      className="relative py-2"
      style={{ textAlign: align as "left" | "center" | "right" }}
    >
      {/* Button Toolbar */}
      {(showToolbar || isSelected) && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1 bg-white rounded-lg shadow-lg border border-gray-200">
          <select
            value={borderRadius}
            onChange={(e) =>
              updateNodeProps(node.id, { "border-radius": e.target.value })
            }
            className="text-sm px-2 py-1 rounded border-0 bg-gray-50"
          >
            <option value="0">Square</option>
            <option value="6px">Round</option>
            <option value="9999px">Pill</option>
          </select>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <input
            type="color"
            value={bgColor}
            onChange={(e) =>
              updateNodeProps(node.id, { "background-color": e.target.value })
            }
            className="w-6 h-6 rounded cursor-pointer"
            title="Background Color"
          />
          <input
            type="color"
            value={textColor}
            onChange={(e) =>
              updateNodeProps(node.id, { color: e.target.value })
            }
            className="w-6 h-6 rounded cursor-pointer"
            title="Text Color"
          />
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={() => {
              const url = prompt(
                "Enter button URL:",
                (node.props["href"] as string) || ""
              );
              if (url !== null) updateNodeProps(node.id, { href: url });
            }}
            className="p-1.5 rounded hover:bg-gray-100"
            title="Edit Link"
          >
            <Link className="w-4 h-4" />
          </button>
        </div>
      )}

      <span
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setShowToolbar(true)}
        onBlur={(e) => {
          setTimeout(() => setShowToolbar(false), 200);
          updateNodeContent(node.id, e.currentTarget.textContent || "");
        }}
        className="inline-block px-6 py-3 font-medium outline-none cursor-text"
        style={{
          backgroundColor: bgColor,
          color: textColor,
          borderRadius,
        }}
      >
        {node.content || "Button"}
      </span>
    </div>
  );
}

function EditableDivider({ node }: { node: EditorNode }) {
  const borderColor = (node.props["border-color"] as string) || "#e2e8f0";
  const borderWidth = (node.props["border-width"] as string) || "1px";

  return (
    <div className="py-4">
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

function EditableSpacer({ node }: { node: EditorNode }) {
  const height = (node.props["height"] as string) || "30px";

  return (
    <div
      className="flex items-center justify-center text-gray-400 text-xs"
      style={{ height }}
    >
      ↕ {height}
    </div>
  );
}

function AddBlockButton({ parentId }: { parentId: string }) {
  const { addNode, findNode } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);

  // Find the correct parent for adding blocks
  const getTargetParentId = () => {
    const parent = findNode(parentId);
    if (!parent) return parentId;

    // If parent is body, we need to add to a column inside a section
    if (parent.type === "mj-body") {
      // Find first column in first section
      const section = parent.children?.[0];
      if (section?.type === "mj-section") {
        const column = section.children?.[0];
        if (column?.type === "mj-column") {
          return column.id;
        }
      }
    }
    return parentId;
  };

  const handleAddBlock = (type: MJMLComponentType) => {
    const targetId = getTargetParentId();
    addNode(targetId, type);
    setIsOpen(false);
  };

  const blockTypes = [
    { type: "mj-text" as const, icon: Type, label: "Text" },
    { type: "mj-image" as const, icon: Image, label: "Image" },
    { type: "mj-button" as const, icon: MousePointerClick, label: "Button" },
    { type: "mj-divider" as const, icon: Minus, label: "Divider" },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full py-2 flex items-center justify-center gap-2 text-gray-400 rounded-lg transition-all",
            "hover:bg-gray-50 hover:text-gray-600",
            "opacity-0 hover:opacity-100 focus:opacity-100",
            isOpen && "opacity-100 bg-gray-50"
          )}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add block</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          {blockTypes.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => handleAddBlock(type)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Icon className="w-4 h-4 text-gray-500" />
              {label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
