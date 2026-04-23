"use client";

import { useActionState, useState } from "react";
import { deleteGameAction, upsertGameAction } from '@/lib/actions/admin/game';
import { toast } from "sonner";
import ConfirmButton from '@/app/components/ConfirmButton';
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import ImageInput from '@/app/components/ImageInput';
import { getTranslatedField } from '@/lib/localization-utils';
import { GameLocalizationProvider, useLocalizationParams } from '@/lib/localization';
import { languages } from "@/lib/constants/languages";
import Link from "next/link";
import MissingTranslationIndicator from "@/app/components/MissingTranslationIndicator";
import { getPublicUrl } from "@/lib/supabase/client";
import { LocalizedString, Game } from "@/lib/supabase/queries";
import { UITranslationKey } from "@/lib/i18n/translations";

type FormState = {
  error?: string;
  id?: string;
  name: LocalizedString;
  description: LocalizedString;
  cover_url: string | null;
  default_lang: string;
  supported_languages: string[];
};

type AdminGamePageProps = {
  game: Game;
  currentLang: string;
};

export default function EditGameClient({ game, currentLang: browserLang }: AdminGamePageProps) {
  const { displayLang, t } = useLocalizationParams();
  const activeLang = displayLang || browserLang;

  const [localizedName, setLocalizedName] = useState<LocalizedString>(game.name);
  const [localizedDescription, setLocalizedDescription] = useState<LocalizedString>(game.description || {});
  const [supportedLangs, setSupportedLangs] = useState<string[]>(game.supported_languages);
  
  // Use state initializer to ensure defaultLang is valid from the first render
  const [defaultLang, setDefaultLang] = useState<string>(() => {
    if (game.supported_languages.includes(game.default_lang)) {
      return game.default_lang;
    }
    return game.supported_languages[0] || 'en';
  });

  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(() => getPublicUrl('games', game.cover_url));

  const [state, formAction] = useActionState(
    async (prevState: FormState) => {
      const formData = new FormData();
      formData.set("id", game.id);
      formData.set("name", JSON.stringify(localizedName));
      formData.set("description", JSON.stringify(localizedDescription));
      formData.set("default_lang", defaultLang);
      formData.set("supported_languages", JSON.stringify(supportedLangs));

      if (coverImageFile) {
        formData.set("cover_image", coverImageFile);
      } else if (currentCoverUrl) {
        formData.set("cover_image", game.cover_url || "");
      }

      const result = await upsertGameAction(formData);

      if (result?.error) {
        return { ...prevState, error: result.error };
      }
      toast.success('Game saved');
      return { ...prevState, error: undefined };
    },
    {
      id: game.id,
      name: game.name,
      description: game.description,
      cover_url: game.cover_url,
      default_lang: game.default_lang,
      supported_languages: game.supported_languages,
    } as FormState
  );

  const handleLanguageToggle = (langCode: string) => {
    setSupportedLangs((prev) => {
      if (prev.includes(langCode)) {
        if (langCode === defaultLang && prev.length > 1) {
          toast.warning("Cannot remove the default language.");
          return prev;
        }
        if (prev.length === 1) {
          toast.warning("A game must support at least one language.");
          return prev;
        }
        return prev.filter((lang) => lang !== langCode);
      } else {
        return [...prev, langCode].sort();
      }
    });
  };

  const handleDefaultLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDefault = e.target.value;
    if (!supportedLangs.includes(newDefault)) {
      toast.warning("Selected default language must be one of the supported languages.");
      return;
    }
    setDefaultLang(newDefault);
  };

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="max-w-3xl p-8 space-y-10 mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
            {getTranslatedField(localizedName, activeLang, game.default_lang)}
            <MissingTranslationIndicator value={localizedName} />
          </h1>
          <form action={deleteGameAction.bind(null, game.id)}>
            <ConfirmButton>{t('delete')} {t('game')}</ConfirmButton>
          </form>
        </div>

        {state?.error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">
            {state.error}
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
            {t('gameDescription')}
            <MissingTranslationIndicator value={localizedDescription} />
          </h2>
          <form action={formAction} className="space-y-6">
            <LocalizedTextInput id="name" label={t('gameName')} value={localizedName} onChange={setLocalizedName} placeholder="e.g., Zenless Zone Zero" />
            <LocalizedTextInput id="description" label={t('description')} value={localizedDescription} onChange={setLocalizedDescription} placeholder="A brief overview of the game..." textarea />
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('cover_url' as UITranslationKey) || 'Cover'} {t('icon')}</label>
              <ImageInput name="cover_image" onFileChange={setCoverImageFile} existingImageUrl={currentCoverUrl} onRemoveExisting={() => { setCurrentCoverUrl(null); setCoverImageFile(null); }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('supportedLanguages')}</label>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <button key={lang.code} type="button" onClick={() => handleLanguageToggle(lang.code)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${supportedLangs.includes(lang.code) ? "bg-green-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}>
                    {lang.native_name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="default_lang" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('defaultLanguage')}</label>
              <select id="default_lang" name="default_lang" value={defaultLang} onChange={handleDefaultLangChange} className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all">
                {supportedLangs.map((langCode) => {
                  const lang = languages.find(l => l.code === langCode);
                  return <option key={langCode} value={langCode}>{lang?.native_name || langCode.toUpperCase()}</option>;
                })}
              </select>
              <p className="mt-2 text-xs text-zinc-500">{t('fallbackWarning')}</p>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold px-4 py-3 rounded-xl hover:bg-blue-500 transition-colors">{t('save')} {t('game')}</button>
          </form>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="border rounded p-4 space-y-3 bg-zinc-900/50 border-zinc-800">
            <h2 className="text-xl font-semibold text-white">{t('sections')}</h2>
            <p className="text-sm text-gray-400">{t('gameSectionsDesc')}</p>
            <Link href={`/admin/games/${game.slug}/sections`} className="inline-block bg-indigo-600 text-white px-4 py-2 rounded">{t('manageSections')} →</Link>
          </section>

          <section className="border rounded p-4 space-y-3 bg-zinc-900/50 border-zinc-800">
            <h2 className="text-xl font-semibold text-white">{t('sharedFields' as UITranslationKey) || 'Shared Fields'}</h2>
            <p className="text-sm text-gray-400">{t('sharedFieldsDesc' as UITranslationKey) || 'Manage fields that can be reused across different sections of this game.'}</p>
            <Link href={`/admin/games/${game.slug}/fields`} className="inline-block bg-blue-600 text-white px-4 py-2 rounded">{t('manageSharedFields' as UITranslationKey) || 'Manage Shared Fields'} →</Link>
          </section>
        </div>
      </main>
    </GameLocalizationProvider>
  );
}
