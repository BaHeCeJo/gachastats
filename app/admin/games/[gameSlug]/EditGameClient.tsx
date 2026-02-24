"use client";

import { useActionState, useState, useEffect } from "react";
import { createClient } from '@/lib/supabase/client';
import { deleteGameAction, upsertGameAction } from '@/app/admin/games/actions';
import ConfirmButton from '@/app/components/ConfirmButton';
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import ImageInput from '@/app/components/ImageInput';
import { LocalizedString, getTranslatedField } from '@/lib/localization-utils';
import { GameLocalizationProvider } from '@/lib/localization';
import { languages } from "@/lib/constants/languages";
import Link from "next/link";

type GameData = {
  id: string;
  name: LocalizedString;
  slug: string;
  description: LocalizedString;
  cover_url: string | null;
  default_lang: string;
  supported_languages: string[];
};

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
  game: GameData;
  currentLang: string;
};

export default function EditGameClient({ game, currentLang }: AdminGamePageProps) {
  const supabase = createClient();
  const [localizedName, setLocalizedName] = useState<LocalizedString>(game.name);
  const [localizedDescription, setLocalizedDescription] = useState<LocalizedString>(game.description || {});
  const [defaultLang, setDefaultLang] = useState<string>(game.default_lang);
  const [supportedLangs, setSupportedLangs] = useState<string[]>(game.supported_languages);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(game.cover_url ? supabase.storage.from('games').getPublicUrl(game.cover_url).data.publicUrl : null);

  const [state, formAction] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      formData.set("id", game.id);
      formData.set("name", JSON.stringify(localizedName));
      formData.set("description", JSON.stringify(localizedDescription));
      formData.set("default_lang", defaultLang);
      formData.set("supported_languages", JSON.stringify(supportedLangs));

      if (coverImageFile) {
        formData.set("cover_image", coverImageFile);
      } else if (currentCoverUrl) {
        formData.set("cover_image", game.cover_url || "");
      } else {
        formData.delete("cover_image");
      }

      const result = await upsertGameAction(formData);

      if (result?.error) {
        return { ...prevState, error: result.error };
      }
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
          alert("Cannot remove the default language.");
          return prev;
        }
        if (prev.length === 1) {
          alert("A game must support at least one language.");
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
      alert("Selected default language must be one of the supported languages.");
      return;
    }
    setDefaultLang(newDefault);
  };

  useEffect(() => {
    if (!supportedLangs.includes(defaultLang)) {
      setDefaultLang(supportedLangs[0] || 'en');
    }
  }, [supportedLangs, defaultLang]);

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="max-w-3xl p-8 space-y-10 mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{getTranslatedField(localizedName, currentLang, game.default_lang)}</h1>
          <form action={deleteGameAction.bind(null, game.id)}>
            <ConfirmButton>Delete Game</ConfirmButton>
          </form>
        </div>

        {state?.error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">
            {state.error}
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Game information</h2>
          <form action={formAction} className="space-y-6">
            <LocalizedTextInput id="name" label="Game Name" value={localizedName} onChange={setLocalizedName} placeholder="e.g., Zenless Zone Zero" />
            <LocalizedTextInput id="description" label="Description" value={localizedDescription} onChange={setLocalizedDescription} placeholder="A brief overview of the game..." textarea />
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Cover Image</label>
              <ImageInput name="cover_image" onFileChange={setCoverImageFile} existingImageUrl={currentCoverUrl} onRemoveExisting={() => { setCurrentCoverUrl(null); setCoverImageFile(null); }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Supported Languages</label>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <button key={lang.code} type="button" onClick={() => handleLanguageToggle(lang.code)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${supportedLangs.includes(lang.code) ? "bg-green-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}>
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="default_lang" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Default Language</label>
              <select id="default_lang" name="default_lang" value={defaultLang} onChange={handleDefaultLangChange} className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all">
                {supportedLangs.map((langCode) => {
                  const lang = languages.find(l => l.code === langCode);
                  return <option key={langCode} value={langCode}>{lang?.name || langCode.toUpperCase()}</option>;
                })}
              </select>
              <p className="mt-2 text-xs text-zinc-500">Content in this language will be used as a fallback if a translation is missing.</p>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold px-4 py-3 rounded-xl hover:bg-blue-500 transition-colors">Save changes</button>
          </form>
        </section>

        <section className="border rounded p-4 space-y-3">
          <h2 className="text-xl font-semibold">Sections</h2>
          <p className="text-sm text-gray-400">Define characters, weapons, bangboo, and other entities for this game.</p>
          <Link href={`/admin/games/${game.slug}/sections`} className="inline-block bg-indigo-600 text-white px-4 py-2 rounded">Manage sections →</Link>
        </section>
      </main>
    </GameLocalizationProvider>
  );
}
