"use client";

import { useState } from "react";
import {
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";

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
  const emptyForm = {
    symbol: "",
    strategy: "",
    entry_price: "",
    tp1: "",
    tp2: "",
    sl: "",
    notes: "",
    status: "active",
    type: "stock",
    halaal: true,
  };

  const [form, setForm] = useState(initialData || emptyForm);
  const [loading, setLoading] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);

    try {
      if (onSubmit) {
        await onSubmit(form);
        onSuccess?.();
        setLoading(false);
        return;
      }

      // ADD MODE
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to add signal");

      showSnackbar("Signal added successfully", "success");
      setForm(emptyForm);
    } catch (err) {
      console.error(err);
      showSnackbar("Something went wrong", "error");
    }

    setLoading(false);
  }

  const filledStyles = {
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
        className="space-y-4 bg-omega-green p-6 rounded-lg shadow-md border border-omega-dark-gold transition-all duration-300"
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

        {/* TP1, TP2, SL */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "tp1", label: "TP1" },
            { key: "tp2", label: "TP2" },
            { key: "sl", label: "SL" },
          ].map((item) => (
            <TextField
              key={item.key}
              label={item.label}
              variant="filled"
              sx={filledStyles}
              value={(form as any)[item.key]}
              onChange={(e) =>
                setForm({
                  ...form,
                  [item.key]: e.target.value,
                })
              }
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
          sx={filledStyles}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        {/* TYPE */}
        <FormControl fullWidth variant="filled" sx={filledStyles}>
          <InputLabel>Type</InputLabel>
          <Select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            sx={{
              color: "var(--omega-gold)",
              "& .MuiSvgIcon-root": { color: "var(--omega-gold)" },
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
            <MenuItem value="stock">Stock</MenuItem>
            <MenuItem value="crypto">Crypto</MenuItem>
            <MenuItem value="forex">Forex</MenuItem>
          </Select>
        </FormControl>

        {/* SUBMIT BTN */}
        <Button
          type="submit"
          fullWidth
          disabled={loading}
          variant="contained"
          sx={{
            backgroundColor: "var(--omega-gold)",
            color: "var(--omega-green)",
            fontWeight: 600,
            "&:hover": {
              backgroundColor: "var(--omega-dark-gold)",
            },
            transition: "0.25s",
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
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          sx={{
            background:
              snackbar.severity === "success" ? "var(--omega-gold)" : "#d32f2f",
            color:
              snackbar.severity === "success" ? "var(--omega-green)" : "#fff",
            boxShadow: "0 0 10px rgba(0,0,0,0.3)",
            fontWeight: 600,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
