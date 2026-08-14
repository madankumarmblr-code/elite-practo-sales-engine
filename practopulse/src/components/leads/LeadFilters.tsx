"use client";

import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { INDIAN_CITIES, MEDICAL_SPECIALTIES } from "@/lib/types";
import { useLeadsStore } from "@/lib/store/leads";

export function LeadFilters({ onRun }: { onRun: () => void }) {
  const { filters, setFilters, sourcing } = useLeadsStore();

  function toggleSpecialty(spec: string) {
    const has = filters.specialties.includes(spec);
    setFilters({
      specialties: has
        ? filters.specialties.filter((s) => s !== spec)
        : [...filters.specialties, spec],
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <Label>City</Label>
          <Select
            value={filters.city}
            onChange={(e) => setFilters({ city: e.target.value })}
          >
            {INDIAN_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Locality / Zone</Label>
          <Input
            placeholder="e.g. Indiranagar, Andheri"
            value={filters.locality}
            onChange={(e) => setFilters({ locality: e.target.value })}
          />
        </div>
        <div>
          <Label>Target product</Label>
          <Select
            value={filters.product}
            onChange={(e) =>
              setFilters({ product: e.target.value as "REACH" | "PRIME" | "BOTH" })
            }
          >
            <option value="BOTH">Both Reach &amp; Prime</option>
            <option value="REACH">Practo Reach</option>
            <option value="PRIME">Practo Prime</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button className="w-full" size="lg" disabled={sourcing} onClick={onRun}>
            <Rocket className="h-4 w-4" />
            {sourcing ? "Sourcing…" : "Run Sourcing & Enrichment via Apify"}
          </Button>
        </div>
      </div>
      <div>
        <Label>Specialty (multi-select)</Label>
        <div className="flex flex-wrap gap-2">
          {MEDICAL_SPECIALTIES.map((spec) => {
            const on = filters.specialties.includes(spec);
            return (
              <button
                key={spec}
                type="button"
                onClick={() => toggleSpecialty(spec)}
                className={
                  on
                    ? "rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-200 ring-1 ring-teal-500/40"
                    : "rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400 hover:text-slate-200"
                }
              >
                {spec}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
