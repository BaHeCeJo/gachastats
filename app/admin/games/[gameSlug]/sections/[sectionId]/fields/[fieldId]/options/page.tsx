import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGameBySlug, LocalizedString } from "@/lib/supabase/queries";
import { getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers } from "next/headers";
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';
import AdminOptionList from './AdminOptionList';
import AdminHeader from '@/app/admin/components/AdminHeader';

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string; fieldId: string }>
}

interface Option {
  id: string;
  value_key: LocalizedString;
  icon_path: string | null;
  color: string | null;
  order_index: number;
}

interface FieldData {
  id: string;
  key: LocalizedString;
  game_field_id: string;
  game_fields: {
    manual_fill: boolean;
  } | {
    manual_fill: boolean;
  }[] | null;
}

export default async function FieldOptionsPage({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId, fieldId } = await paramsPromise
  if (!gameSlug || !sectionId || !fieldId) redirect('/admin/games')

  const supabase = await createClient()

  // 1. Fetch game (cached)
  const { data: game } = await getGameBySlug(gameSlug);
  if (!game) redirect('/admin/games')

  // 2. Parallelize everything else
  const [fieldRes, headersList] = await Promise.all([
    supabase
      .from('section_fields')
      .select(`
        id, 
        key, 
        game_field_id,
        game_fields (
          manual_fill
        )
      `)
      .eq('id', fieldId)
      .single(),
    headers()
  ]);

  const fieldData = fieldRes.data as unknown as FieldData;
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  if (!fieldData) {
    redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`);
  }

  const gameFieldId = fieldData.game_field_id;
  const manualFill = Array.isArray(fieldData.game_fields) 
    ? fieldData.game_fields[0]?.manual_fill 
    : fieldData.game_fields?.manual_fill;

  const field = {
    id: fieldData.id,
    key: fieldData.key,
    manual_fill: manualFill ?? false
  };

  const { data: options } = await supabase
    .from('field_options')
    .select('id, value_key, icon_path, color, order_index')
    .eq('game_field_id', gameFieldId)
    .order('order_index', { ascending: true }) as { data: Option[] | null };

  return (
    <>
      <AdminHeader params={paramsPromise} />
      <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
        <main className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {getTranslation('options', currentLang)} — {getTranslatedField(field.key, currentLang, game.default_lang)}
            <MissingTranslationIndicator value={field.key} />
          </h1>

          <Link
            href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options/new`}
            className="bg-[#22c55e] text-black font-bold px-4 py-2 rounded hover:bg-[#1da34a] transition"
            prefetch={false}
          >
            {getTranslation('createOption', currentLang)}
          </Link>
        </div>

        {options && options.length > 0 ? (
          <AdminOptionList 
            options={options} 
            gameSlug={gameSlug} 
            sectionId={sectionId} 
            fieldId={fieldId} 
            gameDefaultLang={game.default_lang}
          />
        ) : (
          <p className="text-gray-400">{getTranslation('noOptionsYet', currentLang)}</p>
        )}
      </main>
    </GameLocalizationProvider>
    </>
  )
}
