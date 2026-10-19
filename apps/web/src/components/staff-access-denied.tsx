type StaffAccessDeniedProps = {
  action: (formData: FormData) => Promise<void> | void;
  copy: {
    eyebrow: string;
    title: string;
    description: string;
    guidance: string;
    signOut: string;
  };
};

export function StaffAccessDenied({ action, copy }: StaffAccessDeniedProps) {
  return (
    <main className="auth-main" id="main-content" tabIndex={-1}>
      <section className="auth-card" aria-labelledby="access-denied-title">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 id="access-denied-title">{copy.title}</h1>
        <p className="auth-description">{copy.description}</p>
        <p className="auth-guidance">{copy.guidance}</p>
        <form action={action}>
          <button className="secondary-action" type="submit">
            {copy.signOut}
          </button>
        </form>
      </section>
    </main>
  );
}
