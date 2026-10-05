"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  BeneficiaryPicker,
  type BeneficiaryOption,
  type GroupOption,
} from "@/components/assignments/beneficiary-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ASSET_CATEGORIES, PRIORITIES } from "@/lib/constants";
import { useT } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/utils";

type AssetRow = {
  id: number;
  title: string;
  category: keyof typeof ASSET_CATEGORIES;
  description: string | null;
  details: string | null;
  priority: keyof typeof PRIORITIES;
  createdAt: string;
  updatedAt: string;
  recipientLabel: string | null;
};

export default function VarliklarPage() {
  const t = useT();
  const [items, setItems] = useState<AssetRow[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignments, setAssignments] = useState({
    beneficiaryIds: [] as number[],
    groupIds: [] as number[],
  });
  const [form, setForm] = useState({
    title: "",
    category: "hesap" as keyof typeof ASSET_CATEGORIES,
    description: "",
    details: "",
    priority: "orta" as keyof typeof PRIORITIES,
  });

  async function load() {
    const [assetsRes, beneficiariesRes, groupsRes] = await Promise.all([
      fetch("/api/assets"),
      fetch("/api/beneficiaries"),
      fetch("/api/groups"),
    ]);
    setItems(await assetsRes.json());

    const beneficiaryRows = await beneficiariesRes.json();
    setBeneficiaries(
      beneficiaryRows.map((row: { id: number; name: string; relationship: string }) => ({
        id: row.id,
        name: row.name,
        relationship: row.relationship,
      })),
    );

    const groupRows = await groupsRes.json();
    setGroups(
      groupRows.map(
        (group: {
          id: number;
          name: string;
          memberCount: number;
          members: { name: string }[];
        }) => ({
          id: group.id,
          name: group.name,
          memberCount: group.memberCount,
          memberNames: group.members.map((member) => member.name),
        }),
      ),
    );

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        beneficiaryIds: assignments.beneficiaryIds,
        groupIds: assignments.groupIds,
      }),
    });
    setForm({
      title: "",
      category: "hesap",
      description: "",
      details: "",
      priority: "orta",
    });
    setAssignments({ beneficiaryIds: [], groupIds: [] });
    await load();
    setSaving(false);
  }

  async function handleDelete(id: number) {
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("assets.title")}</h1>
        <p className="mt-2 text-slate-400">{t("assets.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("assets.newAsset")}
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("assets.titleField")}
              </label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("assets.titlePlaceholder")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("assets.category")}
              </label>
              <Select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value as keyof typeof ASSET_CATEGORIES,
                  })
                }
              >
                {Object.keys(ASSET_CATEGORIES).map((key) => (
                  <option key={key} value={key}>
                    {t(`assetCategories.${key}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("assets.priority")}
              </label>
              <Select
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value as keyof typeof PRIORITIES,
                  })
                }
              >
                {Object.keys(PRIORITIES).map((key) => (
                  <option key={key} value={key}>
                    {t(`priorities.${key}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <BeneficiaryPicker
                beneficiaries={beneficiaries}
                groups={groups}
                selectedBeneficiaryIds={assignments.beneficiaryIds}
                selectedGroupIds={assignments.groupIds}
                onChange={setAssignments}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("assets.description")}
              </label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder={t("assets.descriptionPlaceholder")}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("assets.details")}
              </label>
              <Textarea
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                placeholder={t("assets.detailsPlaceholder")}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving") : t("assets.addButton")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("assets.saved")}
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              {t("assets.empty")}
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start justify-between gap-4 pt-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      {t(`assetCategories.${item.category}`)}
                    </span>
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                      {t(`priorities.${item.priority}`)}
                    </span>
                  </div>
                  {item.recipientLabel && (
                    <p className="mt-1 text-sm text-sky-400">
                      {t("assets.recipients")}: {item.recipientLabel}
                    </p>
                  )}
                  {item.description && (
                    <p className="mt-2 text-sm text-slate-400">{item.description}</p>
                  )}
                  {item.details && (
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-950/60 p-3 text-sm text-slate-500">
                      {item.details}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-600">
                    {t("common.updatedAt")}: {formatDate(item.updatedAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  aria-label={t("common.delete")}
                >
                  <Trash2 className="h-4 w-4 text-rose-400" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
