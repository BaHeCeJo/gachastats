import Link from 'next/link';

type Breadcrumb = {
  href: string;
  label: string;
};

type Props = {
  crumbs: Breadcrumb[];
};

export default function Breadcrumbs({ crumbs }: Props) {
  return (
    <nav className="text-sm text-gray-400" aria-label="Breadcrumb">
      <ol className="list-none p-0 inline-flex">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={index} className="flex items-center">
              {isLast ? (
                <span className="font-medium text-gray-200">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-white transition-colors">
                  {crumb.label}
                </Link>
              )}
              {!isLast && (
                <span className="mx-2" aria-hidden="true">/</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
