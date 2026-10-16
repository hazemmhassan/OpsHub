type StaffHomeProps = {
  action: (formData: FormData) => Promise<void> | void;
  copy: {
    eyebrow: string;
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
    organizationLabel: string;
    roleLabel: string;
    signOut: string;
  };
  organizationName: string;
};

export function StaffHome({ action, copy, organizationName }: StaffHomeProps) {
  return (
    <main className="staff-main">
      <aside className="staff-session" aria-label={copy.organizationLabel}>
        <div>
          <span>{copy.organizationLabel}</span>
          <strong>{organizationName}</strong>
          <small>{copy.roleLabel}</small>
        </div>
        <form action={action}>
          <button className="text-action" type="submit">
            {copy.signOut}
          </button>
        </form>
      </aside>
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
