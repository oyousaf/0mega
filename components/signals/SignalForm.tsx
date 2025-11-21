"use client";

import { useState } from "react";
import { TextField, Button, MenuItem } from "@mui/material";
import { updateSignal } from "@/app/signals/actions/updateSignal";

type SignalFormProps = {
  mode: "add" | "edit";
  initialData?: any;
  submitLabel?: string;
  onSubmit?: (data: any) => Promise<void>;
  onSuccess?: () => void;
};

export default function SignalForm({
  mode,
  initialData,
  submitLabel,
  onSubmit,
  onSuccess,
}: SignalFormProps) {
  const [form, setForm] = useState(
    initialData || {
      symbol: "",
      strategy: "",
      entry_price: "",
      tp1: "",
      tp2: "",
      sl: "",
      status: "active",
      type: "stock",
      halaal: true,
    }
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Parent submit handler (Add or Edit)
    if (onSubmit) {
      await onSubmit(form);
      onSuccess?.();
      setLoading(false);
      return;
    }

    // Internal behaviour (Edit or Add)
    if (mode === "edit") {
      await updateSignal(form.id, form);
      setMessage("Updated successfully.");
    } else {
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      setMessage(res.ok ? "Added successfully." : "Failed.");
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-omega-green p-6 rounded-lg shadow-md border border-omega-dark-gold"
    >
      {/* Symbol */}
      <TextField
        label="Symbol"
        variant="filled"
        fullWidth
        required
        value={form.symbol}
        onChange={(e) => setForm({ ...form, symbol: e.target.value })}
        slotProps={{
          inputLabel: { sx: { color: "white" } },
          input: { sx: { color: "white" } },
        }}
      />

      {/* Strategy */}
      <TextField
        label="Strategy"
        variant="filled"
        fullWidth
        value={form.strategy}
        onChange={(e) => setForm({ ...form, strategy: e.target.value })}
        slotProps={{
          inputLabel: { sx: { color: "white" } },
          input: { sx: { color: "white" } },
        }}
      />

      {/* Entry Price */}
      <TextField
        label="Entry Price"
        variant="filled"
        fullWidth
        required
        value={form.entry_price}
        onChange={(e) => setForm({ ...form, entry_price: e.target.value })}
        slotProps={{
          inputLabel: { sx: { color: "white" } },
          input: { sx: { color: "white" } },
        }}
      />

      {/* TP1 / TP2 / SL */}
      <div className="grid grid-cols-3 gap-2">
        {["tp1", "tp2", "sl"].map((key) => (
          <TextField
            key={key}
            label={key.toUpperCase()}
            variant="filled"
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            slotProps={{
              inputLabel: { sx: { color: "white" } },
              input: { sx: { color: "white" } },
            }}
          />
        ))}
      </div>

      {/* Type */}
      <TextField
        select
        label="Type"
        variant="filled"
        fullWidth
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value })}
        sx={{
          "& .MuiSelect-select": { color: "white" },
          "& .MuiSelect-icon": { color: "white" },
          "& .MuiFilledInput-root": {
            backgroundColor: "rgba(255,255,255,0.05)",
          },
        }}
      >
        <MenuItem value="stock" sx={{ color: "white" }}>
          Stock
        </MenuItem>
        <MenuItem value="crypto" sx={{ color: "white" }}>
          Crypto
        </MenuItem>
      </TextField>

      {/* Submit */}
      <Button
        type="submit"
        variant="contained"
        disabled={loading}
        sx={{
          backgroundColor: "var(--omega-gold)",
          color: "var(--omega-green)",
          fontWeight: 600,
          "&:hover": { backgroundColor: "var(--omega-dark-gold)" },
        }}
        fullWidth
      >
        {loading
          ? "Saving..."
          : submitLabel
          ? submitLabel
          : mode === "edit"
          ? "Save Changes"
          : "Add Signal"}
      </Button>

      {message && (
        <p className="text-sm text-foreground opacity-90">{message}</p>
      )}
    </form>
  );
}
