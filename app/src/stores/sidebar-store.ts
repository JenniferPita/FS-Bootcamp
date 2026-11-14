import { create } from 'zustand';
type SidebarStore = { open: boolean; toggle: () => void; close: () => void };
export const useSidebarStore = create<SidebarStore>((set) => ({
  open: true,
  toggle: () => set((state) => ({ open: !state.open })),
  close: () => set({ open: false }),
}));
