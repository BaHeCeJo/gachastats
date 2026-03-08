"use client";

import { useState, useActionState, useEffect, useMemo, use, useCallback } from 'react';
import { LocalizedString, getTranslatedField, GameLocalizationProvider, useLocalizationParams } from "@/lib/localization";
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import CreatableTagInput from '@/app/components/fields/CreatableTagInput';
import ImageInput from '@/app/components/ImageInput';
import ConfirmButton from '@/app/components/ConfirmButton';
import SkinManager from "@/app/components/skins/SkinManager";
import dynamic from "next/dynamic";
import { TeamData, TeamEntity, TeamFieldOption } from "@/app/components/teambuilder/types";
import { upsertEntityAction, deleteEntityAction } from '../actions';
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';
import Image from 'next/image';
import { getPublicUrl } from '@/lib/supabase/client';

const TeamBuilder = dynamic(() => import("@/app/components/TeamBuilder"), { 
  ssr: false, 
  loading: () => <div className="h-64 animate-pulse bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-400">Loading Team Builder...</div>
});

type GameData = { id: string; name: LocalizedString; slug: string; default_lang: string; supported_languages: string[]; };
type SectionData = { id: string; key: LocalizedString; game_id: string; skin_image_types: string[]; };
type FieldOption = { id: string; game_field_id: string; value_key: LocalizedString; icon_path: string | null; color: string | null; order_index: number; };
type FieldData = { id: string; game_field_id: string; key: LocalizedString; required: boolean; manual_fill: boolean; is_multi: boolean; has_icon: boolean; has_color: boolean; order_index: number; category: string | null; field_options: FieldOption[] | null; };
type EntityFieldValueData = { id?: string; entity_id?: string; game_field_id: string; value_text: string | LocalizedString | null; option_id: string | null; };
type EntitySkinData = { id: string; entity_id: string; name: LocalizedString; is_default: boolean; entity_images: { id: string; type: string; image_path: string; publicUrl?: string; }[]; };
type EntityData = { id: string; section_id: string; name: LocalizedString; icon_path: string | null; entity_skins: EntitySkinData[]; entity_field_values?: EntityFieldValueData[]; };
type FormState = { error?: string; };

interface LibraryEntity {
  id: string;
  name: LocalizedString;
  icon_path: string | null;
  entity_skins: { is_default: boolean; entity_images: { type: string; image_path: string; }[]; }[];
}

interface FieldValueState {
  field_id: string;
  values: string[];
}

/**
 * Calculates initial values for a specific field based on entity data.
 */
function getInitialValuesForField(field: FieldData, entityValues: EntityFieldValueData[], defaultLang: string): string[] {
  const existingValues = entityValues.filter(v => v.game_field_id === field.game_field_id);
  const firstVal = existingValues[0];
  if (!firstVal) return [];

  if (field.manual_fill) {
    const valText = firstVal.value_text;
    const translated = typeof valText === 'string' ? valText : getTranslatedField(valText || {}, defaultLang, defaultLang) || '';
    if (field.is_multi) return translated.split(',').map(s => s.trim()).filter(Boolean);
    
    let res: string[] = [];
    if (firstVal.option_id) res = [firstVal.option_id];
    else if (translated) res = [translated];
    return res;
  }

  if (field.is_multi) {
    if (firstVal.value_text && typeof firstVal.value_text === 'string') {
      return firstVal.value_text.split(',').map(s => s.trim()).filter(Boolean);
    }
    return existingValues.map(v => v.option_id).filter((id): id is string => !!id);
  }

  return firstVal.option_id ? [firstVal.option_id] : [];
}

/**
 * Renders a single field item.
 */
