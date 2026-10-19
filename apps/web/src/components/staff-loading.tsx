export function StaffLoading() {
  return (
    <main
      className="auth-main"
      id="main-content"
      tabIndex={-1}
      aria-busy="true"
    >
      <div className="staff-loading-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
