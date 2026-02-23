"use client";

import { useState, useActionState } from 'react';
import { LocalizedString, GameLocalizationProvider } from "@/lib/localization";
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import ImageInput from '@/app/components/ImageInput';
import { upsertSectionAction } from '@/app/admin/games/[gameSlug]/sections/actions';

type GameData = { id: string; name: LocalizedString; slug: string; default_lang: string; supported_languages: string[]; };
type FormState = { error?: string; gameId: string; gameSlug: string; name: LocalizedString; color: string; order_index: number; icon_path: string | null; default_lang: string; supported_languages: string[]; };

export default function NewSectionClient({ game }: { game: GameData }) {
  const [localizedKey, setLocalizedKey] = useState<LocalizedString>({ [game.default_lang]: "" });
  const [color, setColor] = useState<string>("#ffffff");
  const [orderIndex, setOrderIndex] = useState<number>(0);
  const [iconFile, setIconFile] = useState<File | null>(null);

  const [state, formAction] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      formData.set("key", JSON.stringify(localizedKey));
      formData.set("color", color);
      formData.set("order_index", orderIndex.toString());
      if (iconFile) formData.set("icon_file", iconFile);
      return await upsertSectionAction(game.id, game.slug, game.default_lang, formData);
    },
    { gameId: game.id, gameSlug: game.slug, name: { [game.default_lang]: "" }, color: "#ffffff", order_index: 0, icon_path: null, default_lang: game.default_lang, supported_languages: game.supported_languages } as FormState
  );

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="max-w-xl p-8 space-y-6 mx-auto">
        <h1 className="text-2xl font-bold text-white">{game.name[game.default_lang]} — Add Section</h1>
        {state?.error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">{state.error}</div>}
        <form action={formAction} className="space-y-4" encType="multipart/form-data">
          <LocalizedTextInput id="key" label="Section Name (Key)" value={localizedKey} onChange={setLocalizedKey} placeholder="Characters" />
          <div className="flex gap-4 items-center">
            <div><label htmlFor="color" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Color</label><input id="color" name="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 border-0 rounded-md overflow-hidden bg-zinc-900" /></div>
            <div><label htmlFor="order_index" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Order Index</label><input id="order_index" name="order_index" type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} className="block w-24 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all" /></div>
          </div>
          <div><label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Icon</label><ImageInput name="icon_file" onFileChange={setIconFile} existingImageUrl={null} /></div>
          <button type="submit" className="w-full bg-green-600 text-black font-bold px-4 py-3 rounded-xl hover:bg-green-500 transition-colors">Create Section</button>
        </form>
      </main>
    </GameLocalizationProvider>
  );
}
