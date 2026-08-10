/** Placeholder for a nav destination whose real screen hasn't been built yet — proves routing/nav work without a dead link. */
export default function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h1>
        {title}
        <span className="dot" />
      </h1>
      <p style={{ color: 'var(--pearl-muted)', marginTop: 12 }}>המסך הזה בבנייה.</p>
    </div>
  );
}
