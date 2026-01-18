"use client";

import { useEditorStore } from "@/features/editor/stores";
import type { EditorNode } from "@/features/editor/types";
import { generateId } from "@/features/editor/lib/mjml";
import { cn } from "@/lib/utils";
import {
  Share2,
  Plus,
  Trash2,
  Github,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface EditableSocialProps {
  node: EditorNode;
}

const socialPlatforms: Array<{
  name: string;
  label: string;
  color: string;
  icon: LucideIcon;
}> = [
  { name: "github", label: "GitHub", color: "#333", icon: Github },
  { name: "facebook", label: "Facebook", color: "#1877f2", icon: Facebook },
  { name: "twitter", label: "Twitter", color: "#1da1f2", icon: Twitter },
  { name: "linkedin", label: "LinkedIn", color: "#0a66c2", icon: Linkedin },
  { name: "instagram", label: "Instagram", color: "#e4405f", icon: Instagram },
  { name: "youtube", label: "YouTube", color: "#ff0000", icon: Youtube },
];

// Map align prop to CSS justify-content
const alignToJustify: Record<string, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

export function EditableSocial({ node }: EditableSocialProps) {
  const { selectedId, setSelectedId, addChildNode, removeNode } = useEditorStore();
  const isSelected = selectedId === node.id;
  const children = node.children || [];
  const align = (node.props.align as string) || "center";
  const justifyClass = alignToJustify[align] || "justify-center";

  const handleAddSocial = (platformName: string) => {
    const newElement: EditorNode = {
      id: generateId(),
      type: "mj-social-element",
      props: { name: platformName, href: "#" },
    };
    addChildNode(node.id, newElement);
  };

  return (
    <div className="py-2">
      <div
        className={cn(
          "border rounded-lg p-3 transition-all",
          isSelected ? "ring-2 ring-blue-200" : "hover:border-gray-300"
        )}
        onClick={() => setSelectedId(node.id)}
      >
        <div className="flex items-center gap-2 mb-2">
          <Share2 className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">Social Links</span>
        </div>

        <div className={cn("flex flex-wrap gap-2 mb-3", justifyClass)}>
          {children.map((child) => {
            const platform = socialPlatforms.find((p) => p.name === child.props.name);
            const IconComponent = platform?.icon || Globe;
            return (
              <div
                key={child.id}
                className="group relative flex items-center justify-center rounded text-white"
                style={{
                  backgroundColor: platform?.color || "#666",
                  width: 32,
                  height: 32,
                }}
              >
                <IconComponent className="w-4 h-4" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNode(child.id);
                  }}
                  className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 rounded-full p-0.5"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <Plus className="w-3 h-3" />
              Add social link
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2" align="start">
            {socialPlatforms.map((platform) => {
              const IconComponent = platform.icon;
              return (
                <button
                  key={platform.name}
                  onClick={() => handleAddSocial(platform.name)}
                  className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 flex items-center gap-2"
                >
                  <IconComponent className="w-4 h-4" style={{ color: platform.color }} />
                  {platform.label}
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
