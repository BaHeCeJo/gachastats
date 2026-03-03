"use client";

import { useState, useActionState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { deleteSectionAction, upsertSectionAction } from '@/app/admin/games/[gameSlug]/sections/actions';
import ConfirmButton from '@/app/components/ConfirmButton';
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import ImageInput from '@/app/components/ImageInput';
import EntityGridManager from '@/app/components/EntityGridManager';
import TeamBuilder, { TeamData, TeamEntity, TeamFieldOption } from '@/app/components/TeamBuilder';
import { LocalizedString, getTranslatedField, GameLocalizationProvider, useLocalizationParams } from "@/lib/localization";
import Link from "next/link";
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';
import { Game, Section, SectionDisplaySettings } from '@/lib/supabase/queries';
import { ProcessedEntity } from '@/app/[gameSlug]/sections/[sectionId]/page';

type FieldOption = { id: string; field_id: string; value_key: LocalizedString; icon_path: string | null; color: string | null; order_index: number; };
type Field = { id: string; section_id: string; key: LocalizedString; required: boolean; manual_fill: boolean; has_icon: boolean; has_color: boolean; order_index: number; is_multi: boolean; category: string | null; field_options: FieldOption[] | null; };
type FormState = { error?: string; };

export default function EditSectionClient({
  game, section, fields, displaySettings, entities, filterFieldsData, currentLang: browserLang, updateDisplaySettingsAction, sectionTeams = []
}: {
  game: Game; 
  section: Section; 
  fields: Field[]; 
  displaySettings: SectionDisplaySettings | null; 
  entities: ProcessedEntity[]; 
  filterFieldsData: { id: string; key: LocalizedString; options: { id: string; value_key: LocalizedString; iconUrl?: string; color?: string | null }[] }[]; 
  currentLang: string; 
  updateDisplaySettingsAction: (gameSlug: string, sectionId: string, formData: FormData) => Promise<{ error?: string }>;
  sectionTeams: TeamData[];
}) {
  const supabase = createClient();
  const { displayLang, t } = useLocalizationParams();
  const activeLang = displayLang || browserLang;

  const [localizedKey, setLocalizedKey] = useState<LocalizedString>(section.key);
  const [color, setColor] = useState<string>(section.color || "#ffffff");
  const [orderIndex, setOrderIndex] = useState<number>(section.order_index);
  const [isCollectible, setIsCollectible] = useState<boolean>(section.is_collectible);
  const [isUnique, setIsUnique] = useState<boolean>(section.is_unique ?? true);
  const [hasTeams, setHasTeams] = useState<boolean>(section.has_teams ?? false);
  const [maxTeamSize, setMaxTeamSize] = useState<number>(section.max_team_size ?? 0);
  const [minDupes, setMinDupes] = useState<number>(section.min_dupes ?? 0);
  const [maxDupes, setMaxDupes] = useState<number>(section.max_dupes ?? 0);
  const [localizedDupeName, setLocalizedDupeName] = useState<LocalizedString>(section.dupe_name || { [game.default_lang]: "Duplicate" });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [existingIconPath, setExistingIconPath] = useState<string | null>(section.icon_path);
  const [filterFieldIds, setFilterFieldIds] = useState<string[]>(displaySettings?.filter_field_ids || []);

  const [bgColorFieldId, setBgColorFieldId] = useState<string>(displaySettings?.bg_color_field_id || "");
  const [topLeftIconFieldId, setTopLeftIconFieldId] = useState<string>(displaySettings?.top_left_icon_field_id || "");
  const [topRightIconFieldId, setTopRightIconFieldId] = useState<string>(displaySettings?.top_right_icon_field_id || "");
  const [overlayIconFieldId, setOverlayIconFieldId] = useState<string>(displaySettings?.overlay_icon_field_id || "");
  const [maxColumns, setMaxColumns] = useState<number>(displaySettings?.max_columns ?? 6);

  const [sectionState, sectionFormAction] = useActionState(
    async (_prevState: FormState, formData: FormData) => {
      formData.set("id", section.id);
      formData.set("key", JSON.stringify(localizedKey));
      formData.set("color", color);
      formData.set("order_index", orderIndex.toString());
      formData.set("is_collectible", isCollectible.toString());
      formData.set("is_unique", isUnique.toString());
      formData.set("has_teams", hasTeams.toString());
      formData.set("max_team_size", maxTeamSize.toString());
      formData.set("min_dupes", minDupes.toString());
      formData.set("max_dupes", maxDupes.toString());
      formData.set("dupe_name", JSON.stringify(localizedDupeName));
      if (iconFile) formData.set("icon_file", iconFile);
      formData.set("existing_icon_path", existingIconPath || "null");
      return await upsertSectionAction(game.id, game.slug, game.default_lang, formData);
    },
    {} as FormState
  );

  const [displaySettingsState, displaySettingsFormAction] = useActionState(
    async (_prevState: FormState, formData: FormData) => {
      formData.set("max_columns", maxColumns.toString());
      formData.set("bg_color_field_id", bgColorFieldId);
      formData.set("top_left_icon_field_id", topLeftIconFieldId);
      formData.set("top_right_icon_field_id", topRightIconFieldId);
      formData.set("overlay_icon_field_id", overlayIconFieldId);

      formData.delete("filter_field_ids");
      filterFieldIds.forEach(id => formData.append("filter_field_ids", id));
      return await updateDisplaySettingsAction(game.slug, section.id, formData);
    },
    {} as FormState
  );

  const toggleFilterField = (id: string) => {
    setFilterFieldIds(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const groupedFields: Record<string, Field[]> = {};
  fields.forEach(field => {
    const cat = field.category || 'General';
    if (!groupedFields[cat]) groupedFields[cat] = [];
    groupedFields[cat]!.push(field);
  });

  const sortedCategories = Object.keys(groupedFields).sort((a, b) => {
    const minA = Math.min(...groupedFields[a]!.map(f => f.order_index || 0));
    const minB = Math.min(...groupedFields[b]!.map(f => f.order_index || 0));
    if (minA !== minB) return minA - minB;
    return a.localeCompare(b);
  });

  const fieldOptions = useMemo<TeamFieldOption[]>(() => {
    return fields.flatMap(f => (f.field_options || []).map((o) => ({
      ...o,
      field_name: getTranslatedField(f.key, activeLang, game.default_lang)
    })));
  }, [fields, activeLang, game.default_lang]);

  const sectionEntities = useMemo<TeamEntity[]>(() => {
    return entities.map((ent) => ({
      id: ent.id,
      name: ent.name,
      icon_path: ent.icon_path,
    }));
  }, [entities]);

  const sectionIconPublicUrl = section.icon_path ? supabase.storage.from('games').getPublicUrl(section.icon_path).data.publicUrl : null;

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="max-w-7xl mx-auto p-8 space-y-10">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            {t('editSection')}: {getTranslatedField(section.key, activeLang, game.default_lang)}
            <MissingTranslationIndicator value={section.key} />
          </h1>
          <form action={deleteSectionAction.bind(null, section.id, game.slug)}><ConfirmButton>{t('delete')} {t('section')}</ConfirmButton></form>
        </div>
        {(sectionState?.error || displaySettingsState?.error) && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">{sectionState.error || displaySettingsState.error}</div>}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            <section className="space-y-6 border-b pb-10">
              <h2 className="text-xl font-semibold text-white">{t('generalInfo')}</h2>
              <form action={sectionFormAction} className="space-y-4">
                <LocalizedTextInput id="key" label={t('sectionName')} value={localizedKey} onChange={setLocalizedKey} placeholder="Characters" />
                <div className="flex flex-wrap gap-8 items-center">
                  <div><label htmlFor="color" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('color')}</label><input id="color" name="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 border-0 rounded-md overflow-hidden bg-zinc-900" /></div>
                  <div><label htmlFor="order_index" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('orderIndex')}</label><input id="order_index" name="order_index" type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} className="block w-24 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all" /></div>
                  <div className="flex items-center gap-3 pt-6">
                    <input 
                      id="is_collectible" 
                      type="checkbox" 
                      checked={isCollectible} 
                      onChange={(e) => setIsCollectible(e.target.checked)}
                      className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-[#22c55e] focus:ring-[#22c55e]"
                    />
                    <label htmlFor="is_collectible" className="text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer text-zinc-400">
                      {t('isCollectible')}
                    </label>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input 
                      id="has_teams" 
                      type="checkbox" 
                      checked={hasTeams} 
                      onChange={(e) => setHasTeams(e.target.checked)}
                      className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-[#22c55e] focus:ring-[#22c55e]"
                    />
                    <label htmlFor="has_teams" className="text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer text-zinc-400">
                      Build Teams
                    </label>
                  </div>
                  {hasTeams && (
                    <div className="flex items-center gap-3 pt-6">
                      <label htmlFor="max_team_size" className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-zinc-400">
                        Max Team Size
                      </label>
                      <input 
                        id="max_team_size" 
                        type="number" 
                        value={maxTeamSize} 
                        onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                        className="w-20 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                  )}
                </div>

                {isCollectible && (
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input 
                          id="is_unique" 
                          type="checkbox" 
                          checked={isUnique} 
                          onChange={(e) => setIsUnique(e.target.checked)}
                          className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-[#22c55e] focus:ring-[#22c55e]"
                        />
                        <label htmlFor="is_unique" className="text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer text-zinc-400">
                          {t('isUnique')}
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <label htmlFor="min_dupes" className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-zinc-400">
                          {t('minDupes')}
                        </label>
                        <input 
                          id="min_dupes" 
                          type="number" 
                          value={minDupes ?? 0} 
                          onChange={(e) => setMinDupes(Number(e.target.value))}
                          className="w-20 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label htmlFor="max_dupes" className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-zinc-400">
                          {t('maxDupes')}
                        </label>
                        <input 
                          id="max_dupes" 
                          type="number" 
                          value={maxDupes ?? 0} 
                          onChange={(e) => setMaxDupes(Number(e.target.value))}
                          className="w-20 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <LocalizedTextInput 
                      id="dupe_name" 
                      label={t('dupeLabelName')} 
                      value={localizedDupeName} 
                      onChange={setLocalizedDupeName} 
                      placeholder="Constellation, Refinement..." 
                    />
                  </div>
                )}

                <div><label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('icon')}</label><ImageInput name="icon_file" onFileChange={setIconFile} existingImageUrl={sectionIconPublicUrl} onRemoveExisting={() => setExistingIconPath(null)} /><input type="hidden" name="existing_icon_path" value={existingIconPath || ""} /></div>
                <button type="submit" className="w-full bg-[#22c55e] text-black font-bold px-4 py-3 rounded-xl hover:bg-[#1da34a] transition">{t('save')} {t('section')}</button>
              </form>
            </section>
            <section className="space-y-6 border-b pb-10">
              <h2 className="text-xl font-semibold text-white">{t('displaySettings')}</h2>
              <form action={displaySettingsFormAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-400">{t('maxColumns')}</label>
                  <input name="max_columns" type="number" value={maxColumns} onChange={(e) => setMaxColumns(Number(e.target.value))} className="border p-2 w-full bg-zinc-900 text-white border-zinc-800 rounded" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-400">{t('backgroundColorField')}</label>
                  <select name="bg_color_field_id" value={bgColorFieldId} onChange={(e) => setBgColorFieldId(e.target.value)} className="border p-2 w-full bg-zinc-900 text-white border-zinc-800 rounded">
                    <option value="">{t('none')}</option>
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{getTranslatedField(f.key, activeLang, game.default_lang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-400">{t('topLeftIconField')}</label>
                  <select name="top_left_icon_field_id" value={topLeftIconFieldId} onChange={(e) => setTopLeftIconFieldId(e.target.value)} className="border p-2 w-full bg-zinc-900 text-white border-zinc-800 rounded">
                    <option value="">{t('none')}</option>
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{getTranslatedField(f.key, activeLang, game.default_lang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-400">{t('topRightIconField')}</label>
                  <select name="top_right_icon_field_id" value={topRightIconFieldId} onChange={(e) => setTopRightIconFieldId(e.target.value)} className="border p-2 w-full bg-zinc-900 text-white border-zinc-800 rounded">
                    <option value="">{t('none')}</option>
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{getTranslatedField(f.key, activeLang, game.default_lang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-400">{t('overlayIconField')}</label>
                  <select name="overlay_icon_field_id" value={overlayIconFieldId} onChange={(e) => setOverlayIconFieldId(e.target.value)} className="border p-2 w-full bg-zinc-900 text-white border-zinc-800 rounded">
                    <option value="">{t('none')}</option>
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{getTranslatedField(f.key, activeLang, game.default_lang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400">{t('fieldsToFilterBy')}</label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {fields?.map(f => (
                      <label key={f.id} className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" name="filter_field_ids" value={f.id} checked={filterFieldIds.includes(f.id)} onChange={() => toggleFilterField(f.id)} className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-[#22c55e] focus:ring-[#22c55e]" />
                        <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">{getTranslatedField(f.key, activeLang, game.default_lang)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2"><button type="submit" className="w-full bg-[#22c55e] text-black font-bold px-4 py-3 rounded-xl hover:bg-[#1da34a] transition">{t('saveDisplaySettings')}</button></div>
              </form>
            </section>
          </div>
          <aside className="space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-xl font-semibold text-white">{t('fields')}</h2><Link href={`/admin/games/${game.slug}/sections/${section.id}/fields/new`} className="bg-[#22c55e] text-black font-bold px-2 py-1 text-sm rounded hover:bg-[#1da34a] transition">{t('add')} {t('field')}</Link></div>
            {sortedCategories.map(category => (
              <div key={category} className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800 pb-1">{category}</h3>
                <div className="space-y-1">
                  {groupedFields[category]!.map(field => (
                    <Link key={field.id} href={`/admin/games/${game.slug}/sections/${section.id}/fields/${field.id}`} className="block border border-zinc-800 rounded p-2 hover:bg-zinc-800 transition text-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-300">{getTranslatedField(field.key, activeLang, game.default_lang)}</span>
                          <MissingTranslationIndicator value={field.key} />
                        </div>
                        <span className="text-xs text-zinc-500">{field.category}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </aside>
        </div>
        <EntityGridManager entities={entities} displaySettings={displaySettings} filterFields={filterFieldsData} gameSlug={game.slug} sectionId={section.id} sectionName={getTranslatedField(section.key, activeLang, game.default_lang)} isAdmin={true} gameDefaultLang={game.default_lang} currentLang={browserLang} />

        {hasTeams && (
          <div className="mt-20 pt-10 border-t border-zinc-800">
            <h2 className="text-2xl font-black uppercase italic text-white mb-10 flex items-center gap-4">
              <span className="w-12 h-1 bg-green-500" />
              Section Teams Management
            </h2>
            <TeamBuilder 
              sectionId={section.id}
              gameSlug={game.slug}
              sectionEntities={sectionEntities}
              fieldOptions={fieldOptions}
              maxTeamSize={maxTeamSize || 4}
              existingTeams={sectionTeams}
              gameDefaultLang={game.default_lang}
              isAdmin={true}
            />
          </div>
        )}
      </main>
    </GameLocalizationProvider>
  );
}
