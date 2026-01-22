/**
 * Code Editor - Monaco-based MJML source code editor
 */

"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Editor, { OnMount, BeforeMount } from "@monaco-editor/react";
import type { editor, IRange } from "monaco-editor";
import { useEditorStore } from "@/features/editor/stores";
import { generateMjml, parseMjmlToNode } from "@/features/editor/lib/mjml";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, AlertCircle, Loader2, Lock } from "lucide-react";

// Interface for locked region in code
interface LockedRegion {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

// Parse MJML code and find all locked regions (lines with data-locked="true" tags)
function findLockedRegions(code: string): LockedRegion[] {
  const regions: LockedRegion[] = [];
  const lines = code.split("\n");

  // Stack to track nested locked elements
  const lockedStack: { tagName: string; startLine: number; startColumn: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1; // Monaco uses 1-based line numbers

    // Check for opening tags with data-locked="true"
    const openTagRegex = /<(mj-[\w-]+|[\w-]+)[^>]*data-locked="true"[^>]*>/gi;
    let match;

    while ((match = openTagRegex.exec(line)) !== null) {
      const tagName = match[1].toLowerCase();
      // Check if it's a self-closing tag
      const isSelfClosing = match[0].endsWith("/>");

      if (isSelfClosing) {
        // Self-closing locked tag - the whole line is locked
        regions.push({
          startLine: lineNumber,
          endLine: lineNumber,
          startColumn: match.index + 1,
          endColumn: match.index + match[0].length + 1,
        });
      } else {
        // Opening tag - push to stack
        lockedStack.push({
          tagName,
          startLine: lineNumber,
          startColumn: match.index + 1,
        });
      }
    }

    // Check for closing tags that match our locked stack
    if (lockedStack.length > 0) {
      const closingTagRegex = /<\/(mj-[\w-]+|[\w-]+)>/gi;
      while ((match = closingTagRegex.exec(line)) !== null) {
        const closingTagName = match[1].toLowerCase();

        // Find matching opening tag in stack (from top)
        for (let j = lockedStack.length - 1; j >= 0; j--) {
          if (lockedStack[j].tagName === closingTagName) {
            const openTag = lockedStack.splice(j, 1)[0];
            regions.push({
              startLine: openTag.startLine,
              endLine: lineNumber,
              startColumn: 1,
              endColumn: lines[lineNumber - 1].length + 1,
            });
            break;
          }
        }
      }
    }
  }

  return regions;
}

// Check if a range overlaps with any locked region
function isRangeInLockedRegion(range: IRange, lockedRegions: LockedRegion[]): boolean {
  for (const region of lockedRegions) {
    // Check if the edit range overlaps with the locked region
    const rangeStartsBeforeRegionEnds =
      range.startLineNumber < region.endLine ||
      (range.startLineNumber === region.endLine && range.startColumn <= region.endColumn);

    const rangeEndsAfterRegionStarts =
      range.endLineNumber > region.startLine ||
      (range.endLineNumber === region.startLine && range.endColumn >= region.startColumn);

    if (rangeStartsBeforeRegionEnds && rangeEndsAfterRegionStarts) {
      return true;
    }
  }
  return false;
}

export function CodeEditor() {
  const document = useEditorStore((s) => s.document);
  const headSettings = useEditorStore((s) => s.headSettings);
  const setDocument = useEditorStore((s) => s.setDocument);
  const [editedCode, setEditedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockedWarning, setLockedWarning] = useState<string | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const lockedRegionsRef = useRef<LockedRegion[]>([]);

  // Generate MJML from document using useMemo (derived state)
  const generatedMjml = useMemo(
    () => generateMjml(document, headSettings),
    [document, headSettings]
  );

  // Use edited code if user has made changes, otherwise use generated
  const code = editedCode ?? generatedMjml;
  const isDirty = editedCode !== null;

  // Auto-sync with debounce for live preview
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      try {
        const node = parseMjmlToNode(code);
        if (node) {
          setDocument(node);
          setError(null);
          // Keep isDirty true to show the modified indicator
        }
      } catch (err) {
        setError((err as Error).message);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [code, isDirty, setDocument]);

  // Update locked region decorations when code changes
  useEffect(() => {
    if (editorRef.current) {
      // Small delay to ensure model is updated
      const timer = setTimeout(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const model = editor.getModel();
        if (!model) return;

        const regions = findLockedRegions(code);
        lockedRegionsRef.current = regions;

        // Create decorations for locked regions
        const decorations: editor.IModelDeltaDecoration[] = regions.map((region) => ({
          range: {
            startLineNumber: region.startLine,
            startColumn: 1,
            endLineNumber: region.endLine,
            endColumn: model.getLineMaxColumn(region.endLine),
          },
          options: {
            isWholeLine: true,
            className: "locked-region-line",
            glyphMarginClassName: "locked-region-glyph",
            glyphMarginHoverMessage: { value: "🔒 This region is locked and cannot be edited" },
            overviewRuler: {
              color: "#f59e0b",
              position: 4,
            },
            minimap: {
              color: "#f59e0b",
              position: 1,
            },
          },
        }));

        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [code]);

  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setEditedCode(value);
      setError(null);
    }
  }, []);

  const handleSync = useCallback(() => {
    try {
      const node = parseMjmlToNode(code);
      if (node) {
        setDocument(node);
        setEditedCode(null);
        setError(null);
      } else {
        setError("Failed to parse MJML. Please check the syntax.");
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [code, setDocument]);

  const handleReset = useCallback(() => {
    setEditedCode(null);
    setError(null);
  }, []);

  // Update locked regions decorations
  const updateLockedDecorations = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const currentCode = model.getValue();
    const regions = findLockedRegions(currentCode);
    lockedRegionsRef.current = regions;

    // Create decorations for locked regions
    const decorations: editor.IModelDeltaDecoration[] = regions.map((region) => ({
      range: {
        startLineNumber: region.startLine,
        startColumn: 1,
        endLineNumber: region.endLine,
        endColumn: model.getLineMaxColumn(region.endLine),
      },
      options: {
        isWholeLine: true,
        className: "locked-region-line",
        glyphMarginClassName: "locked-region-glyph",
        glyphMarginHoverMessage: { value: "🔒 This region is locked and cannot be edited" },
        overviewRuler: {
          color: "#f59e0b",
          position: 4, // Right
        },
        minimap: {
          color: "#f59e0b",
          position: 1, // Inline
        },
      },
    }));

    // Update decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
  }, []);

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      // Setup locked regions
      updateLockedDecorations();

      // Intercept edit operations to prevent editing locked regions
      const model = editor.getModel();
      if (model) {
        // Listen for content changes to update decorations
        model.onDidChangeContent(() => {
          // Debounce decoration updates
          setTimeout(updateLockedDecorations, 100);
        });
      }

      // Override the editor's executeEdits to intercept edits to locked regions
      const originalExecuteEdits = editor.executeEdits.bind(editor);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor as any).executeEdits = (
        source: string | null | undefined,
        edits: editor.IIdentifiedSingleEditOperation[],
        endCursorState?: unknown
      ) => {
        const lockedRegions = lockedRegionsRef.current;

        // Check if any edit touches a locked region
        const hasLockedEdit = edits.some((edit) => {
          if (!edit.range) return false;
          return isRangeInLockedRegion(edit.range, lockedRegions);
        });

        if (hasLockedEdit) {
          setLockedWarning("Cannot edit locked region");
          setTimeout(() => setLockedWarning(null), 2000);
          return false;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return originalExecuteEdits(source, edits, endCursorState as any);
      };

      // Also intercept keyboard-based edits through onKeyDown
      editor.onKeyDown((e) => {
        const selection = editor.getSelection();
        if (!selection) return;

        const lockedRegions = lockedRegionsRef.current;

        // Check if cursor is in a locked region for character input
        const isInLocked = isRangeInLockedRegion(selection, lockedRegions);

        if (isInLocked) {
          // Allow navigation keys
          const allowedKeys = [
            monaco.KeyCode.LeftArrow,
            monaco.KeyCode.RightArrow,
            monaco.KeyCode.UpArrow,
            monaco.KeyCode.DownArrow,
            monaco.KeyCode.Home,
            monaco.KeyCode.End,
            monaco.KeyCode.PageUp,
            monaco.KeyCode.PageDown,
            monaco.KeyCode.Escape,
          ];

          const isNavigation = allowedKeys.includes(e.keyCode);
          const isCtrlCmd = e.ctrlKey || e.metaKey;
          const isCopy = isCtrlCmd && e.keyCode === monaco.KeyCode.KeyC;
          const isSelectAll = isCtrlCmd && e.keyCode === monaco.KeyCode.KeyA;

          // Allow navigation, copy, and select all
          if (!isNavigation && !isCopy && !isSelectAll) {
            // Block editing keys (typing, delete, backspace, etc.)
            const editingKeys = [
              monaco.KeyCode.Backspace,
              monaco.KeyCode.Delete,
              monaco.KeyCode.Enter,
              monaco.KeyCode.Tab,
            ];

            // If it's an editing key or a character key, prevent it
            if (
              editingKeys.includes(e.keyCode) ||
              (!isCtrlCmd &&
                !e.altKey &&
                e.keyCode >= monaco.KeyCode.KeyA &&
                e.keyCode <= monaco.KeyCode.KeyZ)
            ) {
              e.preventDefault();
              e.stopPropagation();
              setLockedWarning("Cannot edit locked region");
              setTimeout(() => setLockedWarning(null), 2000);
            }
          }
        }
      });

      // Add paste interception
      editor.onDidPaste(() => {
        const selection = editor.getSelection();
        if (!selection) return;

        const lockedRegions = lockedRegionsRef.current;
        if (isRangeInLockedRegion(selection, lockedRegions)) {
          // Undo the paste operation
          editor.trigger("locked-region", "undo", null);
          setLockedWarning("Cannot paste in locked region");
          setTimeout(() => setLockedWarning(null), 2000);
        }
      });

      // Focus editor when mounted
      editor.focus();
    },
    [updateLockedDecorations]
  );

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    // Register MJML as XML-like language
    monaco.languages.register({ id: "mjml" });
    monaco.languages.setLanguageConfiguration("mjml", {
      brackets: [
        ["<", ">"],
        ["{", "}"],
        ["(", ")"],
      ],
      autoClosingPairs: [
        { open: "<", close: ">" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      surroundingPairs: [
        { open: "<", close: ">" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
    });

    // Set token rules for MJML (XML-like)
    monaco.languages.setMonarchTokensProvider("mjml", {
      defaultToken: "",
      tokenPostfix: ".mjml",
      ignoreCase: true,

      brackets: [
        { open: "<!--", close: "-->", token: "comment.content.mjml" },
        { open: "<![CDATA[", close: "]]>", token: "cdata.content.mjml" },
        { open: "<", close: ">", token: "tag.mjml" },
      ],

      tokenizer: {
        root: [
          [/<!--/, "comment.mjml", "@comment"],
          [/<!\[CDATA\[/, "cdata.mjml", "@cdata"],
          [/<\?/, "metatag.mjml", "@processingInstruction"],
          [/<\/?mj-[\w-]+/, { token: "tag.mjml", next: "@tag" }],
          [/<\/?[\w-]+/, { token: "tag.mjml", next: "@tag" }],
          [/[^<]+/, ""],
        ],
        comment: [
          [/-->/, "comment.mjml", "@pop"],
          [/[^-]+/, "comment.content.mjml"],
          [/./, "comment.content.mjml"],
        ],
        cdata: [
          [/\]\]>/, "cdata.mjml", "@pop"],
          [/[^\]]+/, "cdata.content.mjml"],
          [/./, "cdata.content.mjml"],
        ],
        processingInstruction: [
          [/\?>/, "metatag.mjml", "@pop"],
          [/[^?]+/, "metatag.content.mjml"],
          [/./, "metatag.content.mjml"],
        ],
        tag: [
          [/[\w-]+/, "attribute.name.mjml"],
          [/=/, "delimiter.mjml"],
          [/"[^"]*"/, "attribute.value.mjml"],
          [/'[^']*'/, "attribute.value.mjml"],
          [/\/>/, "tag.mjml", "@pop"],
          [/>/, "tag.mjml", "@pop"],
          [/\s+/, ""],
        ],
      },
    });

    // Define theme for MJML
    monaco.editor.defineTheme("mjml-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "tag.mjml", foreground: "569CD6" },
        { token: "attribute.name.mjml", foreground: "9CDCFE" },
        { token: "attribute.value.mjml", foreground: "CE9178" },
        { token: "comment.mjml", foreground: "6A9955" },
        { token: "comment.content.mjml", foreground: "6A9955" },
      ],
      colors: {
        "editor.background": "#1e1e1e",
      },
    });

    // Add CSS for locked region styling
    const styleId = "monaco-locked-region-styles";
    if (!window.document.getElementById(styleId)) {
      const style = window.document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .locked-region-line {
          background-color: rgba(245, 158, 11, 0.08) !important;
        }
        .locked-region-glyph {
          background-color: #f59e0b;
          width: 4px !important;
          margin-left: 3px;
          border-radius: 2px;
        }
        .locked-region-glyph::before {
          content: "🔒";
          font-size: 10px;
          position: absolute;
          left: 4px;
        }
      `;
      window.document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-[#1e1e1e]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">MJML Source</span>
          {isDirty && (
            <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
              Modified
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-gray-400 hover:text-white hover:bg-[#3c3c3c]"
                onClick={handleReset}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                onClick={handleSync}
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Apply Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border-b border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Locked Region Warning Banner */}
      {lockedWarning && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border-b border-yellow-500/30 animate-pulse">
          <Lock className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-yellow-400">{lockedWarning}</span>
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language="mjml"
          theme="mjml-dark"
          value={code}
          onChange={handleChange}
          onMount={handleEditorMount}
          beforeMount={handleBeforeMount}
          loading={
            <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          }
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            insertSpaces: true,
            automaticLayout: true,
            formatOnPaste: true,
            formatOnType: true,
            folding: true,
            foldingStrategy: "indentation",
            renderWhitespace: "selection",
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            glyphMargin: true,
          }}
        />
      </div>
    </div>
  );
}
