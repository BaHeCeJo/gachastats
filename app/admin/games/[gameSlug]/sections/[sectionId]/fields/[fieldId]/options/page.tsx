import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LocalizedString, getTranslatedField } from "@/lib/localization-utils";
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LocalizedString, getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers } from "next/headers";
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';
import AdminOptionList from './AdminOptionList';

type Game = {
  id: string;
  name: LocalizedString;
  slug: string;
  default_lang: string;
  supported_languages: string[];
}

type Field = {
  id: string;
  key: LocalizedString; // Localized
  manual_fill: boolean;
}

type Option = {
  id: string;
  value_key: LocalizedString; // Localized
  icon_path: string | null;
  color: string | null;
  order_index: number;
}

type PageProps = {
  params: Promise<{
    gameSlug: string
    sectionId: string
    fieldId: string
  }>
}

export default async function FieldOptionsPage({ params }: PageProps) {
  const { gameSlug, sectionId, fieldId } = await params
  if (!gameSlug || !sectionId || !fieldId) redirect('/admin/games')

  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, name, slug, default_lang, supported_languages')
    .eq('slug', gameSlug)
    .single<Game>();

  if (!game) redirect('/admin/games')

  const { data: field } = await supabase
    .from('section_fields')
    .select('id, key, manual_fill')
    .eq('id', fieldId)
    .single<Field>();

  if (!field) {
    redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`);
  }

  const { data: options } = await supabase
    .from('field_options')
    .select('id, value_key, icon_path, color, order_index')
    .eq('field_id', fieldId)
    .order('order_index', { ascending: true }) as { data: Option[] | null };

  const headersList = await headers();
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

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