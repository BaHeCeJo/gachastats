import Header from '@/app/components/Header';
import { generateBreadcrumbs } from '@/lib/breadcrumbs';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Record<string, string>>;
}) {
  const resolvedParams = await params;
  const breadcrumbs = await generateBreadcrumbs(resolvedParams);

  return (
    <div>
      <Header breadcrumbs={breadcrumbs} />
      <main>{children}</main>
    </div>
  );
}