function EntityFieldItem({
  field, val, activeLang, gameDefaultLang, onValueChange
}: {
  field: FieldData; val: FieldValueState | undefined; activeLang: string; gameDefaultLang: string; onValueChange: (fid: string, v: string[] | string, m: 'single' | 'multi') => void;
}) {
  if (!val) return null;
  const label = getTranslatedField(field.key, activeLang, gameDefaultLang);
  const options = field.field_options || [];
  
  let control;
  if (field.manual_fill) {
    control = <CreatableTagInput name={`field-${field.id}`} initialValues={val.values} options={options} isMulti={field.is_multi} onChange={v => onValueChange(field.id, v, 'multi')} />;
  } else if (field.is_multi) {
    control = (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {options.map(o => (
          <button key={o.id} type="button" onClick={() => onValueChange(field.id, o.id, 'multi')} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${val.values.includes(o.id) ? "bg-green-600/20 border-green-500 text-green-400" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>
            {o.icon_path && <div className="relative w-5 h-5"><Image src={getPublicUrl('games', o.icon_path) || ""} fill sizes="20px" className="object-contain" alt="" /></div>}
            <span className="truncate">{getTranslatedField(o.value_key, activeLang, gameDefaultLang)}</span>
          </button>
        ))}
      </div>
    );
  } else {
    control = (
      <select className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all" value={val.values[0] || ''} onChange={(e) => onValueChange(field.id, e.target.value, 'single')}>
        <option value="">Select Option</option>
        {options.map(o => (<option key={o.id} value={o.id}>{getTranslatedField(o.value_key, activeLang, gameDefaultLang)}</option>))}
      </select>
    );
  }

  return (
    <div key={field.id} className={field.is_multi || field.manual_fill ? "md:col-span-2 space-y-3" : "space-y-2"}>
      <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">{label}<MissingTranslationIndicator value={field.key} /></label>
      {control}
    </div>
  );
}

export default function EditEntityClient({ 
  game, section, entity, fields, currentLang: browserLang, hasTeams, maxTeamSize, sectionTeams = [], libraryPromise
}: {
  game: GameData; section: SectionData; entity: EntityData; fields: FieldData[]; currentLang: string; hasTeams: boolean; maxTeamSize: number; sectionTeams: TeamData[]; libraryPromise: Promise<{ data: LibraryEntity[] | null }>;
}) {
  const { displayLang, t } = useLocalizationParams();
  const activeLang = displayLang || browserLang;

  const libraryData = use(libraryPromise);
  const sectionEntities: TeamEntity[] = useMemo(() => (libraryData.data || []).map((ent: LibraryEntity) => {
    const dSkin = ent.entity_skins?.find((s) => s.is_default) || ent.entity_skins?.[0];
    const iImg = dSkin?.entity_images?.find((img) => img.type === 'icon');
    return { id: ent.id, name: ent.name, icon_path: iImg?.image_path || ent.icon_path };
  }), [libraryData]);

  const [localizedName, setLocalizedName] = useState<LocalizedString>(entity.name);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [existingIconPath, setExistingIconPath] = useState<string | null>(entity.icon_path);

  const initialFieldValues = useMemo(() => fields.map(field => ({
    field_id: field.id,
    values: getInitialValuesForField(field, entity.entity_field_values || [], game.default_lang)
  })), [fields, entity.entity_field_values, game.default_lang]);

  const [entityFieldValues, setEntityFieldValues] = useState<FieldValueState[]>(initialFieldValues);
  useEffect(() => { setEntityFieldValues(initialFieldValues); }, [initialFieldValues]);

  const [, formAction] = useActionState(async () => {
    const formData = new FormData();
    formData.set("id", entity.id);
    formData.set("name", JSON.stringify(localizedName));
    formData.set("section_id", section.id);
    if (iconFile) formData.set("icon_file", iconFile);
    formData.set("existing_icon_path", existingIconPath || "null");
    formData.set("field_values", JSON.stringify(entityFieldValues));
    return await upsertEntityAction(game.slug, section.id, game.default_lang, formData);
  }, {} as FormState);

  const handleFieldValueChange = useCallback((fieldId: string, newValues: string[] | string, mode: 'single' | 'multi') => {
    setEntityFieldValues(prev => prev.map(val => {
      if (val.field_id !== fieldId) return val;
      if (mode === 'multi') return { ...val, values: newValues as string[] };
      const isSelected = val.values.includes(newValues as string);
      return { ...val, values: isSelected ? [] : [newValues as string] };
    }));
  }, []);

  const fieldOptions = useMemo<TeamFieldOption[]>(() => fields.flatMap(f => (f.field_options || []).map((o) => ({
    ...o,
    field_name: getTranslatedField(f.key, activeLang, game.default_lang)
  }))), [fields, activeLang, game.default_lang]);

  const groupedFields = useMemo(() => {
    const groups: Record<string, FieldData[]> = {};
    fields.forEach(field => {
      const cat = field.category || "General";
      // eslint-disable-next-line security/detect-object-injection
      if (!groups[cat]) groups[cat] = [];
      // eslint-disable-next-line security/detect-object-injection
      groups[cat].push(field);
    });
    return groups;
  }, [fields]);

  const sortedCategories = useMemo(() => Object.keys(groupedFields).sort((a, b) => {
    // eslint-disable-next-line security/detect-object-injection
    const minA = Math.min(...groupedFields[a].map(f => f.order_index || 0));
    // eslint-disable-next-line security/detect-object-injection
    const minB = Math.min(...groupedFields[b].map(f => f.order_index || 0));
    return minA !== minB ? minA - minB : a.localeCompare(b);
  }), [groupedFields]);

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            {t('editEntity')}: {getTranslatedField(entity.name, activeLang, game.default_lang)}
            <MissingTranslationIndicator value={entity.name} />
          </h1>
          <form action={deleteEntityAction.bind(null, entity.id, game.slug, section.id)}><ConfirmButton>{t('delete')} {t('entity')}</ConfirmButton></form>
        </div>
        <form action={formAction} className="space-y-6">
          <LocalizedTextInput id="name" label={t('entityName')} value={localizedName} onChange={setLocalizedName} placeholder="e.g., Acheron" />
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('icon')}</label>
            <ImageInput name="icon_file" onFileChange={setIconFile} existingImageUrl={entity.icon_path ? getPublicUrl('games', entity.icon_path) : null} onRemoveExisting={() => setExistingIconPath(null)} />
            <input type="hidden" name="existing_icon_path" value={existingIconPath || ""} />
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mt-8 italic flex items-center gap-2"><span className="w-4 h-1 bg-green-500"></span>{t('entityData')}</h2>
            {sortedCategories.map((category) => (
              <div key={category} className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 border-b border-zinc-800 pb-2">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* eslint-disable-next-line security/detect-object-injection */}
                  {groupedFields[category].map((field) => (
                    <EntityFieldItem key={field.id} field={field} val={entityFieldValues.find(v => v.field_id === field.id)} activeLang={activeLang} gameDefaultLang={game.default_lang} onValueChange={handleFieldValueChange} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-zinc-800"><button type="submit" className="w-full bg-[#22c55e] text-black font-bold px-4 py-4 rounded-2xl hover:bg-[#1da34a] transition-all shadow-lg hover:shadow-[#22c55e]/20 active:scale-[0.98]">{t('save')} {t('entity')}</button></div>
        </form>
        <SkinManager entity={entity} skins={entity.entity_skins} gameSlug={game.slug} sectionId={section.id} gameDefaultLang={game.default_lang} activeLang={activeLang} skinImageTypes={section.skin_image_types} />
        {hasTeams && (
          <div className="pt-10 border-t border-zinc-800">
            <h2 className="text-xl font-semibold text-white mb-6 italic flex items-center gap-2"><span className="w-4 h-1 bg-green-500"></span>Recommended Teams</h2>
            <TeamBuilder sectionId={section.id} gameSlug={game.slug} sectionEntities={sectionEntities} fieldOptions={fieldOptions} maxTeamSize={maxTeamSize || 4} existingTeams={sectionTeams} gameDefaultLang={game.default_lang} isAdmin={true} currentEntityId={entity.id} />
          </div>
        )}
      </div>
    </GameLocalizationProvider>
  );
}
