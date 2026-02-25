import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminGameList from './AdminGameList';
import { LocalizedString, getTranslation } from "@/lib/localization-utils";
import { headers } from "next/headers";

type Game = {
  id: string;
  name: LocalizedString;
  slug: string;
  cover_url: string | null;
  default_lang: string;
  supported_languages: string[];
};

export default async function AdminGamesPage() {
  const supabase = await createClient()
  const headersList = await headers();
  const acceptLanguage = headersList.get('Accept-Language');
  const currentLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';

  const { data: games } = await supabase
    .from('games')
    .select('id, name, slug, cover_url, default_lang, supported_languages')
    .order('name->>en', { ascending: true })

  return (
    <main className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{getTranslation('games', currentLang)}</h1>
        <Link
          href="/admin/games/new"
          prefetch={false}
          className="bg-[#22c55e] text-black font-bold px-4 py-2 rounded hover:bg-[#1da34a] transition"
        >
          {getTranslation('createGame', currentLang)}
        </Link>
      </div>

      {games && games.length > 0 ? (
        <AdminGameList 
          games={games as any} 
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} 
        />
      ) : (
        <p className="text-gray-400">{getTranslation('noGames', currentLang)}</p>
      )}
    </main>
  )
}
