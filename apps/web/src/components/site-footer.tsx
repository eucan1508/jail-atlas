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
        <div className="site-footer__brand">
          <Link className="site-brand site-brand--footer" href="/" aria-label={`${brandName} home`}>
            <span className="brand-mark brand-mark--footer" aria-hidden="true">
              JA
            </span>
            <strong>{brandName}</strong>
          </Link>
          <p className="site-footer__disclaimer">
            An independent information service for checking public custody sources. Not a government
            website and not affiliated with any jail, sheriff, county, or court.
          </p>
          <p className="site-footer__meta">
            Built around source evidence · Updated on a rolling schedule
          </p>
        </div>
        <div className="site-footer__links">
          <div>
            <p className="site-footer__label">Explore</p>
            <nav aria-label="Product information">
              <ul className="footer-nav">
                {footerLinks.slice(0, 4).map(([label, href]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div>
            <p className="site-footer__label">Policies</p>
            <nav aria-label="Policies">
              <ul className="footer-nav">
                {footerLinks.slice(4).map(([label, href]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
      <div className="site-shell site-footer__bottom">
        <span>
          © {new Date().getFullYear()} {brandName}
        </span>
        <span>Evidence first. Context always.</span>
      </div>
    </footer>
  );
}
