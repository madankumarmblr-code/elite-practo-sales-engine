"use client";

import { CalendarPlus, Mail, Presentation, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PractoLead } from "@/lib/types";
import { useLeadsStore } from "@/lib/store/leads";

function productTone(p: PractoLead["recommendedProduct"]) {
  if (p === "REACH") return "blue" as const;
  if (p === "PRIME") return "teal" as const;
  return "violet" as const;
}

function statusTone(s: PractoLead["status"]) {
  if (s === "CLOSED_WON") return "teal" as const;
  if (s === "DEMO_SCHEDULED") return "amber" as const;
  if (s === "OUTREACH_ACTIVE") return "blue" as const;
  return "slate" as const;
}

export function LeadTable({
  rows,
  onSendDeck,
  onBookCall,
  onPushSmartlead,
}: {
  rows: PractoLead[];
  onSendDeck: (lead: PractoLead) => void;
  onBookCall: (lead: PractoLead) => void;
  onPushSmartlead: (lead: PractoLead) => void;
}) {
  const { selectedIds, toggleSelect, selectAllFiltered, clearSelection } = useLeadsStore();
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds[r.id]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    allSelected ? clearSelection() : selectAllFiltered(rows.map((r) => r.id))
                  }
                />
              </th>
              <th className="px-4 py-3">Clinic / Doctor</th>
              <th className="px-4 py-3">Specialty</th>
              <th className="px-4 py-3">Locality</th>
              <th className="px-4 py-3">Lead Score</th>
              <th className="px-4 py-3">Product Fit</th>
              <th className="px-4 py-3">Outreach Status</th>
              <th className="px-4 py-3">Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-800/80 hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={!!selectedIds[lead.id]}
                    onChange={() => toggleSelect(lead.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{lead.clinicName}</div>
                  <div className="text-xs text-slate-400">
                    {lead.doctorName} · ★ {lead.googleRating} ({lead.reviewCount})
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-300">{lead.specialty}</td>
                <td className="px-4 py-3 text-slate-300">
                  {lead.locality}
                  <div className="text-xs text-slate-500">{lead.city}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-bold text-teal-300">{lead.leadScore}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={productTone(lead.recommendedProduct)}>
                    {lead.recommendedProduct}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(lead.status)}>{lead.status.replaceAll("_", " ")}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => onSendDeck(lead)}>
                      <Presentation className="h-3.5 w-3.5" /> Deck
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onBookCall(lead)}>
                      <CalendarPlus className="h-3.5 w-3.5" /> Call
                    </Button>
                    <Button size="sm" variant="navy" onClick={() => onPushSmartlead(lead)}>
                      <Send className="h-3.5 w-3.5" /> Smartlead
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  No leads match these filters. Run sourcing or widen specialty selection.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 border-t border-slate-800 px-4 py-3 text-xs text-slate-500">
        <Mail className="h-3.5 w-3.5" />
        Select rows to push bulk Smartlead / HeyReach from Outreach Campaigns.
      </div>
    </div>
  );
}
