import Link from "next/link";

const footerLinks = [
  ["About", "/about/"],
  ["Methodology", "/methodology/"],
  ["Source policy", "/source-policy/"],
  ["Corrections", "/corrections/"],
  ["Privacy", "/privacy/"],
  ["Cookies", "/cookies/"],
  ["Terms", "/terms/"],
  ["Disclaimer", "/disclaimer/"]
] as const;

export function SiteFooter({ brandName }: { brandName: string }) {
  return (
    <footer className="site-footer">
      <div className="site-shell site-footer__inner">
        <div>
          <p className="site-footer__name">{brandName}</p>
          <p className="site-footer__disclaimer">
            An independent information service. Not a government website and not affiliated with,
            endorsed by, or acting for any jail, sheriff, county, or court.
          </p>
        </div>
        <nav aria-label="Policies and product information">
          <ul className="footer-nav">
            {footerLinks.map(([label, href]) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
