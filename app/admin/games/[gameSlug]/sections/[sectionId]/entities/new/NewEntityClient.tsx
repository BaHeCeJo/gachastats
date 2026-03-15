"use client";

import { useState, useActionState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LocalizedString, getTranslatedField, GameLocalizationProvider, useLocalizationParams } from "@/lib/localization";
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import CreatableTagInput from '@/app/components/fields/CreatableTagInput';
import ImageInput from '@/app/components/ImageInput';
import { upsertEntityAction } from '../actions';
import Image from 'next/image';

type GameData = { id: string; name: LocalizedString; slug: string; default_lang: string; supported_languages: string[]; };
type SectionData = { id: string; key: LocalizedString; game_id: string; has_stats?: boolean; has_ascension?: boolean; max_level?: number; };
type FieldOption = { id: string; game_field_id: string; value_key: LocalizedString; icon_path: string | null; color: string | null; };
type FieldData = { id: string; key: LocalizedString; required: boolean; manual_fill: boolean; is_multi: boolean; has_icon: boolean; has_color: boolean; order_index: number; category: string | null; field_options: FieldOption[] | null; };
import { SectionStat, SectionAscension } from '@/lib/supabase/queries';
import EntityStatsEditor from '../components/EntityStatsEditor';

type FormState = { error?: string; };

interface FieldValueState { field_id: string; values: string[]; }

export default function NewEntityClient({ game, section, fields, currentLang: browserLang, sectionStats = [], sectionAscensions = [] }: {
  game: GameData; section: SectionData; fields: FieldData[]; currentLang: string; sectionStats: SectionStat[]; sectionAscensions: SectionAscension[];
}) {
  const supabase = createClient();
  const { displayLang, t } = useLocalizationParams();
  const activeLang = displayLang || browserLang;

  const [localizedName, setLocalizedName] = useState<LocalizedString>({ [game.default_lang]: "" });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [entityFieldValues, setEntityFieldValues] = useState<FieldValueState[]>(() => fields.map(f => ({ field_id: f.id, values: [] })));
  const [stats, setStats] = useState<{ stat_id: string; level: number; value: number }[]>([]);

  const [state, formAction] = useActionState(async (_prevState: FormState, formData: FormData) => {
    formData.set("name", JSON.stringify(localizedName));
    formData.set("section_id", section.id);
    if (iconFile) formData.set("icon_file", iconFile); else formData.delete("icon_file");
    formData.set("field_values", JSON.stringify(entityFieldValues));
    if (section.has_stats) {
      formData.set("entity_stats", JSON.stringify(stats));
    }
    return await upsertEntityAction(game.slug, section.id, game.default_lang, formData);
  }, {} as FormState);

  const handleFieldValueChange = useCallback((fieldId: string, newValues: string[] | string, mode: 'single' | 'multi') => {
    setEntityFieldValues(prev => prev.map(val => {
      if (val.field_id !== fieldId) return val;
      if (mode === 'multi') return { ...val, values: newValues as string[] };
      const isSelected = val.values.includes(newValues as string);
      const nextValues = isSelected ? [] : [newValues as string];
      return { ...val, values: nextValues };
    }));
  }, []);

  const groups = useMemo(() => {
    const res: Record<string, FieldData[]> = {};
    fields.forEach(f => {
      const cat = f.category || "General";
      // eslint-disable-next-line security/detect-object-injection
      if (!res[cat]) res[cat] = [];
      // eslint-disable-next-line security/detect-object-injection
      res[cat].push(f);
    });
    return res;
  }, [fields]);

  const sortedCats = useMemo(() => Object.keys(groups).sort((a, b) => {
    // eslint-disable-next-line security/detect-object-injection
    const minA = Math.min(...groups[a].map((f) => f.order_index || 0));
    // eslint-disable-next-line security/detect-object-injection
    const minB = Math.min(...groups[b].map((f) => f.order_index || 0));
    return minA !== minB ? minA - minB : a.localeCompare(b);
  }), [groups]);

  const renderField = useCallback((field: FieldData) => {
    const val = entityFieldValues.find(v => v.field_id === field.id);
    if (!val) return null;
    const label = getTranslatedField(field.key, activeLang, game.default_lang);
    const options = field.field_options || [];
    
    let control;
    if (field.manual_fill) {
      control = <CreatableTagInput name={`field-${field.id}`} initialValues={val.values} options={options} isMulti={field.is_multi} onChange={v => handleFieldValueChange(field.id, v, 'multi')} />;
    } else if (field.is_multi) {
      control = (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {options.map(o => (
            <button key={o.id} type="button" onClick={() => handleFieldValueChange(field.id, o.id, 'multi')} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${val.values.includes(o.id) ? "bg-green-600/20 border-green-500 text-green-400" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>
              {o.icon_path && <div className="relative w-5 h-5"><Image src={supabase.storage.from('games').getPublicUrl(o.icon_path).data.publicUrl} fill sizes="20px" className="object-contain" alt="" /></div>}
              <span className="truncate">{getTranslatedField(o.value_key, activeLang, game.default_lang)}</span>
            </button>
          ))}
        </div>
      );
    } else {
      control = (
        <select className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all" value={val.values[0] || ''} onChange={e => handleFieldValueChange(field.id, e.target.value, 'single')}>
          <option value="">{t('selectOption')}</option>
          {options.map(o => (<option key={o.id} value={o.id}>{getTranslatedField(o.value_key, activeLang, game.default_lang)}</option>))}
        </select>
      );
    }

    return (
      <div key={field.id} className={field.is_multi || field.manual_fill ? "md:col-span-2 space-y-3" : "space-y-2"}>
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">{label}</label>
        {control}
      </div>
    );
  }, [entityFieldValues, activeLang, game.default_lang, supabase.storage, handleFieldValueChange, t]);

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="max-w-4xl p-8 space-y-6 mx-auto">
        <h1 className="text-2xl font-bold text-white">{getTranslatedField(section.key, activeLang, game.default_lang)} — {t('newEntity')}</h1>
        {state?.error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">{state.error}</div>}
        <form action={formAction} className="space-y-6">
          <LocalizedTextInput id="name" label={t('entityName')} value={localizedName} onChange={setLocalizedName} placeholder="e.g., Acheron" />
          <div><label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('mainIcon')}</label><ImageInput name="icon_file" onFileChange={setIconFile} existingImageUrl={null} /></div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mt-8 italic flex items-center gap-2"><span className="w-4 h-1 bg-green-500"></span>{t('entityData')}</h2>
            {sortedCats.map(cat => (
              <div key={cat} className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 border-b border-zinc-800 pb-2">{cat}</h3>
                {/* eslint-disable-next-line security/detect-object-injection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{groups[cat].map(renderField)}</div>
              </div>
            ))}

            {section.has_stats && (
              <EntityStatsEditor 
                section={section} 
                sectionStats={sectionStats} 
                sectionAscensions={sectionAscensions} 
                entityStats={[]} 
                activeLang={activeLang} 
                gameDefaultLang={game.default_lang} 
                onChange={setStats} 
              />
            )}
          </div>
          <div className="pt-6 border-t border-zinc-800"><button type="submit" className="w-full bg-blue-600 text-white font-bold px-4 py-4 rounded-2xl hover:bg-blue-500 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]">{t('createEntity')}</button></div>
        </form>
      </main>
    </GameLocalizationProvider>
  );
}
