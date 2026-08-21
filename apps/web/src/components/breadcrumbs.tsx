import Link from "next/link";
import { JsonLd } from "./json-ld";
import { absoluteUrl } from "@/lib/site";

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

export function Breadcrumbs({
  currentPath,
  items
}: {
  currentPath: string;
  items: BreadcrumbItem[];
}) {
  const graphItems = items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.label,
    item: absoluteUrl(item.href ?? currentPath)
  }));

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          {items.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              aria-current={index === items.length - 1 ? "page" : undefined}
            >
              {item.href && index < items.length - 1 ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: graphItems
        }}
      />
    </>
  );
}
