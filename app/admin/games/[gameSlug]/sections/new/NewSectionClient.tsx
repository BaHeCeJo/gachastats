"use client";

import { useState, useActionState } from 'react';
import { LocalizedString, GameLocalizationProvider, useLocalizationParams, getTranslatedField } from "@/lib/localization";
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import ImageInput from '@/app/components/ImageInput';
import { upsertSectionAction } from '@/app/admin/games/[gameSlug]/sections/actions';

type GameData = { id: string; name: LocalizedString; slug: string; default_lang: string; supported_languages: string[]; };
type FormState = { error?: string; };

export default function NewSectionClient({ game }: { game: GameData }) {
  const { currentLang, displayLang, t } = useLocalizationParams();
  const activeLang = displayLang || currentLang;
  const [localizedKey, setLocalizedKey] = useState<LocalizedString>({ [game.default_lang]: "" });
  const [color, setColor] = useState<string>("#ffffff");
  const [orderIndex, setOrderIndex] = useState<number>(0);
  const [isCollectible, setIsCollectible] = useState<boolean>(true);
  const [isUnique, setIsUnique] = useState<boolean>(true);
  const [hasTeams, setHasTeams] = useState<boolean>(false);
  const [maxTeamSize, setMaxTeamSize] = useState<number>(0);
  const [maxDupes, setMaxDupes] = useState<number>(0);
  const [localizedDupeName, setLocalizedDupeName] = useState<LocalizedString>({ [game.default_lang]: "Duplicate" });
  const [iconFile, setIconFile] = useState<File | null>(null);

  const [state, formAction] = useActionState(
    async (_prevState: FormState, formData: FormData) => {
      formData.set("key", JSON.stringify(localizedKey));
      formData.set("color", color);
      formData.set("order_index", orderIndex.toString());
      formData.set("is_collectible", isCollectible.toString());
      formData.set("is_unique", isUnique.toString());
      formData.set("has_teams", hasTeams.toString());
      formData.set("max_team_size", maxTeamSize.toString());
      formData.set("max_dupes", maxDupes.toString());
      formData.set("dupe_name", JSON.stringify(localizedDupeName));
      if (iconFile) formData.set("icon_file", iconFile);
      return await upsertSectionAction(game.id, game.slug, game.default_lang, formData);
    },
    {} as FormState
  );

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="max-w-xl p-8 space-y-6 mx-auto">
        <h1 className="text-2xl font-bold text-white">{getTranslatedField(game.name, activeLang, game.default_lang)} — {t('newSection')}</h1>
        {state?.error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">{state.error}</div>}
        <form action={formAction} className="space-y-4">
          <LocalizedTextInput id="key" label={t('sectionName')} value={localizedKey} onChange={setLocalizedKey} placeholder="Characters" />
          <div className="flex flex-wrap gap-4 items-center">
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
              <label htmlFor="is_collectible" className="text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer">
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
              <label htmlFor="has_teams" className="text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer">
                Build Teams
              </label>
            </div>
            {hasTeams && (
              <div className="flex items-center gap-3 pt-6">
                <label htmlFor="max_team_size" className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
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
                  <label htmlFor="is_unique" className="text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer">
                    {t('isUnique')}
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <label htmlFor="max_dupes" className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    {t('maxDupes')}
                  </label>
                  <input 
                    id="max_dupes" 
                    type="number" 
                    value={maxDupes} 
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

          <div><label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('icon')}</label><ImageInput name="icon_file" onFileChange={setIconFile} existingImageUrl={null} /></div>
          <button type="submit" className="w-full bg-green-600 text-black font-bold px-4 py-3 rounded-xl hover:bg-green-500 transition-colors">{t('createSection')}</button>
        </form>
      </main>
    </GameLocalizationProvider>
  );
}
