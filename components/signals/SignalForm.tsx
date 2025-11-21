"use client";

import { useState } from "react";
import {
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
} from "@mui/material";
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

    if (onSubmit) {
      await onSubmit(form);
      onSuccess?.();
      setLoading(false);
      return;
    }

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

  const filledStyles = {
    "& .MuiFilledInput-root": {
      backgroundColor: "rgba(255,255,255,0.08)",
      color: "var(--omega-gold)",
    },
    "& .MuiFilledInput-input": {
      color: "var(--omega-gold)",
    },
    "& .MuiInputLabel-root": {
      color: "var(--omega-gold)",
    },
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-omega-green p-6 rounded-lg shadow-md border border-omega-dark-gold"
    >
      {/* SYMBOL */}
      <TextField
        label="Symbol"
        variant="filled"
        fullWidth
        required
        sx={filledStyles}
        value={form.symbol}
        onChange={(e) => setForm({ ...form, symbol: e.target.value })}
      />

      {/* STRATEGY */}
      <TextField
        label="Strategy"
        variant="filled"
        fullWidth
        sx={filledStyles}
        value={form.strategy}
        onChange={(e) => setForm({ ...form, strategy: e.target.value })}
      />

      {/* ENTRY PRICE */}
      <TextField
        label="Entry Price"
        variant="filled"
        fullWidth
        required
        sx={filledStyles}
        value={form.entry_price}
        onChange={(e) => setForm({ ...form, entry_price: e.target.value })}
      />

      {/* TP1 TP2 SL */}
      <div className="grid grid-cols-3 gap-2">
        {["tp1", "tp2", "sl"].map((key) => (
          <TextField
            key={key}
            label={key.toUpperCase()}
            variant="filled"
            sx={filledStyles}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        ))}
      </div>

      {/* TYPE (Select v2) */}
      <FormControl fullWidth variant="filled" sx={filledStyles}>
        <InputLabel>Type</InputLabel>
        <Select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          sx={{
            color: "var(--omega-gold)",
            "& .MuiSvgIcon-root": {
              color: "var(--omega-gold)",
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: "var(--omega-green)",
                border: "1px solid var(--omega-dark-gold)",
                color: "var(--omega-gold)",
              },
            },
          }}
        >
          <MenuItem value="stock" sx={{ color: "var(--omega-gold)" }}>
            Stock
          </MenuItem>
          <MenuItem value="crypto" sx={{ color: "var(--omega-gold)" }}>
            Crypto
          </MenuItem>
          <MenuItem value="forex" sx={{ color: "var(--omega-gold)" }}>
            Forex
          </MenuItem>
        </Select>
      </FormControl>

      {/* SUBMIT */}
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
          : submitLabel ?? (mode === "edit" ? "Save Changes" : "Add Signal")}
      </Button>

      {message && (
        <p className="text-sm text-foreground opacity-90">{message}</p>
      )}
    </form>
  );
}
