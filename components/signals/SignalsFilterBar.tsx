"use client";

import { useState } from "react";

export type FilterOptions = {
  search: string;
  type: string;
  status: string;
};

export default function SignalFilters({
  onChange,
}: {
  onChange: (filters: FilterOptions) => void;
}) {
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    type: "all",
    status: "all",
  });

  function updateFilter(key: keyof FilterOptions, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onChange(next);
  }

  return (
    <div className="w-full bg-omega-green/40 border border-omega-dark-gold rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center">
      {/* Search */}
      <input
        type="text"
        placeholder="Search symbol or strategy..."
        value={filters.search}
        onChange={(e) => updateFilter("search", e.target.value)}
        className="w-full md:flex-1 px-3 py-2 rounded-md border border-omega-dark-gold bg-omega-green text-omega-gold outline-none"
      />

      {/* Type Filter */}
      <select
        value={filters.type}
        onChange={(e) => updateFilter("type", e.target.value)}
        className="px-3 py-2 rounded-md border border-omega-dark-gold bg-omega-green text-omega-gold"
      >
        <option value="all">All Types</option>
        <option value="crypto">Crypto</option>
        <option value="stock">Stock</option>
        <option value="forex">Forex</option>
      </select>

      {/* Status Filter */}
      <select
        value={filters.status}
        onChange={(e) => updateFilter("status", e.target.value)}
        className="px-3 py-2 rounded-md border border-omega-dark-gold bg-omega-green text-omega-gold"
      >
        <option value="all">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="TP1 HIT">TP1</option>
        <option value="TP2 HIT">TP2</option>
        <option value="SL HIT">Stoploss</option>
        <option value="EXPIRED">Expired</option>
      </select>
    </div>
  );
}
