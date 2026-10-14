type StaffHomeProps = {
  copy: {
    eyebrow: string;
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
  };
};

export function StaffHome({ copy }: StaffHomeProps) {
  return (
    <main className="staff-main">
      <section className="staff-heading" aria-labelledby="staff-home-title">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 id="staff-home-title">{copy.title}</h1>
        </div>
        <p>{copy.description}</p>
      </section>

      <section className="request-panel" aria-labelledby="empty-requests-title">
        <div className="empty-state-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h2 id="empty-requests-title">{copy.emptyTitle}</h2>
        <p>{copy.emptyDescription}</p>
      </section>
    </main>
  );
}
