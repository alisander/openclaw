"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type PricingEntry = {
  id: string;
  provider: string;
  model: string;
  inputCostPerMtok: number;
  outputCostPerMtok: number;
  marginPercent: number;
  createdAt?: string;
  updatedAt?: string;
};

type PricingResponse = {
  pricing: PricingEntry[];
};

export default function AdminPricingPage() {
  const [entries, setEntries] = useState<PricingEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Form state
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<string | null>(null);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [inputCost, setInputCost] = useState("");
  const [outputCost, setOutputCost] = useState("");
  const [marginPercent, setMarginPercent] = useState("");
  const [showForm, setShowForm] = useState(false);

  const fetchPricing = useCallback(() => {
    setLoading(true);
    api<PricingResponse>("/api/admin/pricing")
      .then((data) => {
        setEntries(data.pricing);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  function resetForm() {
    setFormMode("add");
    setEditId(null);
    setProvider("");
    setModel("");
    setInputCost("");
    setOutputCost("");
    setMarginPercent("");
    setShowForm(false);
  }

  function startEdit(entry: PricingEntry) {
    setFormMode("edit");
    setEditId(entry.id);
    setProvider(entry.provider);
    setModel(entry.model);
    setInputCost(String(entry.inputCostPerMtok));
    setOutputCost(String(entry.outputCostPerMtok));
    setMarginPercent(String(entry.marginPercent));
    setShowForm(true);
  }

  async function handleSubmit() {
    const inputVal = parseFloat(inputCost);
    const outputVal = parseFloat(outputCost);
    const marginVal = parseFloat(marginPercent);

    if (!provider.trim() || !model.trim()) {
      toast.error("Provider and model are required");
      return;
    }
    if (isNaN(inputVal) || isNaN(outputVal) || inputVal < 0 || outputVal < 0) {
      toast.error("Input and output costs must be valid non-negative numbers");
      return;
    }
    if (isNaN(marginVal) || marginVal < 0) {
      toast.error("Margin percent must be a valid non-negative number");
      return;
    }

    const body = {
      id: editId || undefined,
      provider: provider.trim(),
      model: model.trim(),
      inputCostPerMtok: inputVal,
      outputCostPerMtok: outputVal,
      marginPercent: marginVal,
    };

    try {
      await api("/api/admin/pricing", { method: "POST", body });
      toast.success(formMode === "add" ? "Pricing entry added" : "Pricing entry updated");
      resetForm();
      fetchPricing();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete(id: string, modelName: string) {
    if (!confirm(`Delete pricing for "${modelName}"?`)) return;
    try {
      await api(`/api/admin/pricing/${id}`, { method: "DELETE" });
      toast.success("Pricing entry deleted");
      fetchPricing();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  }

  if (error && !entries.length) {
    return <div className="p-8 text-destructive">Error: {error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Model Pricing</h1>
        {!showForm && (
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="size-4" />
            Add Pricing
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === "add" ? "Add New Pricing" : "Edit Pricing"}
            </DialogTitle>
            <DialogDescription>
              {formMode === "add"
                ? "Configure pricing for a new model."
                : "Update pricing configuration for this model."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Input
                id="provider"
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. anthropic, openai"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. claude-sonnet-4-5-20250929"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inputCost">Input Cost ($/Mtok)</Label>
              <Input
                id="inputCost"
                type="number"
                step="0.01"
                min="0"
                value={inputCost}
                onChange={(e) => setInputCost(e.target.value)}
                placeholder="3.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outputCost">Output Cost ($/Mtok)</Label>
              <Input
                id="outputCost"
                type="number"
                step="0.01"
                min="0"
                value={outputCost}
                onChange={(e) => setOutputCost(e.target.value)}
                placeholder="15.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marginPercent">Margin %</Label>
              <Input
                id="marginPercent"
                type="number"
                step="0.1"
                min="0"
                value={marginPercent}
                onChange={(e) => setMarginPercent(e.target.value)}
                placeholder="30"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {formMode === "add" ? "Add Entry" : "Update Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Table */}
      {loading ? (
        <div className="p-8 text-muted-foreground">Loading...</div>
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Input $/Mtok</TableHead>
                  <TableHead className="text-right">Output $/Mtok</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead className="text-right">Effective Input</TableHead>
                  <TableHead className="text-right">Effective Output</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No pricing entries configured. Click &quot;Add Pricing&quot; to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((e) => {
                    const effectiveInput = e.inputCostPerMtok * (1 + e.marginPercent / 100);
                    const effectiveOutput = e.outputCostPerMtok * (1 + e.marginPercent / 100);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="capitalize">
                          <Badge variant="outline">{e.provider}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {e.model}
                        </TableCell>
                        <TableCell className="text-right">
                          ${e.inputCostPerMtok.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ${e.outputCostPerMtok.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {e.marginPercent.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right text-sm text-emerald-400">
                          ${effectiveInput.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-emerald-400">
                          ${effectiveOutput.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => startEdit(e)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon-sm"
                              onClick={() => handleDelete(e.id, e.model)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
