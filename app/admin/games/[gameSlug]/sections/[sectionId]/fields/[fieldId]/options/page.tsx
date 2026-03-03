import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGameBySlug } from "@/lib/supabase/queries";
import { LocalizedString, getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers } from "next/headers";
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';
import AdminOptionList from './AdminOptionList';

// ... (types)

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

  const fieldData = fieldRes.data;
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  if (!fieldData) {
    redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`);
  }

  const gameFieldId = fieldData.game_field_id;
  const field = {
    id: fieldData.id,
    key: fieldData.key,
    manual_fill: (fieldData.game_fields as any)?.manual_fill
  };

  const { data: options } = await supabase
    .from('field_options')
    .select('id, value_key, icon_path, color, order_index')
    .eq('game_field_id', gameFieldId)
    .order('order_index', { ascending: true }) as { data: Option[] | null };

  return (
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
            options={options as any} 
            gameSlug={gameSlug} 
            sectionId={sectionId} 
            fieldId={fieldId} 
            gameDefaultLang={game.default_lang}
            supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          />
        ) : (
          <p className="text-gray-400">{getTranslation('noOptionsYet', currentLang)}</p>
        )}
      </main>
    </GameLocalizationProvider>
  )
}
