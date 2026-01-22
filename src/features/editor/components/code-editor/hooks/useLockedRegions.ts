/**
 * useLockedRegions Hook
 * Manages locked region decorations and edit interception in Monaco editor
 *
 * Uses a robust approach to prevent all edits in locked regions:
 * - Intercepts model content changes and reverts if in locked region
 * - Handles keyboard input, IME input, paste, cut, drag-drop
 */

import { useState, useCallback, useRef } from "react";
import type { editor } from "monaco-editor";
import type { Monaco } from "@monaco-editor/react";
import type { LockedRegion } from "../types";
import { findLockedRegions, isRangeInLockedRegion } from "../utils";

// Type alias for content change event
type IModelContentChangedEvent = editor.IModelContentChangedEvent;

interface UseLockedRegionsResult {
  /** Warning message when trying to edit locked region */
  lockedWarning: string | null;
  /** Callback to set up locked regions on editor mount */
  setupLockedRegions: (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void;
  /** Update decorations when code changes */
  updateDecorations: () => void;
}

/**
 * Hook for managing locked regions in the code editor
 * - Finds and highlights locked regions
 * - Prevents ALL editing in locked regions (including IME, special chars, paste, cut)
 * - Shows warning when edit is blocked
 */
export function useLockedRegions(): UseLockedRegionsResult {
  const [lockedWarning, setLockedWarning] = useState<string | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const lockedRegionsRef = useRef<LockedRegion[]>([]);
  // Flag to prevent recursive undo triggers
  const isUndoingRef = useRef(false);
  // Store the previous valid content for locked region protection
  const previousContentRef = useRef<string>("");
  // Warning timeout ref to prevent multiple warnings
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear warning after timeout (debounced)
  const showWarning = useCallback((message: string) => {
    // Clear existing timeout
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    setLockedWarning(message);
    warningTimeoutRef.current = setTimeout(() => {
      setLockedWarning(null);
      warningTimeoutRef.current = null;
    }, 2000);
  }, []);

  // Update locked region decorations
  const updateDecorations = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const currentCode = model.getValue();
    const regions = findLockedRegions(currentCode);
    lockedRegionsRef.current = regions;

    // Store current content as valid content
    previousContentRef.current = currentCode;

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

  // Check if any change affects locked regions
  const doesChangeAffectLockedRegions = useCallback((event: IModelContentChangedEvent): boolean => {
    const lockedRegions = lockedRegionsRef.current;
    if (lockedRegions.length === 0) return false;

    // Check each change in the event
    for (const change of event.changes) {
      const changeRange = {
        startLineNumber: change.range.startLineNumber,
        startColumn: change.range.startColumn,
        endLineNumber: change.range.endLineNumber,
        endColumn: change.range.endColumn,
      };

      if (isRangeInLockedRegion(changeRange, lockedRegions)) {
        return true;
      }
    }

    return false;
  }, []);

  // Setup locked regions on editor mount
  const setupLockedRegions = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor;

      // Initial decoration update
      updateDecorations();

      const model = editor.getModel();
      if (!model) return;

      // Store initial content
      previousContentRef.current = model.getValue();

      /**
       * Primary protection: Listen for ALL content changes and revert if in locked region
       * This catches everything: keyboard, IME, paste, cut, drag-drop, programmatic changes
       */
      model.onDidChangeContent((event: IModelContentChangedEvent) => {
        // Skip if we're in the middle of undoing
        if (isUndoingRef.current) return;

        // Check if any change affects locked regions
        if (doesChangeAffectLockedRegions(event)) {
          isUndoingRef.current = true;

          // Use undo to revert the change
          editor.trigger("locked-region-protection", "undo", null);

          // Show warning
          showWarning("Cannot edit locked region");

          // Reset the flag after a short delay
          setTimeout(() => {
            isUndoingRef.current = false;
            // Update decorations after undo
            updateDecorations();
          }, 10);

          return;
        }

        // Update decorations for valid changes (debounced)
        setTimeout(updateDecorations, 100);
      });

      /**
       * Secondary protection: Block keyboard input proactively
       * This provides a better UX by preventing the keystroke before it happens
       */
      editor.onKeyDown((e) => {
        const selection = editor.getSelection();
        if (!selection) return;

        const lockedRegions = lockedRegionsRef.current;
        const isInLocked = isRangeInLockedRegion(selection, lockedRegions);

        if (isInLocked) {
          // Define navigation and read-only operation keys
          const navigationKeys = [
            monaco.KeyCode.LeftArrow,
            monaco.KeyCode.RightArrow,
            monaco.KeyCode.UpArrow,
            monaco.KeyCode.DownArrow,
            monaco.KeyCode.Home,
            monaco.KeyCode.End,
            monaco.KeyCode.PageUp,
            monaco.KeyCode.PageDown,
            monaco.KeyCode.Escape,
            monaco.KeyCode.F1, // Help
            monaco.KeyCode.F2, // Rename (read-only)
            monaco.KeyCode.F3, // Find next
            monaco.KeyCode.F5, // Refresh
            monaco.KeyCode.F6, // Focus
            monaco.KeyCode.F7, // Spell check
            monaco.KeyCode.F8, // Errors
            monaco.KeyCode.F9, // Breakpoint
            monaco.KeyCode.F10, // Menu
            monaco.KeyCode.F11, // Fullscreen
            monaco.KeyCode.F12, // DevTools
          ];

          const isNavigation = navigationKeys.includes(e.keyCode);
          const isModifier =
            e.keyCode === monaco.KeyCode.Shift ||
            e.keyCode === monaco.KeyCode.Ctrl ||
            e.keyCode === monaco.KeyCode.Alt ||
            e.keyCode === monaco.KeyCode.Meta;
          const isCtrlCmd = e.ctrlKey || e.metaKey;

          // Allow: navigation, modifiers, copy (Ctrl+C), select all (Ctrl+A), find (Ctrl+F)
          const isCopy = isCtrlCmd && e.keyCode === monaco.KeyCode.KeyC;
          const isSelectAll = isCtrlCmd && e.keyCode === monaco.KeyCode.KeyA;
          const isFind = isCtrlCmd && e.keyCode === monaco.KeyCode.KeyF;
          const isUndo = isCtrlCmd && e.keyCode === monaco.KeyCode.KeyZ;
          const isRedo =
            isCtrlCmd &&
            (e.keyCode === monaco.KeyCode.KeyY ||
              (e.shiftKey && e.keyCode === monaco.KeyCode.KeyZ));

          if (isNavigation || isModifier || isCopy || isSelectAll || isFind || isUndo || isRedo) {
            return; // Allow these operations
          }

          // Block all other keys (typing, delete, backspace, enter, tab, special chars, etc.)
          e.preventDefault();
          e.stopPropagation();
          showWarning("Cannot edit locked region");
        }
      });

      /**
       * Tertiary protection: Handle beforeinput for IME and other inputs
       * This catches Chinese, Japanese, Korean and other IME inputs in modern browsers
       */
      const editorDomNode = editor.getDomNode();
      if (editorDomNode) {
        // Handle beforeinput for modern browsers - catches IME and other inputs
        editorDomNode.addEventListener("beforeinput", (e) => {
          const selection = editor.getSelection();
          if (!selection) return;

          const lockedRegions = lockedRegionsRef.current;
          if (isRangeInLockedRegion(selection, lockedRegions)) {
            e.preventDefault();
            showWarning("Cannot edit locked region");
          }
        });
      }
    },
    [updateDecorations, showWarning, doesChangeAffectLockedRegions]
  );

  return {
    lockedWarning,
    setupLockedRegions,
    updateDecorations,
  };
}
