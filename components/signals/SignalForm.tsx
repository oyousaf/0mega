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
import { useRouter } from "next/navigation";

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
    direction: "BUY",
    halaal: true,
  };

  const normalize = (v: any) => (v === null || v === undefined ? "" : v);

  const [form, setForm] = useState<any>({
    ...empty,
    ...Object.fromEntries(
      Object.entries(initialData || {}).map(([k, v]) => [k, normalize(v)])
    ),
  });

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const showSnackbar = (m: string, s: "success" | "error") =>
    setSnackbar({ open: true, message: m, severity: s });

  useEffect(() => {
    if (initialData) {
      setForm({
        ...empty,
        ...Object.fromEntries(
          Object.entries(initialData).map(([k, v]) => [k, normalize(v)])
        ),
      });
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
      notes: typeof form.notes === "string" ? form.notes.trim() : "",
      type: form.type,
      direction: form.direction,
      halaal: Boolean(form.halaal),
    };

    try {
      if (onSubmit) {
        await onSubmit(clean);
        onSuccess?.();
        setTimeout(() => router.push("/signals/active"), 600);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      });

      if (!res.ok) throw new Error("Failed to add signal");

      showSnackbar("Signal added successfully", "success");
      setTimeout(() => router.push("/signals/active"), 600);
      setForm(empty);
    } catch (err) {
      console.error(err);
      showSnackbar("Something went wrong", "error");
    }

    setLoading(false);
  }

  const inputStyles = {
    "& .MuiFilledInput-root": {
      backgroundColor: "var(--omega-green)",
      borderRadius: "12px",
      fontWeight: 600,
      color: "var(--omega-gold)",
      border: "1px solid var(--omega-gold)",
      "&:before, &:after": { display: "none" },
      "&:hover": { borderColor: "var(--omega-dark-gold)" },
      "&.Mui-focused": { borderColor: "var(--omega-dark-gold)" },
    },
    "& .MuiFilledInput-input": { color: "var(--omega-gold)" },
    "& .MuiInputLabel-root": {
      color: "var(--omega-gold)",
      fontWeight: 600,
    },
    "& .Mui-focused .MuiInputLabel-root": { color: "var(--omega-gold)" },
  };

  const selectMenuItem = {
    color: "var(--omega-gold)",
    fontWeight: 600,
    "&.Mui-selected": { backgroundColor: "rgba(255, 215, 0, 0.18)" },
    "&:hover": { backgroundColor: "rgba(255, 215, 0, 0.1)" },
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-omega-green p-6 rounded-lg shadow-md border border-omega-dark-gold"
      >
        <TextField
          label="Symbol"
          variant="filled"
          fullWidth
          required
          sx={inputStyles}
          value={form.symbol}
          onChange={(e) => setForm({ ...form, symbol: e.target.value })}
        />

        <TextField
          label="Strategy"
          variant="filled"
          fullWidth
          sx={inputStyles}
          value={form.strategy}
          onChange={(e) => setForm({ ...form, strategy: e.target.value })}
        />

        <TextField
          label="Entry Price"
          variant="filled"
          fullWidth
          required
          sx={inputStyles}
          value={form.entry_price}
          onChange={(e) => setForm({ ...form, entry_price: e.target.value })}
        />

        <div className="grid grid-cols-3 gap-2">
          {["tp1", "tp2", "sl"].map((key) => (
            <TextField
              key={key}
              label={key.toUpperCase()}
              variant="filled"
              sx={inputStyles}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ))}
        </div>

        <TextField
          label="Notes"
          variant="filled"
          fullWidth
          multiline
          rows={3}
          sx={inputStyles}
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        {/* ASSET TYPE */}
        <FormControl fullWidth variant="filled" sx={inputStyles}>
          <InputLabel>Type</InputLabel>
          <Select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: "var(--omega-green)",
                  border: "1px solid var(--omega-dark-gold)",
                },
              },
            }}
          >
            <MenuItem value="stock" sx={selectMenuItem}>
              Stock
            </MenuItem>
            <MenuItem value="crypto" sx={selectMenuItem}>
              Crypto
            </MenuItem>
            <MenuItem value="forex" sx={selectMenuItem}>
              Forex
            </MenuItem>
          </Select>
        </FormControl>

        {/* TRADE DIRECTION */}
        <FormControl fullWidth variant="filled" sx={inputStyles}>
          <InputLabel>Direction</InputLabel>
          <Select
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: "var(--omega-green)",
                  border: "1px solid var(--omega-dark-gold)",
                },
              },
            }}
          >
            <MenuItem value="BUY" sx={selectMenuItem}>
              Buy
            </MenuItem>
            <MenuItem value="SELL" sx={selectMenuItem}>
              Sell
            </MenuItem>
          </Select>
        </FormControl>

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
                "& .MuiSwitch-track": {
                  backgroundColor: "rgba(255, 215, 0, 0.4)",
                },
              }}
            />
          }
          label="Halaal"
          sx={{ color: "var(--omega-gold)", fontWeight: 600 }}
        />

        <Button
          type="submit"
          fullWidth
          disabled={loading}
          variant="contained"
          sx={{
            backgroundColor: "var(--omega-gold)",
            color: "var(--omega-green)",
            fontWeight: 700,
            py: 1.2,
            borderRadius: "12px",
            "&:hover": { backgroundColor: "var(--omega-dark-gold)" },
          }}
        >
          {loading
            ? "Saving..."
            : submitLabel ?? (mode === "edit" ? "Save Changes" : "Add Signal")}
        </Button>
      </form>

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
