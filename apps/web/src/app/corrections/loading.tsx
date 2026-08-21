export default function CorrectionsLoading() {
  return (
    <main id="main-content" className="page-main site-shell" aria-busy="true">
      <p className="eyebrow">Loading correction form</p>
      <div className="loading-block" aria-hidden="true" />
      <span className="ui-visually-hidden">Loading the correction form</span>
    </main>
  );
}
