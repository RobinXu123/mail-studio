import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type EditorMode = 'canvas' | 'edit' | 'preview' | 'code';

interface UIState {
  // Panel widths
  leftPanelWidth: number;
  rightPanelWidth: number;

  // View modes
  editorMode: EditorMode;
  previewMode: 'desktop' | 'mobile';
  showCode: boolean;
  showPreview: boolean;

  // Active tabs
  activeTab: 'components' | 'templates';

  // Drag state
  isDragging: boolean;
  dragOverId: string | null;

  // Actions
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setEditorMode: (mode: EditorMode) => void;
  setPreviewMode: (mode: 'desktop' | 'mobile') => void;
  setShowCode: (show: boolean) => void;
  setShowPreview: (show: boolean) => void;
  setActiveTab: (tab: 'components' | 'templates') => void;
  setIsDragging: (isDragging: boolean) => void;
  setDragOverId: (id: string | null) => void;
  toggleCode: () => void;
  togglePreview: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      leftPanelWidth: 280,
      rightPanelWidth: 300,
      editorMode: 'canvas',
      previewMode: 'desktop',
      showCode: false,
      showPreview: false,
      activeTab: 'components',
      isDragging: false,
      dragOverId: null,

      setLeftPanelWidth: (width) => set({ leftPanelWidth: width }),
      setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
      setEditorMode: (mode) => set({ editorMode: mode, showCode: mode === 'code', showPreview: mode === 'preview' }),
      setPreviewMode: (mode) => set({ previewMode: mode }),
      setShowCode: (show) => set({ showCode: show }),
      setShowPreview: (show) => set({ showPreview: show }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setIsDragging: (isDragging) => set({ isDragging }),
      setDragOverId: (id) => set({ dragOverId: id }),
      toggleCode: () => set((state) => ({ showCode: !state.showCode })),
      togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),
    }),
    {
      name: 'mail-studio-ui-v3',
      partialize: (state) => ({
        editorMode: state.editorMode,
        previewMode: state.previewMode,
      }),
    }
  )
);
