import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LocalizedString, getTranslatedField } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers } from "next/headers";

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

  if (!field || field.manual_fill) {
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
          <h1 className="text-2xl font-bold">
            Options — {getTranslatedField(field.key, currentLang, game.default_lang)}
          </h1>

          <Link
            href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options/new`}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
            prefetch={false}
          >
            Add option
          </Link>
        </div>

        <div className="grid gap-3">
          {options && options.length > 0 ? (
            options.map(opt => (
              <Link
                key={opt.id}
                href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options/${opt.id}`}
                className="border rounded p-3 flex items-center gap-4 hover:bg-gray-800"
                prefetch={false}
              >
                {opt.icon_path && (
                  <img
                    src={
                      supabase.storage
                        .from('games')
                        .getPublicUrl(opt.icon_path)
                        .data.publicUrl
                    }
                    className="w-8 h-8 object-cover rounded"
                    alt={getTranslatedField(opt.value_key, currentLang, game.default_lang)}
                  />
                )}

                <span className="font-medium">{getTranslatedField(opt.value_key, currentLang, game.default_lang)}</span>

                {opt.color && (
                  <span
                    className="ml-auto w-4 h-4 rounded-full"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
              </Link>
            ))
          ) : (
            <p className="text-gray-400">No options yet.</p>
          )}
        </div>
      </main>
    </GameLocalizationProvider>
  )
}