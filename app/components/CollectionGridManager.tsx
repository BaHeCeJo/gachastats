"use client";

import { useState, useMemo, useTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LocalizedString, getTranslatedField, useLocalizationParams } from "@/lib/localization";
import { toggleCollectionEntityAction, updateEntityDupesAction, removeUserEntityAction, updateUserEntityStatsAction } from "@/lib/actions/collection";
import { X } from "lucide-react";
import { useEntityFiltering } from "@/lib/hooks/useEntityFiltering";
import { FilterBar } from "./FilterBar";
import { EntityCard } from "./EntityCard";
import { SectionAscension } from "@/lib/supabase/queries";

type Option = { id: string; value_key: LocalizedString; iconUrl?: string; color?: string; };
type FilterField = { id: string; key: LocalizedString; options: Option[]; };
type Entity = { id: string; name: LocalizedString; publicIconUrl: string; fieldValuesMap: Record<string, { color?: string; iconUrl?: string }>; allValues: Record<string, string[]>; availableLevels?: { level: number; phase_index: number; }[]; };
type OwnedEntity = { id: string; entity_id: string; dupes: number; level: number; phase_index: number; };
type Section = { id: string; is_unique: boolean; max_dupes: number; min_dupes: number; dupe_name: LocalizedString; is_collectible: boolean; has_stats: boolean; has_ascension: boolean; max_level: number; };
type DisplaySettings = { max_columns?: number; bg_color_field_id?: string | null; top_left_icon_field_id?: string | null; top_right_icon_field_id?: string | null; overlay_icon_field_id?: string | null; };

/**
 * Renders the segments for the duplicate slider.
 */
