"use client";

import { Users } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export type BeneficiaryOption = {
  id: number;
  name: string;
  relationship: string;
};

export type GroupOption = {
  id: number;
  name: string;
  memberCount: number;
  memberNames: string[];
};

type BeneficiaryPickerProps = {
  beneficiaries: BeneficiaryOption[];
  groups: GroupOption[];
  selectedBeneficiaryIds: number[];
  selectedGroupIds: number[];
  onChange: (value: {
    beneficiaryIds: number[];
    groupIds: number[];
  }) => void;
  required?: boolean;
  className?: string;
};

export function BeneficiaryPicker({
  beneficiaries,
  groups,
  selectedBeneficiaryIds,
  selectedGroupIds,
  onChange,
  required,
  className,
}: BeneficiaryPickerProps) {
  const t = useT();
  function toggleBeneficiary(id: number) {
    const next = selectedBeneficiaryIds.includes(id)
      ? selectedBeneficiaryIds.filter((value) => value !== id)
      : [...selectedBeneficiaryIds, id];
    onChange({ beneficiaryIds: next, groupIds: selectedGroupIds });
  }

  function toggleGroup(id: number) {
    const next = selectedGroupIds.includes(id)
      ? selectedGroupIds.filter((value) => value !== id)
      : [...selectedGroupIds, id];
    onChange({ beneficiaryIds: selectedBeneficiaryIds, groupIds: next });
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <p className="mb-2 text-sm text-slate-400">
          {t("picker.beneficiaries")}{" "}
          {required && <span className="text-rose-400">*</span>}
        </p>
        {beneficiaries.length === 0 ? (
          <p className="text-xs text-slate-500">{t("picker.addFirst")}</p>
        ) : (
          <div className="space-y-2">
            {beneficiaries.map((beneficiary) => (
              <label
                key={beneficiary.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 px-3 py-2.5 text-sm transition hover:border-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedBeneficiaryIds.includes(beneficiary.id)}
                  onChange={() => toggleBeneficiary(beneficiary.id)}
                  className="rounded border-slate-600"
                />
                <span className="text-slate-200">{beneficiary.name}</span>
                <span className="text-xs text-slate-500">
                  {t(`relationships.${beneficiary.relationship}`)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 inline-flex items-center gap-2 text-sm text-slate-400">
          <Users className="h-4 w-4" />
          {t("picker.groups")}
        </p>
        {groups.length === 0 ? (
          <p className="text-xs text-slate-500">{t("picker.groupsHint")}</p>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <label
                key={group.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 px-3 py-2.5 text-sm transition hover:border-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedGroupIds.includes(group.id)}
                  onChange={() => toggleGroup(group.id)}
                  className="mt-1 rounded border-slate-600"
                />
                <div>
                  <p className="text-slate-200">{group.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {group.memberCount} {t("picker.people")}
                    {group.memberNames.length > 0
                      ? ` — ${group.memberNames.join(", ")}`
                      : ""}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
