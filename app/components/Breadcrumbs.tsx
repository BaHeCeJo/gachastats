"use client";

import Link from 'next/link';
import { LocalizedString, getTranslatedField, useLocalizationParams } from "@/lib/localization"; // Import localization

type Breadcrumb = {
  href: string;
  label: string | LocalizedString; // Label can be string or LocalizedString
};

type Props = {
  crumbs: Breadcrumb[];
};

export default function Breadcrumbs({ crumbs }: Props) {
  const { currentLang, gameDefaultLang } = useLocalizationParams(); // Use localization params

  return (
    <nav className="text-sm text-gray-400" aria-label="Breadcrumb">
      <ol className="list-none p-0 inline-flex">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const displayLabel = typeof crumb.label === 'string'
            ? crumb.label
            : getTranslatedField(crumb.label, currentLang, gameDefaultLang);

          return (
            <li key={index} className="flex items-center">
              {isLast ? (
                <span className="font-medium text-gray-200">{displayLabel}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-white transition-colors">
                  {displayLabel}
                </Link>
              )}
              {!isLast && (
                <span className="mx-2" aria-hidden="true">/</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
