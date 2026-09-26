import Link from "next/link";
import { BrandMark } from "./brand-mark";

export function SiteHeader({ brandName }: { brandName: string }) {
  return (
    <header className="site-header">
      <div className="site-shell site-header__inner">
        <Link className="site-brand" href="/" aria-label={`${brandName} home`}>
          <BrandMark />
          <span>
            <strong>{brandName}</strong>
            <small>Public custody data, clearly sourced</small>
          </span>
        </Link>
        <div className="site-header__actions">
          <nav aria-label="Primary navigation">
            <ul className="primary-nav">
              <li>
                <Link href="/coverage/">Coverage</Link>
              </li>
              <li>
                <Link href="/methodology/">How it works</Link>
              </li>
              <li>
                <Link href="/corrections/">Corrections</Link>
              </li>
            </ul>
          </nav>
          <Link className="header-cta" href="/find/">
            Find a county <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
