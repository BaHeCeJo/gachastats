"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = {
  id: string;
  value_key: string;
};

type Field = {
  id: string;
  key: string;
  field_options?: Option[];
};

type Props = {
  fields: Field[];
};

export default function SectionFilter({ fields }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleFilterChange(fieldId: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(`filter_${fieldId}`, value);
    } else {
      params.delete(`filter_${fieldId}`);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
      {fields.map((field) => (
        <div key={field.id} className="flex items-center gap-2">
          <span className="text-sm text-gray-400 whitespace-nowrap">
            {field.key}:
          </span>
          <select
            className="bg-gray-800 text-white text-xs border border-gray-700 rounded p-1"
            defaultValue={searchParams.get(`filter_${field.id}`) || ""}
            onChange={(e) => handleFilterChange(field.id, e.target.value)}
          >
            <option value="">All</option>
            {field.field_options
              ?.sort((a, b) => a.value_key.localeCompare(b.value_key))
              .map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.value_key}
                </option>
              ))}
          </select>
        </div>
      ))}
    </div>
  );
}
