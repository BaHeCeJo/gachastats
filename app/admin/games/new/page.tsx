import NewGameClient from './NewGameClient';
import AdminHeader from '@/app/admin/components/AdminHeader';

export const metadata = { title: 'Create New Game - Admin' };

export default function NewGamePage({ params }: { params: Promise<Record<string, string>> }) {
  return (
    <>
      <AdminHeader params={params} />
      <NewGameClient />
    </>
  );
}
