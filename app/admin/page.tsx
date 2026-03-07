import Link from 'next/link'
import { getTranslation } from "@/lib/localization-utils";
import { headers } from "next/headers";
import AdminHeader from '@/app/admin/components/AdminHeader';

export default async function AdminPage({ params }: { params: Promise<Record<string, string>> }) {
  const headersList = await headers();
  const acceptLanguage = headersList.get('Accept-Language');
  const currentLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';

  return (
    <>
      <AdminHeader params={params} />
      <main className="p-8">
        <h1 className="text-3xl font-bold mb-6">{getTranslation('adminDashboard', currentLang)}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded p-4 hover:bg-gray-800 transition-colors">
            <Link href="/admin/games" className="flex flex-col gap-2">
              <h2 className="text-xl font-bold">{getTranslation('manageGames', currentLang)}</h2>
              <p className="text-sm text-gray-400">
                {getTranslation('manageGamesDesc', currentLang)}
              </p>
            </Link>
          </div>
          {/* Other admin sections can be added here in the future */}
        </div>
      </main>
    </>
  )
}
