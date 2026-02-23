"use client";

import { useState, useActionState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { deleteSectionAction, upsertSectionAction } from '@/app/admin/games/[gameSlug]/sections/actions';
import ConfirmButton from '@/app/components/ConfirmButton';
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import ImageInput from '@/app/components/ImageInput';
import EntityGridManager from '@/app/components/EntityGridManager';
import { LocalizedString, getTranslatedField, GameLocalizationProvider } from "@/lib/localization";
import Link from "next/link";
import { revalidatePath } from 'next/cache';

type Game = { id: string; name: LocalizedString; slug: string; default_lang: string; supported_languages: string[]; };
type Section = { id: string; key: LocalizedString; game_id: string; icon_path: string | null; color: string | null; order_index: number; };
type FieldOption = { id: string; field_id: string; value_key: LocalizedString; icon_path: string | null; color: string | null; order_index: number; };
type Field = { id: string; section_id: string; key: LocalizedString; required: boolean; manual_fill: boolean; has_icon: boolean; has_color: boolean; order_index: number; is_multi: boolean; category: string | null; field_options: FieldOption[] | null; };
type ProcessedEntity = any;
type DisplaySettings = { section_id: string; max_columns: number; bg_color_field_id: string | null; top_left_icon_field_id: string | null; top_right_icon_field_id: string | null; overlay_icon_field_id: string | null; filter_field_ids: string[]; };
type FormState = { error?: string; };

export default function EditSectionClient({
  game, section, fields, displaySettings, entities, filterFieldsData, currentLang, updateDisplaySettingsAction
}: {
  game: Game; section: Section; fields: Field[]; displaySettings: DisplaySettings | null; entities: ProcessedEntity[]; filterFieldsData: any[]; currentLang: string; updateDisplaySettingsAction: (gameSlug: string, sectionId: string, formData: FormData) => Promise<{ error?: string }>;
}) {
  const supabase = createClient();
  const [localizedKey, setLocalizedKey] = useState<LocalizedString>(section.key);
  const [color, setColor] = useState<string>(section.color || "#ffffff");
  const [orderIndex, setOrderIndex] = useState<number>(section.order_index);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [existingIconPath, setExistingIconPath] = useState<string | null>(section.icon_path);

  const [sectionState, sectionFormAction] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      formData.set("id", section.id);
      formData.set("key", JSON.stringify(localizedKey));
      formData.set("color", color);
      formData.set("order_index", orderIndex.toString());
      if (iconFile) formData.set("icon_file", iconFile);
      formData.set("existing_icon_path", existingIconPath || "null");
      return await upsertSectionAction(game.id, game.slug, game.default_lang, formData);
    },
    {} as FormState
  );

  const [displaySettingsState, displaySettingsFormAction] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      return await updateDisplaySettingsAction(game.slug, section.id, formData);
    },
    {} as FormState
  );

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

  const colorFields = fields?.filter(f => f.has_color) || [];
  const iconFields = fields?.filter(f => f.has_icon) || [];
  const sectionIconPublicUrl = section.icon_path ? supabase.storage.from('games').getPublicUrl(section.icon_path).data.publicUrl : null;

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="max-w-7xl mx-auto p-8 space-y-10">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Edit Section: {getTranslatedField(section.key, currentLang, game.default_lang)}</h1>
          <form action={deleteSectionAction.bind(null, section.id, game.slug)}><ConfirmButton>Delete Section</ConfirmButton></form>
        </div>
        {(sectionState?.error || displaySettingsState?.error) && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">{sectionState.error || displaySettingsState.error}</div>}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            <section className="space-y-6 border-b pb-10">
              <h2 className="text-xl font-semibold">General Info</h2>
              <form action={sectionFormAction} className="space-y-4" encType="multipart/form-data">
                <LocalizedTextInput id="key" label="Section Name (Key)" value={localizedKey} onChange={setLocalizedKey} placeholder="Characters" />
                <div className="flex gap-4 items-center">
                  <div><label htmlFor="color" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Color</label><input id="color" name="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 border-0 rounded-md overflow-hidden bg-zinc-900" /></div>
                  <div><label htmlFor="order_index" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Order Index</label><input id="order_index" name="order_index" type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} className="block w-24 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all" /></div>
                </div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Icon</label><ImageInput name="icon_file" onFileChange={setIconFile} existingImageUrl={sectionIconPublicUrl} onRemoveExisting={() => setExistingIconPath(null)} /><input type="hidden" name="existing_icon_path" value={existingIconPath || ""} /></div>
                <button type="submit" className="w-full bg-[#22c55e] text-black font-bold px-4 py-3 rounded-xl hover:bg-[#1da34a] transition">Save Section</button>
              </form>
            </section>
            <section className="space-y-6 border-b pb-10">
              <h2 className="text-xl font-semibold">Display Settings (Grid)</h2>
              <form action={displaySettingsFormAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><label className="block text-sm font-medium">Max Columns</label><input name="max_columns" type="number" defaultValue={displaySettings?.max_columns ?? 6} className="border p-2 w-full" /></div>
                <div className="space-y-2"><label className="block text-sm font-medium">Background Color Field</label><select name="bg_color_field_id" defaultValue={displaySettings?.bg_color_field_id ?? ''} className="border p-2 w-full"><option value="">None</option>{colorFields.map(f => <option key={f.id} value={f.id}>{getTranslatedField(f.key, currentLang, game.default_lang)}</option>)}</select></div>
                <div className="space-y-2"><label className="block text-sm font-medium">Top-Left Icon Field</label><select name="top_left_icon_field_id" defaultValue={displaySettings?.top_left_icon_field_id ?? ''} className="border p-2 w-full"><option value="">None</option>{iconFields.map(f => <option key={f.id} value={f.id}>{getTranslatedField(f.key, currentLang, game.default_lang)}</option>)}</select></div>
                <div className="space-y-2"><label className="block text-sm font-medium">Top-Right Icon Field</label><select name="top_right_icon_field_id" defaultValue={displaySettings?.top_right_icon_field_id ?? ''} className="border p-2 w-full"><option value="">None</option>{iconFields.map(f => <option key={f.id} value={f.id}>{getTranslatedField(f.key, currentLang, game.default_lang)}</option>)}</select></div>
                <div className="space-y-2"><label className="block text-sm font-medium">Overlay Icon Field</label><select name="overlay_icon_field_id" defaultValue={displaySettings?.overlay_icon_field_id ?? ''} className="border p-2 w-full"><option value="">None</option>{iconFields.map(f => <option key={f.id} value={f.id}>{getTranslatedField(f.key, currentLang, game.default_lang)}</option>)}</select></div>
                <div className="space-y-2 md:col-span-2"><label className="block text-sm font-medium">Fields to Filter by</label><div className="flex flex-wrap gap-4 mt-2">{fields?.map(f => (<label key={f.id} className="flex items-center gap-2"><input type="checkbox" name="filter_field_ids" value={f.id} defaultChecked={displaySettings?.filter_field_ids?.includes(f.id)} />{getTranslatedField(f.key, currentLang, game.default_lang)}</label>))}</div></div>
                <div className="md:col-span-2"><button type="submit" className="w-full bg-[#22c55e] text-black font-bold px-4 py-3 rounded-xl hover:bg-[#1da34a] transition">Save Display Settings</button></div>
              </form>
            </section>
          </div>
          <aside className="space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Fields</h2><Link href={`/admin/games/${game.slug}/sections/${section.id}/fields/new`} className="bg-[#22c55e] text-black font-bold px-2 py-1 text-sm rounded hover:bg-[#1da34a] transition">Add Field</Link></div>
            {sortedCategories.map(category => (
              <div key={category} className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-800 pb-1">{category}</h3>
                <div className="space-y-1">{groupedFields[category]!.map(field => (<Link key={field.id} href={`/admin/games/${game.slug}/sections/${section.id}/fields/${field.id}`} className="block border rounded p-2 hover:bg-gray-800 transition text-sm"><div className="flex justify-between"><span className="font-medium">{getTranslatedField(field.key, currentLang, game.default_lang)}</span><span className="text-xs text-gray-500">{field.category}</span></div></Link>))}</div>
              </div>
            ))}
          </aside>
        </div>
        <EntityGridManager entities={entities} displaySettings={displaySettings} filterFields={filterFieldsData} gameSlug={game.slug} sectionId={section.id} sectionName={getTranslatedField(section.key, currentLang, game.default_lang)} isAdmin={true} gameDefaultLang={game.default_lang} currentLang={currentLang} />
      </main>
    </GameLocalizationProvider>
  );
}
