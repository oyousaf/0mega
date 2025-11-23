"use client";

import { useState, useEffect } from "react";
import {
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
} from "@mui/material";

import { Signal } from "@/app/types/signal";

type Props = {
  mode: "add" | "edit";
  initialData?: Partial<Signal>;
  submitLabel?: string;
  onSubmit?: (data: Partial<Signal>) => Promise<void>;
  onSuccess?: () => void;
};

export default function SignalForm({
  mode,
  initialData,
  submitLabel,
  onSubmit,
  onSuccess,
}: Props) {
  const empty = {
    symbol: "",
    strategy: "",
    entry_price: "",
    tp1: "",
    tp2: "",
    sl: "",
    notes: "",
    type: "stock",
    halaal: true,
  };

  const [form, setForm] = useState<any>({ ...empty, ...initialData });
  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const showSnackbar = (m: string, s: "success" | "error") =>
    setSnackbar({ open: true, message: m, severity: s });

  useEffect(() => {
    if (initialData) {
      setForm({ ...empty, ...initialData });
    }
  }, [initialData]);

  const num = (v: any) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);

    const clean: Partial<Signal> = {
      symbol: form.symbol.trim(),
      strategy: form.strategy?.trim() || "",
      entry_price: num(form.entry_price),
      tp1: num(form.tp1),
      tp2: num(form.tp2),
      sl: num(form.sl),
      notes: form.notes?.trim() || "",
      type: form.type,
      halaal: Boolean(form.halaal),
    };

    try {
      if (onSubmit) {
        await onSubmit(clean);
        onSuccess?.();
        setLoading(false);
        return;
      }

      // Add mode
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      });

      if (!res.ok) throw new Error("Failed to add signal");

      showSnackbar("Signal added successfully", "success");
      setForm(empty);
    } catch (err) {
      console.error(err);
      showSnackbar("Something went wrong", "error");
    }

    setLoading(false);
  }

  const inputStyles = {
    "& .MuiFilledInput-root": {
      backgroundColor: "rgba(255,255,255,0.1)",
      color: "var(--omega-gold)",
    },
    "& .MuiFilledInput-input": { color: "var(--omega-gold)" },
    "& .MuiInputLabel-root": { color: "var(--omega-gold)" },
    "& .Mui-focused .MuiInputLabel-root": {
      color: "var(--omega-dark-gold)",
    },
  };

  return (
    <>
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
          sx={inputStyles}
          value={form.symbol}
          onChange={(e) => setForm({ ...form, symbol: e.target.value })}
        />

        {/* STRATEGY */}
        <TextField
          label="Strategy"
          variant="filled"
          fullWidth
          sx={inputStyles}
          value={form.strategy}
          onChange={(e) => setForm({ ...form, strategy: e.target.value })}
        />

        {/* ENTRY PRICE */}
        <TextField
          label="Entry Price"
          variant="filled"
          fullWidth
          required
          sx={inputStyles}
          value={form.entry_price}
          onChange={(e) => setForm({ ...form, entry_price: e.target.value })}
        />

        {/* TP1/TP2/SL */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "tp1", label: "TP1" },
            { key: "tp2", label: "TP2" },
            { key: "sl", label: "SL" },
          ].map((i) => (
            <TextField
              key={i.key}
              label={i.label}
              variant="filled"
              sx={inputStyles}
              value={form[i.key]}
              onChange={(e) => setForm({ ...form, [i.key]: e.target.value })}
            />
          ))}
        </div>

        {/* NOTES */}
        <TextField
          label="Notes"
          variant="filled"
          fullWidth
          multiline
          rows={3}
          sx={inputStyles}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        {/* TYPE */}
        <FormControl fullWidth variant="filled" sx={inputStyles}>
          <InputLabel>Type</InputLabel>
          <Select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <MenuItem value="stock">Stock</MenuItem>
            <MenuItem value="crypto">Crypto</MenuItem>
            <MenuItem value="forex">Forex</MenuItem>
          </Select>
        </FormControl>

        {/* HALAAL */}
        <FormControlLabel
          control={
            <Switch
              checked={form.halaal}
              onChange={(e) => setForm({ ...form, halaal: e.target.checked })}
              sx={{
                "& .MuiSwitch-thumb": { backgroundColor: "var(--omega-gold)" },
                "& .Mui-checked .MuiSwitch-thumb": {
                  backgroundColor: "var(--omega-dark-gold)",
                },
              }}
            />
          }
          label="Halaal"
          sx={{ color: "var(--omega-gold)" }}
        />

        {/* SUBMIT */}
        <Button
          type="submit"
          fullWidth
          disabled={loading}
          variant="contained"
          sx={{
            backgroundColor: "var(--omega-gold)",
            color: "var(--omega-green)",
            fontWeight: 600,
            "&:hover": { backgroundColor: "var(--omega-dark-gold)" },
          }}
        >
          {loading
            ? "Saving..."
            : submitLabel ?? (mode === "edit" ? "Save Changes" : "Add Signal")}
        </Button>
      </form>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          sx={{
            background:
              snackbar.severity === "success" ? "var(--omega-gold)" : "#d32f2f",
            color:
              snackbar.severity === "success" ? "var(--omega-green)" : "#fff",
            fontWeight: 600,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
