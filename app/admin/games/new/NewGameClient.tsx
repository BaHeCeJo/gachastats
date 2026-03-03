"use client";

import { useActionState, useState } from "react";
import { upsertGameAction } from "@/app/admin/games/actions";
import LocalizedTextInput from "@/app/components/fields/LocalizedTextInput";
import ImageInput from "@/app/components/ImageInput";
import { LocalizedString, useLocalizationParams } from "@/lib/localization";
import { languages } from "@/lib/constants/languages";

type FormState = { error?: string; };

export default function NewGameClient() {
  const { t } = useLocalizationParams();
  const initialSupportedLanguages = ['en'];
  const [localizedName, setLocalizedName] = useState<LocalizedString>({ [initialSupportedLanguages[0]]: "" });
  const [localizedDescription, setLocalizedDescription] = useState<LocalizedString>({ [initialSupportedLanguages[0]]: "" });
  const [defaultLang, setDefaultLang] = useState<string>(initialSupportedLanguages[0]);
  const [supportedLangs, setSupportedLangs] = useState<string[]>(initialSupportedLanguages);
  const [coverImage, setCoverImage] = useState<File | null>(null);

  const [state, formAction] = useActionState(
    async (_prevState: FormState, formData: FormData) => {
      formData.set("name", JSON.stringify(localizedName));
      formData.set("description", JSON.stringify(localizedDescription));
      formData.set("default_lang", defaultLang);
      formData.set("supported_languages", JSON.stringify(supportedLangs));
      if (coverImage) formData.set("cover_image", coverImage); else formData.delete("cover_image");
      return await upsertGameAction(formData);
    },
    {} as FormState
  );

  const handleLanguageToggle = (langCode: string) => {
    setSupportedLangs((prev) => {
      if (prev.includes(langCode)) {
        if (langCode === defaultLang && prev.length > 1) { alert("Cannot remove the default language."); return prev; }
        if (prev.length === 1) { alert("A game must support at least one language."); return prev; }
        return prev.filter((lang) => lang !== langCode);
      } else return [...prev, langCode].sort();
    });
  };

  return (
    <main className="max-w-3xl p-8 space-y-6 mx-auto">
      <h1 className="text-2xl font-bold text-white">{t('newGame')}</h1>
      {state?.error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">{state.error}</div>}
      <form action={formAction} className="space-y-6">
        <LocalizedTextInput id="name" label={t('gameName')} value={localizedName} onChange={setLocalizedName} placeholder="Zenless Zone Zero" />
        <LocalizedTextInput id="description" label={t('description')} value={localizedDescription} onChange={setLocalizedDescription} placeholder="A brief overview..." textarea />
        <div><label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('icon')}</label><ImageInput name="cover_image" onFileChange={setCoverImage} existingImageUrl={null} /></div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('supportedLanguages')}</label>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (<button key={lang.code} type="button" onClick={() => handleLanguageToggle(lang.code)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${supportedLangs.includes(lang.code) ? "bg-green-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}>{lang.native_name}</button>))}
          </div>
        </div>
        <div>
          <label htmlFor="default_lang" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('defaultLanguage')}</label>
          <select id="default_lang" name="default_lang" value={defaultLang} onChange={(e) => setDefaultLang(e.target.value)} className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all">
            {supportedLangs.map((langCode) => { const lang = languages.find(l => l.code === langCode); return <option key={langCode} value={langCode}>{lang?.native_name || langCode.toUpperCase()}</option>; })}
          </select>
        </div>
        <button type="submit" className="w-full bg-green-600 text-black font-bold px-4 py-3 rounded-xl hover:bg-green-500 transition-colors">{t('createGame')}</button>
      </form>
    </main>
  );
}
