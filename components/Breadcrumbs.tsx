import React from 'react';
import Link from 'next/link';
import { absoluteUrl } from '@/lib/site';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url)
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Migas de pan" className="breadcrumbs">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={`${index}-${item.url}`}>
              {index > 0 && <span className="sep">/</span>}
              {isLast ? (
                <span className="current" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link href={item.url}>{item.name}</Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
}
