"use client";

import { create } from "zustand";
import type { LeadFilterState, PractoLead } from "@/lib/types";
import { MOCK_LEADS } from "@/lib/mock/leads";

type LeadsState = {
  leads: PractoLead[];
  filters: LeadFilterState;
  selectedIds: Record<string, boolean>;
  sourcing: boolean;
  lastMessage: string;
  setFilters: (patch: Partial<LeadFilterState>) => void;
  setLeads: (leads: PractoLead[]) => void;
  upsertLead: (lead: PractoLead) => void;
  toggleSelect: (id: string) => void;
  selectAllFiltered: (ids: string[]) => void;
  clearSelection: () => void;
  setSourcing: (v: boolean) => void;
  setMessage: (msg: string) => void;
};

export const useLeadsStore = create<LeadsState>((set) => ({
  leads: MOCK_LEADS,
  filters: {
    city: "Bangalore",
    locality: "",
    specialties: ["Dermatologist"],
    product: "BOTH",
  },
  selectedIds: {},
  sourcing: false,
  lastMessage: "",
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  setLeads: (leads) => set({ leads }),
  upsertLead: (lead) =>
    set((s) => {
      const idx = s.leads.findIndex((l) => l.id === lead.id);
      if (idx === -1) return { leads: [lead, ...s.leads] };
      const next = [...s.leads];
      next[idx] = lead;
      return { leads: next };
    }),
  toggleSelect: (id) =>
    set((s) => ({
      selectedIds: { ...s.selectedIds, [id]: !s.selectedIds[id] },
    })),
  selectAllFiltered: (ids) => {
    const selectedIds: Record<string, boolean> = {};
    for (const id of ids) selectedIds[id] = true;
    set({ selectedIds });
  },
  clearSelection: () => set({ selectedIds: {} }),
  setSourcing: (sourcing) => set({ sourcing }),
  setMessage: (lastMessage) => set({ lastMessage }),
}));

export function filterLeads(leads: PractoLead[], filters: LeadFilterState) {
  return leads.filter((l) => {
    if (filters.city && l.city !== filters.city) return false;
    if (
      filters.locality &&
      !`${l.locality} ${l.address}`.toLowerCase().includes(filters.locality.toLowerCase())
    ) {
      return false;
    }
    if (filters.specialties.length && !filters.specialties.includes(l.specialty)) {
      return false;
    }
    if (filters.product === "REACH" && l.recommendedProduct === "PRIME") return false;
    if (filters.product === "PRIME" && l.recommendedProduct === "REACH") return false;
    return true;
  });
}

export function selectedLeads() {
  const { leads, selectedIds } = useLeadsStore.getState();
  return leads.filter((l) => selectedIds[l.id]);
}
