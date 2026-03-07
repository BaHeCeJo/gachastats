import Header from '@/app/components/Header';
import { generateBreadcrumbs } from '@/lib/breadcrumbs';

export default async function AdminHeader({ params }: { params: Promise<Record<string, string>> | Record<string, string> }) {
  const resolvedParams = await params;
  const breadcrumbs = await generateBreadcrumbs(resolvedParams);

  return <Header breadcrumbs={breadcrumbs} />;
}
