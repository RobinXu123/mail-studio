/**
 * Social node renderer for Canvas mode
 * Displays a preview of social media links
 */

"use client";

import { memo, type ReactNode } from "react";
import {
  Share2,
  Github,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Globe,
  Pin,
  Ghost,
  Video,
  Cloud,
  Dribbble,
} from "lucide-react";
import type { EditorNode } from "@/features/editor/types";

interface SocialNodeProps {
  node: EditorNode;
}

// Social platform configurations with lucide-react icons
const socialPlatforms: Record<string, { label: string; color: string; icon: ReactNode }> = {
  facebook: { label: "Facebook", color: "#1877f2", icon: <Facebook /> },
  "facebook-noshare": { label: "Facebook", color: "#1877f2", icon: <Facebook /> },
  twitter: { label: "Twitter", color: "#1da1f2", icon: <Twitter /> },
  "twitter-noshare": { label: "Twitter", color: "#1da1f2", icon: <Twitter /> },
  x: { label: "X", color: "#000000", icon: <Twitter /> },
  "x-noshare": { label: "X", color: "#000000", icon: <Twitter /> },
  linkedin: { label: "LinkedIn", color: "#0a66c2", icon: <Linkedin /> },
  "linkedin-noshare": { label: "LinkedIn", color: "#0a66c2", icon: <Linkedin /> },
  instagram: { label: "Instagram", color: "#e4405f", icon: <Instagram /> },
  youtube: { label: "YouTube", color: "#ff0000", icon: <Youtube /> },
  github: { label: "GitHub", color: "#333333", icon: <Github /> },
  "github-noshare": { label: "GitHub", color: "#333333", icon: <Github /> },
  pinterest: { label: "Pinterest", color: "#bd081c", icon: <Pin /> },
  "pinterest-noshare": { label: "Pinterest", color: "#bd081c", icon: <Pin /> },
  snapchat: { label: "Snapchat", color: "#fffc00", icon: <Ghost /> },
  vimeo: { label: "Vimeo", color: "#1ab7ea", icon: <Video /> },
  tumblr: { label: "Tumblr", color: "#35465c", icon: <Globe /> },
  "tumblr-noshare": { label: "Tumblr", color: "#35465c", icon: <Globe /> },
  soundcloud: { label: "SoundCloud", color: "#ff5500", icon: <Cloud /> },
  dribbble: { label: "Dribbble", color: "#ea4c89", icon: <Dribbble /> },
  web: { label: "Web", color: "#4a4a4a", icon: <Globe /> },
  medium: { label: "Medium", color: "#00ab6c", icon: <Globe /> },
};

// Map align prop to CSS justify-content
const alignToJustify: Record<string, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

export const SocialNode = memo(function SocialNode({ node }: SocialNodeProps) {
  const children = node.children || [];
  const mode = (node.props.mode as string) || "horizontal";
  const align = (node.props.align as string) || "center";
  const iconSize = (node.props["icon-size"] as string) || "20px";
  const iconPadding = (node.props["icon-padding"] as string) || "4px";

  // Parse icon size for display
  const sizeNum = parseInt(iconSize, 10) || 20;
  const displaySize = Math.max(24, Math.min(48, sizeNum));

  // Get alignment class
  const justifyClass = alignToJustify[align] || "justify-center";

  return (
    <div className="py-2">
      <div className="border rounded-lg p-3 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-500">Social Links</span>
        </div>

        {children.length > 0 ? (
          <div
            className={
              mode === "vertical"
                ? `flex flex-col items-start gap-2 ${justifyClass}`
                : `flex flex-wrap items-center gap-2 ${justifyClass}`
            }
          >
            {children.map((child) => {
              const platformName = (child.props.name as string) || "web";
              const platform = socialPlatforms[platformName] || {
                label: platformName,
                color: "#666666",
                icon: <Globe />,
              };
              const customSrc = child.props.src as string;

              return (
                <div
                  key={child.id}
                  className="flex items-center gap-2 group transition-transform hover:scale-105"
                  style={{ padding: iconPadding }}
                >
                  {customSrc ? (
                    <img
                      src={customSrc}
                      alt={platform.label}
                      className="rounded"
                      style={{ width: displaySize, height: displaySize }}
                    />
                  ) : (
                    <div
                      className="rounded flex items-center justify-center text-white shadow-sm [&>svg]:w-1/2 [&>svg]:h-1/2"
                      style={{
                        backgroundColor: platform.color,
                        width: displaySize,
                        height: displaySize,
                      }}
                    >
                      {platform.icon}
                    </div>
                  )}
                  {mode === "vertical" && (
                    <span className="text-sm text-gray-600">{platform.label}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-gray-400 italic text-center py-2">No social links added</div>
        )}
      </div>
    </div>
  );
});
