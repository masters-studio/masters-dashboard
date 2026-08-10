// Placeholder — routing and real pages land in the auth/navigation slices
// that follow. This only exists right now to prove the theme is wired up
// correctly (dark background, Hebrew RTL, brand fonts/colors all rendering).
function App() {
  return (
    <div className="container" style={{ paddingBlock: 48 }}>
      <p className="eyebrow-placeholder" style={{ color: 'var(--orange)' }}>
        MASTERS STUDIO
      </p>
      <h1>
        לוח בקרה<span className="dot" />
      </h1>
      <p style={{ color: 'var(--pearl-muted)', marginTop: 12 }}>
        תיאום ראשוני — הבמה מוכנה, הבנייה בדרך.
      </p>
      <button className="btn btn-primary" style={{ marginTop: 20 }}>
        כפתור לדוגמה
      </button>
    </div>
  )
}

export default App
