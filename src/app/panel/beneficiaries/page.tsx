"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RELATIONSHIP_KEYS } from "@/lib/constants";
import { useT } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/utils";
import type { Beneficiary } from "@/lib/db/schema";

type GroupMember = {
  id: number;
  name: string;
  relationship: string;
};

type BeneficiaryGroup = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  members: GroupMember[];
  memberCount: number;
};

export default function MirasclarPage() {
  const t = useT();
  const [items, setItems] = useState<Beneficiary[]>([]);
  const [groups, setGroups] = useState<BeneficiaryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    relationship: RELATIONSHIP_KEYS[0] as string,
    notes: "",
  });
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    memberIds: [] as number[],
  });

  async function load() {
    const [beneficiariesRes, groupsRes] = await Promise.all([
      fetch("/api/beneficiaries"),
      fetch("/api/groups"),
    ]);
    setItems(await beneficiariesRes.json());
    setGroups(await groupsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({
      name: "",
      email: "",
      relationship: RELATIONSHIP_KEYS[0],
      notes: "",
    });
    await load();
    setSaving(false);
  }

  async function handleDelete(id: number) {
    await fetch(`/api/beneficiaries/${id}`, { method: "DELETE" });
    await load();
  }

  function resetGroupForm() {
    setGroupForm({ name: "", description: "", memberIds: [] });
    setEditingGroupId(null);
  }

  function toggleGroupMember(id: number) {
    setGroupForm((current) => ({
      ...current,
      memberIds: current.memberIds.includes(id)
        ? current.memberIds.filter((value) => value !== id)
        : [...current.memberIds, id],
    }));
  }

  function startEditGroup(group: BeneficiaryGroup) {
    setEditingGroupId(group.id);
    setGroupForm({
      name: group.name,
      description: group.description ?? "",
      memberIds: group.members.map((member) => member.id),
    });
  }

  async function handleGroupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingGroup(true);

    const payload = {
      name: groupForm.name,
      description: groupForm.description,
      memberIds: groupForm.memberIds,
    };

    if (editingGroupId) {
      await fetch(`/api/groups/${editingGroupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    resetGroupForm();
    await load();
    setSavingGroup(false);
  }

  async function handleDeleteGroup(id: number) {
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (editingGroupId === id) resetGroupForm();
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("beneficiaries.title")}
        </h1>
        <p className="mt-2 text-slate-400">{t("beneficiaries.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("beneficiaries.newBeneficiary")}
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("beneficiaries.name")}
              </label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("beneficiaries.namePlaceholder")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("beneficiaries.email")}
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t("common.optional")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("beneficiaries.relationship")}
              </label>
              <Select
                value={form.relationship}
                onChange={(e) =>
                  setForm({ ...form, relationship: e.target.value })
                }
              >
                {RELATIONSHIP_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`relationships.${key}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("beneficiaries.notes")}
              </label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("beneficiaries.notesPlaceholder")}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving") : t("beneficiaries.addButton")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {editingGroupId
                ? t("beneficiaries.groupEditTitle")
                : t("beneficiaries.groupTitle")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {t("beneficiaries.groupDesc")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGroupSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("beneficiaries.groupName")}
              </label>
              <Input
                required
                value={groupForm.name}
                onChange={(e) =>
                  setGroupForm({ ...groupForm, name: e.target.value })
                }
                placeholder={t("beneficiaries.groupNamePlaceholder")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                {t("beneficiaries.groupDescription")}
              </label>
              <Textarea
                value={groupForm.description}
                onChange={(e) =>
                  setGroupForm({ ...groupForm, description: e.target.value })
                }
                placeholder={t("beneficiaries.groupDescPlaceholder")}
              />
            </div>
            <div>
              <p className="mb-2 text-sm text-slate-400">
                {t("beneficiaries.groupMembers")}{" "}
                <span className="text-rose-400">*</span>
              </p>
              {items.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {t("beneficiaries.addMembersFirst")}
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 px-3 py-2.5 text-sm transition hover:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={groupForm.memberIds.includes(item.id)}
                        onChange={() => toggleGroupMember(item.id)}
                        className="rounded border-slate-600"
                      />
                      <span className="text-slate-200">{item.name}</span>
                      <span className="text-xs text-slate-500">
                        {t(`relationships.${item.relationship}`)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={savingGroup || items.length === 0}
              >
                {savingGroup
                  ? t("common.saving")
                  : editingGroupId
                    ? t("beneficiaries.updateGroup")
                    : t("beneficiaries.createGroup")}
              </Button>
              {editingGroupId && (
                <Button type="button" variant="secondary" onClick={resetGroupForm}>
                  {t("common.cancel")}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("beneficiaries.saved")}
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              {t("beneficiaries.empty")}
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start justify-between gap-4 pt-6">
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="mt-1 text-sm text-amber-400/90">
                    {t(`relationships.${item.relationship}`)}
                  </p>
                  {item.email && (
                    <p className="mt-1 text-sm text-slate-400">{item.email}</p>
                  )}
                  {item.notes && (
                    <p className="mt-2 text-sm text-slate-500">{item.notes}</p>
                  )}
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

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("beneficiaries.groupsTitle")}
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">{t("common.loading")}</p>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              {t("beneficiaries.groupsEmpty")}
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="flex items-start justify-between gap-4 pt-6">
                <div>
                  <p className="font-medium text-foreground">{group.name}</p>
                  {group.description && (
                    <p className="mt-1 text-sm text-slate-400">{group.description}</p>
                  )}
                  <p className="mt-2 text-sm text-sky-400">
                    {group.memberCount} {t("beneficiaries.peopleLabel")}:{" "}
                    {group.members.map((member) => member.name).join(", ")}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    {t("common.createdAt")}: {formatDate(group.createdAt)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditGroup(group)}
                    aria-label={t("common.edit")}
                  >
                    <Pencil className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGroup(group.id)}
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4 text-rose-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