function Segments({ current, min, max }: { current: number; min: number; max: number }) {
  const total = max - min;
  if (total <= 0) return null;
  return (
    <div className="flex gap-1 mt-2 w-full">
      {Array.from({ length: total }).map((_, i) => {
        const val = min + i + 1;
        return (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${val <= current ? "bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-zinc-800"}`} />
        );
      })}
    </div>
  );
}

/**
 * Renders the stat controls for an entity instance.
 */
function StatControls({ instance, section, ascensions, entityLevels, onUpdateStats }: { instance: OwnedEntity; section: Section; ascensions: SectionAscension[]; entityLevels: { level: number; phase_index: number; }[]; onUpdateStats: (id: string, lvl: number, p: number) => void; }) {
  if (!section.has_stats) return null;

  // Filter levels for the currently selected phase if ascension is enabled
  const currentLevels = section.has_ascension 
    ? entityLevels.filter(l => l.phase_index === instance.phase_index)
    : entityLevels;

  return (
    <div className="space-y-3 pt-4 border-t border-white/5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <label className="text-[9px] font-black uppercase text-zinc-500 tracking-tighter block mb-1">Level (Choose Closest)</label>
          <div className="flex items-center gap-2">
            <select 
              value={instance.level} 
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onUpdateStats(instance.id, Number(e.target.value), instance.phase_index)}
              className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-[#22c55e] font-bold focus:outline-none focus:border-[#22c55e]/50 appearance-none cursor-pointer"
            >
              {currentLevels.length > 0 ? (
                currentLevels.map(l => (
                  <option key={`${l.level}-${l.phase_index}`} value={l.level}>Lv. {l.level}</option>
                ))
              ) : (
                <option value={instance.level}>Lv. {instance.level}</option>
              )}
            </select>
          </div>
        </div>
        {section.has_ascension && (
          <div className="flex-1 space-y-1">
            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-tighter block mb-1">Phase</label>
            <select 
              value={instance.phase_index} 
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const newPhaseIdx = Number(e.target.value);
                const nextLevels = entityLevels.filter(l => l.phase_index === newPhaseIdx);
                let newLvl = instance.level;
                if (nextLevels.length > 0) {
                  // Find closest level in the new phase
                  const closest = nextLevels.reduce((prev, curr) => 
                    Math.abs(curr.level - newLvl) < Math.abs(prev.level - newLvl) ? curr : prev
                  );
                  newLvl = closest.level;
                }
                onUpdateStats(instance.id, newLvl, newPhaseIdx);
              }}
              className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-white font-bold focus:outline-none focus:border-[#22c55e]/50 appearance-none cursor-pointer"
            >
              {ascensions.map(a => (
                <option key={a.id} value={a.phase_index}>Phase {a.phase_index}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

interface ItemProps {
  entity: Entity; 
  ownedMap: Record<string, OwnedEntity[]>; 
  pendingId: string | null; 
  activeManageId: string | null;
  displaySettings: DisplaySettings | null; 
  activeLang: string; 
  gameDefaultLang: string; 
  isPending: boolean; 
  section: Section; 
  ascensions: SectionAscension[];
  dupeLabel: string; 
  t: (k: string) => string; 
  onToggle: (id: string, forceAdd?: boolean) => void; 
  onUpdateDupes: (id: string, n: number) => void; 
  onUpdateStats: (id: string, lvl: number, p: number) => void;
  onRemoveInstance: (id: string) => void;
}

/**
 * Renders the instance manager for non-unique items.
 */
function InstanceManager({ instances, section, ascensions, entityLevels, dupeLabel, t, onUpdateDupes, onUpdateStats, onRemoveInstance, onToggle, entityId }: { 
  instances: OwnedEntity[]; 
  section: Section; 
  ascensions: SectionAscension[];
  entityLevels: { level: number; phase_index: number; }[];
  dupeLabel: string; 
  t: (k: string) => string; 
  onUpdateDupes: (id: string, n: number) => void; 
  onUpdateStats: (id: string, lvl: number, p: number) => void;
  onRemoveInstance: (id: string) => void; 
  onToggle: (id: string, forceAdd?: boolean) => void; 
  entityId: string 
}) {
  return (
    <div className="bg-zinc-900/95 border border-zinc-800 backdrop-blur-2xl rounded-2xl p-4 shadow-3xl space-y-4 min-w-[280px] mb-4">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-zinc-800/50 pb-3 flex justify-between items-center"><span>{t('manageCollection')}</span><div className="px-2 py-0.5 bg-[#22c55e]/10 text-[#22c55e] rounded-md text-[10px]">x{instances.length}</div></div>
      <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        {instances.map((ins, idx) => (
          <div key={ins.id} className="space-y-3 p-3 bg-black/40 rounded-xl border border-white/5 group/instance">
            <div className="flex items-center justify-between"><span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">Instance #{idx + 1}</span><button onClick={(e) => { e.stopPropagation(); onRemoveInstance(ins.id); }} className="text-zinc-700 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button></div>
            <div className="space-y-2"><div className="flex justify-between items-center text-[10px] font-black"><span className="text-zinc-400 uppercase tracking-tighter">{dupeLabel}</span><span className="text-[#22c55e]">{ins.dupes}</span></div><input type="range" min={section.min_dupes} max={section.max_dupes} value={ins.dupes} onClick={(e) => e.stopPropagation()} onChange={(e) => onUpdateDupes(ins.id, Number(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#22c55e]" /><Segments current={ins.dupes} min={section.min_dupes} max={section.max_dupes} /></div>
            <StatControls instance={ins} section={section} ascensions={ascensions} entityLevels={entityLevels} onUpdateStats={onUpdateStats} />
          </div>
        ))}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onToggle(entityId, true); }} className="w-full py-2 text-[10px] font-black uppercase bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e] hover:text-black rounded-lg transition-all border border-[#22c55e]/20">{t('addEntity')}</button>
    </div>
  );
}

/**
 * Renders a single entity item in the collection grid.
 */
function CollectionEntityItem({
  entity, ownedMap, pendingId, activeManageId, displaySettings, activeLang, gameDefaultLang, isPending, section, ascensions, dupeLabel, t, onToggle, onUpdateDupes, onUpdateStats, onRemoveInstance
}: ItemProps) {
  const instances = useMemo(() => (ownedMap[entity.id as keyof typeof ownedMap] as OwnedEntity[]) || [], [ownedMap, entity.id]);
  const isOwned = instances.length > 0;
  const isToggling = pendingId === entity.id;
  const isManaging = activeManageId === entity.id;

  const badgeContent = useMemo(() => {
    if (!isOwned) return null;
    const first = instances[0];
    let content = "";
    if (section.is_unique) {
      if (section.max_dupes > section.min_dupes) content += `${dupeLabel} ${first.dupes}`;
      if (section.has_stats) content += `${content ? ' | ' : ''}Lv. ${first.level}`;
    } else {
      content = `x${instances.length}`;
    }
    return <span className="text-[10px] font-black text-[#22c55e]">{content}</span>;
  }, [isOwned, instances, section, dupeLabel]);

  return (
    <div className="relative group">
      <EntityCard entity={entity} displaySettings={displaySettings} currentLang={activeLang} gameDefaultLang={gameDefaultLang} isOwned={isOwned} isToggling={isToggling} isDisabled={isPending && !isToggling} onToggle={onToggle} badgeContent={badgeContent} />
      
      {isManaging && section.is_unique && instances[0] && (
        <div className="absolute inset-x-0 bottom-0 bg-black/95 backdrop-blur-3xl p-4 translate-y-full transition-transform duration-300 z-50 border-t border-white/5 rounded-b-3xl min-w-[200px]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em]">{t('manage')}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onRemoveInstance(instances[0].id); }}
              className="w-6 h-6 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
              title={t('remove')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {section.max_dupes > section.min_dupes && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1"><span className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter">{dupeLabel}</span>{instances[0].dupes > section.min_dupes && (<span className="text-[12px] font-black text-[#22c55e]">{instances[0].dupes}</span>)}</div>
              <input type="range" min={section.min_dupes} max={section.max_dupes} value={instances[0].dupes} onClick={(e) => e.stopPropagation()} onChange={(e) => onUpdateDupes(instances[0].id, Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#22c55e]" />
              <Segments current={instances[0].dupes} min={section.min_dupes} max={section.max_dupes} />
            </div>
          )}
          <StatControls instance={instances[0]} section={section} ascensions={ascensions} entityLevels={entity.availableLevels || []} onUpdateStats={onUpdateStats} />
        </div>
      )}

      {isManaging && !section.is_unique && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1 z-40 translate-y-full transition-all">
          <InstanceManager instances={instances} section={section} ascensions={ascensions} entityLevels={entity.availableLevels || []} dupeLabel={dupeLabel} t={t} onUpdateDupes={onUpdateDupes} onUpdateStats={onUpdateStats} onRemoveInstance={onRemoveInstance} onToggle={onToggle} entityId={entity.id} />
        </div>
      )}
    </div>
  );
}

export default function CollectionGridManager({
  entities, initialOwnedEntities, section, ascensions, displaySettings, filterFields, gameDefaultLang, currentLang: browserLang,
}: {
  entities: Entity[]; initialOwnedEntities: OwnedEntity[]; section: Section; ascensions: SectionAscension[]; displaySettings: DisplaySettings | null; filterFields: FilterField[]; gameDefaultLang: string; currentLang: string;
}) {
  const router = useRouter();
  const { displayLang, t } = useLocalizationParams();
  const activeLang = displayLang || browserLang;

  const [ownedEntities, setOwnedEntities] = useState<OwnedEntity[]>(initialOwnedEntities);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [activeManageId, setActiveManageId] = useState<string | null>(null);

  // Sync state when props change (e.g., after router.refresh())
  useEffect(() => {
    setOwnedEntities(initialOwnedEntities);
  }, [initialOwnedEntities]);

  const { activeFilters, toggleFilter, filteredEntities } = useEntityFiltering(entities, activeLang, gameDefaultLang);

  const ownedMap = useMemo(() => {
    const map: Record<string, OwnedEntity[]> = {};
    ownedEntities.forEach(oe => {
      if (!map[oe.entity_id as keyof typeof map]) map[oe.entity_id as keyof typeof map] = [];
      (map[oe.entity_id as keyof typeof map] as OwnedEntity[]).push(oe);
    });
    return map;
  }, [ownedEntities]);

  const onToggleComplete = useCallback(async (entityId: string, tempId: string) => {
    const res = await toggleCollectionEntityAction(entityId, false);
    if (res.success) {
      router.refresh(); 
    } else {
      alert(res.error);
      setOwnedEntities(prev => prev.filter(oe => oe.id !== tempId));
    }
    setPendingId(null);
  }, [router]);

  const handleToggle = useCallback((entityId: string, forceAdd?: boolean) => {
    const instances = (ownedMap[entityId as keyof typeof ownedMap] || []);
    const isOwned = instances.length > 0;
    
    // Toggle management popover if already owned
    if (isOwned && !forceAdd) {
      setActiveManageId(prev => prev === entityId ? null : entityId);
      return;
    }

    setPendingId(entityId);

    let tempId: string;
    if (typeof crypto.randomUUID === 'function') {
      tempId = crypto.randomUUID();
    } else {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      tempId = array[0].toString(36);
    }
    
    setOwnedEntities(prev => [...prev, { id: tempId, entity_id: entityId, dupes: 0, level: 1, phase_index: 0 }]);
    startTransition(() => {
      onToggleComplete(entityId, tempId);
    });
  }, [ownedMap, onToggleComplete]);

  const onUpdateDupesComplete = useCallback(async (instanceId: string, newDupes: number) => {
    const res = await updateEntityDupesAction(instanceId, newDupes);
    if (!res.success) alert(res.error);
  }, []);

  const updateDupes = useCallback((instanceId: string, newDupes: number) => {
    if (newDupes < section.min_dupes || newDupes > section.max_dupes) return;
    setOwnedEntities(prev => prev.map(oe => oe.id === instanceId ? { ...oe, dupes: newDupes } : oe));
    startTransition(() => {
      onUpdateDupesComplete(instanceId, newDupes);
    });
  }, [section.min_dupes, section.max_dupes, onUpdateDupesComplete]);

  const onUpdateStatsComplete = useCallback(async (instanceId: string, level: number, phase_index: number) => {
    const res = await updateUserEntityStatsAction(instanceId, level, phase_index);
    if (!res.success) alert(res.error);
  }, []);

  const updateStats = useCallback((instanceId: string, level: number, phase_index: number) => {
    setOwnedEntities(prev => prev.map(oe => oe.id === instanceId ? { ...oe, level, phase_index } : oe));
    startTransition(() => {
      onUpdateStatsComplete(instanceId, level, phase_index);
    });
  }, [onUpdateStatsComplete]);

  const onRemoveComplete = useCallback(async (instanceId: string) => {
    const res = await removeUserEntityAction(instanceId);
    if (!res.success) {
      alert(res.error);
      router.refresh();
    } else {
      // Clear manage ID if last instance removed
      setActiveManageId(null);
    }
  }, [router]);

  const removeInstance = useCallback((instanceId: string) => {
    setOwnedEntities(prev => prev.filter(oe => oe.id !== instanceId));
    startTransition(() => {
      onRemoveComplete(instanceId);
    });
  }, [onRemoveComplete]);

  const dupeLabel = getTranslatedField(section.dupe_name, activeLang, gameDefaultLang);
  const maxCols = displaySettings?.max_columns ?? 6;

  return (
    <div className="space-y-12">
      <FilterBar filterFields={filterFields} activeFilters={activeFilters} onToggleFilter={toggleFilter} currentLang={activeLang} gameDefaultLang={gameDefaultLang} />
      <div className="grid gap-x-6 gap-y-10 justify-center lg:justify-start" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(160px, 1fr))`, maxWidth: `${maxCols * 160 + (maxCols - 1) * 24}px` }}>
        {filteredEntities.map(e => (
          <CollectionEntityItem key={e.id} entity={e} ownedMap={ownedMap} pendingId={pendingId} activeManageId={activeManageId} displaySettings={displaySettings} activeLang={activeLang} gameDefaultLang={gameDefaultLang} isPending={isPending} section={section} ascensions={ascensions} dupeLabel={dupeLabel} t={t} onToggle={handleToggle} onUpdateDupes={updateDupes} onUpdateStats={updateStats} onRemoveInstance={removeInstance} />
        ))}
      </div>
    </div>
  );
}
