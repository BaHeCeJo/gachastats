import Header from '@/app/components/Header';
import { generateBreadcrumbs } from '@/lib/breadcrumbs';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any;
}) {
  const breadcrumbs = await generateBreadcrumbs(params);

  return (
    <div>
      <Header breadcrumbs={breadcrumbs} />
      <main>{children}</main>
    </div>
  );
}
