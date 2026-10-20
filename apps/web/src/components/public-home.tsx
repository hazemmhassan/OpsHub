import Link from "next/link";

import type { AppLocale } from "@/i18n/locale";

type StoryStep = {
  title: string;
  description: string;
};

type PublicHomeProps = {
  locale: AppLocale;
  copy: {
    eyebrow: string;
    title: string;
    description: string;
    formNote: string;
    requestAction: string;
    staffAction: string;
    benefits: [string, string, string];
    workflowEyebrow: string;
    workflowTitle: string;
    workflowDescription: string;
    steps: [StoryStep, StoryStep, StoryStep];
    flowTitle: string;
    flowSteps: [string, string, string, string];
    aiEyebrow: string;
    aiTitle: string;
    aiDescription: string;
    aiPoints: [string, string, string];
    finalTitle: string;
    finalDescription: string;
    finalAction: string;
  };
};

const requestPath = "request/opshub-service-request";

export function PublicHome({ locale, copy }: PublicHomeProps) {
  const localizedRequestPath = `/${locale}/${requestPath}`;

  return (
    <main className="public-main home-main" id="main-content" tabIndex={-1}>
      <section className="hero" aria-labelledby="public-home-title">
        <div className="hero-copy">
          <p className="eyebrow eyebrow-on-dark">{copy.eyebrow}</p>
          <h1 id="public-home-title">{copy.title}</h1>
          <p className="hero-description">{copy.description}</p>
          <div className="hero-actions">
            <Link className="primary-action" href={localizedRequestPath}>
              {copy.requestAction}
              <span aria-hidden="true">↗</span>
            </Link>
            <Link className="secondary-action" href={`/${locale}/staff`}>
              {copy.staffAction}
            </Link>
          </div>
          <p className="form-note">{copy.formNote}</p>
        </div>

        <div className="operations-preview" aria-label={copy.flowTitle}>
          <div className="preview-topline">
            <span className="preview-signal" aria-hidden="true" />
            <strong>{copy.flowTitle}</strong>
            <span className="preview-reference" translate="no">
              7HK4MP2Q9A
            </span>
          </div>
          <ol className="preview-flow">
            {copy.flowSteps.map((step, index) => (
              <li key={step}>
                <span aria-hidden="true">{index + 1}</span>
                <strong>{step}</strong>
                <i aria-hidden="true" />
              </li>
            ))}
          </ol>
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

      <section className="workflow-story" aria-labelledby="workflow-title">
        <header className="section-heading">
          <div>
            <p className="eyebrow">{copy.workflowEyebrow}</p>
            <h2 id="workflow-title">{copy.workflowTitle}</h2>
          </div>
          <p>{copy.workflowDescription}</p>
        </header>
        <ol className="story-grid">
          {copy.steps.map((step, index) => (
            <li key={step.title}>
              <span aria-hidden="true">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="ai-story" aria-labelledby="ai-story-title">
        <div className="ai-visual" aria-hidden="true">
          <span className="ai-orbit ai-orbit-one" />
          <span className="ai-orbit ai-orbit-two" />
          <span className="ai-core">AI</span>
          <span className="ai-control">✓</span>
        </div>
        <div className="ai-copy">
          <p className="eyebrow">{copy.aiEyebrow}</p>
          <h2 id="ai-story-title">{copy.aiTitle}</h2>
          <p>{copy.aiDescription}</p>
          <ul>
            {copy.aiPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="final-cta" aria-labelledby="final-cta-title">
        <div>
          <p className="eyebrow eyebrow-on-dark">OpsHub</p>
          <h2 id="final-cta-title">{copy.finalTitle}</h2>
          <p>{copy.finalDescription}</p>
        </div>
        <Link className="primary-action" href={localizedRequestPath}>
          {copy.finalAction}
          <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </main>
  );
}
