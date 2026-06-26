import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface PreviewUserInfo {
  uid: string;
  displayName: string | null;
  email: string | null;
}

interface AdminPreviewState {
  previewAsPlayer: boolean;
  togglePreviewAsPlayer: () => void;
  previewUser: PreviewUserInfo | null;
  startUserPreview: (user: PreviewUserInfo) => void;
  stopUserPreview: () => void;
}

export const useAdminPreviewStore = create<AdminPreviewState>()(
  persist(
    (set) => ({
      previewAsPlayer: false,
      togglePreviewAsPlayer: () => set((state) => ({ previewAsPlayer: !state.previewAsPlayer })),
      previewUser: null,
      startUserPreview: (user) => set({ previewUser: user }),
      stopUserPreview: () => set({ previewUser: null }),
    }),
    {
      name: 'admin-preview-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
