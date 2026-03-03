"use client";

import { useState, useActionState } from 'react';
import Link from 'next/link';
import { LocalizedString, getTranslatedField, GameLocalizationProvider, useLocalizationParams } from "@/lib/localization";
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import ConfirmButton from '@/app/components/ConfirmButton';
import { upsertFieldAction, deleteFieldAction } from '../actions';
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';

type GameData = { id: string; name: LocalizedString; slug: string; default_lang: string; supported_languages: string[]; };
type SectionData = { id: string; key: LocalizedString; game_id: string; };
type FieldData = { id: string; section_id: string; game_field_id: string; key: LocalizedString; category: string | null; required: boolean; manual_fill: boolean; is_multi: boolean; has_icon: boolean; has_color: boolean; order_index: number; };
type FormState = { error?: string; };

export default function EditFieldClient({ game, section, field, categories, currentLang }: {
  game: GameData;
  section: SectionData;
  field: FieldData;
  categories: string[];
  currentLang: string;
}) {
  const { displayLang, t } = useLocalizationParams();
  const activeLang = displayLang || currentLang;

  const [localizedKey, setLocalizedKey] = useState<LocalizedString>(field.key);
  const [category, setCategory] = useState<string>(field.category || 'General');
  const [orderIndex, setOrderIndex] = useState<number>(field.order_index || 0);
  const [required, setRequired] = useState<boolean>(field.required);
  const [manualFill, setManualFill] = useState<boolean>(field.manual_fill);
  const [isMulti, setIsMulti] = useState<boolean>(field.is_multi);
  const [hasIcon, setHasIcon] = useState<boolean>(field.has_icon);
  const [hasColor, setHasColor] = useState<boolean>(field.has_color);

  const [state, formAction] = useActionState(
    async (_prevState: FormState, formData: FormData) => {
      formData.set("id", field.id);
      formData.set("game_field_id", field.game_field_id);
      formData.set("key", JSON.stringify(localizedKey));
      formData.set("category", category);
      formData.set("order_index", orderIndex.toString());
      formData.set("required", required ? 'on' : 'off');
      formData.set("manual_fill", manualFill ? 'on' : 'off');
      formData.set("is_multi", isMulti ? 'on' : 'off');
      formData.set("has_icon", hasIcon ? 'on' : 'off');
      formData.set("has_color", hasColor ? 'on' : 'off');
      return await upsertFieldAction(game.slug, section.id, game.default_lang, formData);
    },
    {} as FormState
  );

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="max-w-xl p-8 space-y-10 mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            {t('editField')}: {getTranslatedField(field.key, activeLang, game.default_lang)}
            <MissingTranslationIndicator value={field.key} />
          </h1>
          <form action={deleteFieldAction.bind(null, field.id, game.slug, section.id)}>
            <ConfirmButton>{t('delete')} {t('field')}</ConfirmButton>
          </form>
        </div>
        {state?.error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">{state.error}</div>}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">{t('fieldSettings')}</h2>
          <form action={formAction} className="space-y-4">
            <LocalizedTextInput id="key" label={t('fieldName')} value={localizedKey} onChange={setLocalizedKey} placeholder="e.g., Element" />
            <div className="space-y-1">
              <label htmlFor="category" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('category')}</label>
              <input id="category" name="category" placeholder="Category" className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all" list="category-list" value={category} onChange={(e) => setCategory(e.target.value)} />
              <datalist id="category-list">{categories.map(cat => <option key={cat} value={cat} />)}</datalist>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={manualFill} onChange={(e) => setManualFill(e.target.checked)} /> {t('manualInput')}</label>
              <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={isMulti} onChange={(e) => setIsMulti(e.target.checked)} /> {t('multiSelect')}</label>
            </div>
            <div className="flex gap-6 items-center">
              <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> {t('required')}</label>
              <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={hasIcon} onChange={(e) => setHasIcon(e.target.checked)} /> {t('hasIcon')}</label>
              <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={hasColor} onChange={(e) => setHasColor(e.target.checked)} /> {t('hasColor')}</label>
            </div>
            <div>
              <label htmlFor="order_index" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('orderIndex')}</label>
              <input id="order_index" name="order_index" type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} className="block w-24 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold px-4 py-3 rounded-xl hover:bg-blue-500 transition-colors">{t('save')} {t('field')}</button>
          </form>
        </section>
        <section className="border-t pt-6 space-y-3">
          <h2 className="text-lg font-semibold text-white">{t('field')} {t('options')}</h2>
          <p className="text-sm text-gray-400">{t('fieldOptionsDesc')}</p>
          <Link href={`/admin/games/${game.slug}/sections/${section.id}/fields/${field.id}/options`} className="inline-block bg-indigo-600 text-white px-4 py-2 rounded">{t('manageOptions')} →</Link>
        </section>
      </main>
    </GameLocalizationProvider>
  );
}
