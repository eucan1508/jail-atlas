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
            <small>Independent custody source verification</small>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
          <ul className="primary-nav">
            <li>
              <Link href="/coverage/">Coverage</Link>
            </li>
            <li>
              <Link href="/methodology/">Method</Link>
            </li>
            <li>
              <Link href="/corrections/">Corrections</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
