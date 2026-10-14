import Link from "next/link";

import type { AppLocale } from "@/i18n/locale";

type PublicHomeProps = {
  locale: AppLocale;
  copy: {
    eyebrow: string;
    title: string;
    description: string;
    formNote: string;
    staffAction: string;
    benefits: [string, string, string];
  };
};

export function PublicHome({ locale, copy }: PublicHomeProps) {
  return (
    <main className="public-main">
      <section className="hero" aria-labelledby="public-home-title">
        <div className="hero-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 id="public-home-title">{copy.title}</h1>
          <p className="hero-description">{copy.description}</p>
          <div className="hero-actions">
            <Link className="primary-action" href={`/${locale}/staff`}>
              {copy.staffAction}
            </Link>
            <p className="form-note">{copy.formNote}</p>
          </div>
        </div>

        <ul className="benefit-grid" aria-label={copy.eyebrow}>
          {copy.benefits.map((benefit, index) => (
            <li className="benefit-card" key={benefit}>
              <span aria-hidden="true">0{index + 1}</span>
              <strong>{benefit}</strong>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
