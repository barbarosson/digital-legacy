"use client";

import { useEffect, useState } from "react";
import { Mail, Trash2 } from "lucide-react";
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
import { DELIVERY_TYPES, MESSAGE_STATUSES } from "@/lib/constants";
import { useT } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/utils";

type MessageRow = {
  id: number;
  title: string;
  content: string;
  deliveryType: keyof typeof DELIVERY_TYPES;
  status: keyof typeof MESSAGE_STATUSES;
  createdAt: string;
  recipientLabel: string | null;
};

export default function MesajlarPage() {
  const t = useT();
  const [items, setItems] = useState<MessageRow[]>([]);
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
    content: "",
    deliveryType: "manuel" as keyof typeof DELIVERY_TYPES,
    status: "taslak" as keyof typeof MESSAGE_STATUSES,
  });

  async function load() {
    const [messagesRes, beneficiariesRes, groupsRes] = await Promise.all([
      fetch("/api/messages"),
      fetch("/api/beneficiaries"),
      fetch("/api/groups"),
    ]);
    setItems(await messagesRes.json());

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
    await fetch("/api/messages", {
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
      content: "",
      deliveryType: "manuel",
      status: "taslak",
    });
    setAssignments({ beneficiaryIds: [], groupIds: [] });
    await load();
    setSaving(false);
  }

  async function handleDelete(id: number) {
    await fetch(`/api/messages/${id}`, { method: "DELETE" });
    await load();
  }

  const hasRecipients =
    assignments.beneficiaryIds.length > 0 || assignments.groupIds.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("messages.title")}
        </h1>
        <p className="mt-2 text-slate-400">{t("messages.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("messages.newMessage")}
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("messages.titleField")}
              </label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("messages.titlePlaceholder")}
              />
            </div>
            <div className="sm:col-span-2">
              <BeneficiaryPicker
                beneficiaries={beneficiaries}
                groups={groups}
                selectedBeneficiaryIds={assignments.beneficiaryIds}
                selectedGroupIds={assignments.groupIds}
                onChange={setAssignments}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("messages.deliveryType")}
              </label>
              <Select
                value={form.deliveryType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    deliveryType: e.target.value as keyof typeof DELIVERY_TYPES,
                  })
                }
              >
                {Object.keys(DELIVERY_TYPES).map((key) => (
                  <option key={key} value={key}>
                    {t(`deliveryTypes.${key}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("messages.content")}
              </label>
              <Textarea
                required
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={t("messages.contentPlaceholder")}
                className="min-h-40"
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={saving || beneficiaries.length === 0 || !hasRecipients}
              >
                {saving ? t("common.saving") : t("messages.saveButton")}
              </Button>
              {beneficiaries.length === 0 && (
                <p className="mt-2 text-sm text-amber-400/80">
                  {t("messages.addBeneficiaryFirst")}
                </p>
              )}
              {beneficiaries.length > 0 && !hasRecipients && (
                <p className="mt-2 text-sm text-amber-400/80">
                  {t("messages.pickRecipient")}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("messages.saved")}
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              {t("messages.empty")}
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
                      {t(`messageStatuses.${item.status}`)}
                    </span>
                  </div>
                  {item.recipientLabel && (
                    <p className="mt-1 text-sm text-sky-400">
                      {t("messages.recipients")}: {item.recipientLabel}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {t(`deliveryTypes.${item.deliveryType}`)}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-400">
                    {item.content}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    {t("common.createdAt")}: {formatDate(item.createdAt)}
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
