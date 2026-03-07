"use client";

import Image from "next/image";
import Link from "next/link";
import { LocalizedString, getTranslatedField } from "@/lib/localization";

export interface CardDisplaySettings {
  bg_color_field_id?: string | null;
  top_left_icon_field_id?: string | null;
  top_right_icon_field_id?: string | null;
  overlay_icon_field_id?: string | null;
}

export interface CardEntity {
  id: string;
  name: LocalizedString;
  publicIconUrl: string;
  fieldValuesMap: Record<string, { color?: string; iconUrl?: string }>;
}

interface EntityCardProps {
  entity: CardEntity;
  displaySettings: CardDisplaySettings | null;
  currentLang: string;
  gameDefaultLang: string;
  isOwned?: boolean;
  isToggling?: boolean;
  isDisabled?: boolean;
  onToggle?: (id: string) => void;
  href?: string;
  badgeContent?: React.ReactNode;
}

export function EntityCard({
  entity,
  displaySettings,
  currentLang,
  gameDefaultLang,
  isOwned = false,
  isToggling = false,
  isDisabled = false,
  onToggle,
  href,
  badgeContent,
}: EntityCardProps) {
  const bgValue = displaySettings?.bg_color_field_id ? entity.fieldValuesMap[displaySettings.bg_color_field_id] : null;
  const topLeftValue = displaySettings?.top_left_icon_field_id ? entity.fieldValuesMap[displaySettings.top_left_icon_field_id] : null;
  const topRightValue = displaySettings?.top_right_icon_field_id ? entity.fieldValuesMap[displaySettings.top_right_icon_field_id] : null;
  const overlayValue = displaySettings?.overlay_icon_field_id ? entity.fieldValuesMap[displaySettings.overlay_icon_field_id] : null;

  // Determine if this is a collection-style card (toggleable) or a navigation-style card (link)
  const isCollectionCard = !!onToggle;
  const isNavigationCard = !!href;

  const cardContent = (
    <>
      <div
        className="relative aspect-square overflow-hidden w-full transition-colors duration-500"
        style={{ 
          backgroundColor: (!isCollectionCard || isOwned) 
            ? (bgValue?.color || "#1a1a1a") 
            : "#121212" 
        }}
      >
        {overlayValue?.iconUrl && (
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <Image 
              src={overlayValue.iconUrl} 
              fill 
              sizes="160px" 
              className="object-contain opacity-10 pointer-events-none grayscale brightness-150" 
              alt="" 
            />
          </div>
        )}

        {entity.publicIconUrl ? (
          <Image 
            src={entity.publicIconUrl} 
            fill 
            sizes="160px" 
            className="object-cover relative z-10 transition-transform duration-700 group-hover:scale-110" 
            alt="" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-4xl font-black relative z-10">?</div>
        )}

        {badgeContent && (
          <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md rounded-lg px-2 py-1 z-30 flex items-center gap-1 border border-white/10">
            {badgeContent}
          </div>
        )}

        {topLeftValue?.iconUrl && (
          <div className="absolute top-2 left-2 w-8 h-8 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center p-1 z-20 shadow-xl border border-white/5">
            <div className="relative w-full h-full">
              <Image src={topLeftValue.iconUrl} fill sizes="32px" className="object-contain" alt="" />
            </div>
          </div>
        )}

        {topRightValue?.iconUrl && (
          <div className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center p-1 z-20 shadow-xl border border-white/5">
            <div className="relative w-full h-full">
              <Image src={topRightValue.iconUrl} fill sizes="32px" className="object-contain" alt="" />
            </div>
          </div>
        )}

        {isToggling && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className={`
        p-3 relative z-10 transition-colors duration-500
        ${isNavigationCard 
          ? "bg-black/90 group-hover:bg-[#22c55e] border-t border-zinc-800" 
          : (isOwned ? "bg-[#22c55e] border-t border-[#22c55e]" : "bg-zinc-900 border-t border-zinc-800")
        }
      `}>
        <h3 className={`
          text-[10px] font-black uppercase tracking-widest truncate transition-colors duration-500 text-center
          ${isNavigationCard 
            ? "text-zinc-200 group-hover:text-black" 
            : (isOwned ? "text-black" : "text-zinc-500")
          }
        `}>
          {getTranslatedField(entity.name, currentLang, gameDefaultLang)}
        </h3>
      </div>
    </>
  );

  const containerClassName = `
    relative flex flex-col transition-all duration-500 rounded-3xl overflow-hidden border-2 w-full group
    ${isNavigationCard 
      ? "border-zinc-800 hover:border-[#22c55e] hover:scale-105 hover:ring-2 hover:ring-[#22c55e]" 
      : (isOwned 
          ? "border-[#22c55e] scale-100 shadow-[0_0_30px_rgba(34,197,94,0.2)]" 
          : "border-zinc-800 scale-95 grayscale-[0.7] opacity-60 hover:grayscale-[0.3] hover:opacity-90 hover:border-zinc-600 hover:scale-100"
        )
    }
    active:scale-95
  `;

  if (href) {
    return (
      <Link href={href} className={containerClassName}>
        {cardContent}
      </Link>
    );
  }

  return (
    <button
      onClick={() => onToggle?.(entity.id)}
      disabled={isDisabled}
      className={containerClassName}
    >
      {cardContent}
    </button>
  );
}
