const categories = [
  {
    title: "Best Picture",
    outcomes: [
      { name: "Sinners", pct: 35.0 },
      { name: "Frankenstein", pct: 22.0 },
      { name: "Marty Supreme", pct: 15.0 },
      { name: "Hamnet", pct: 10.0 }
    ]
  },
  {
    title: "Best Director",
    outcomes: [
      { name: "Guillermo del Toro", pct: 30.0 },
      { name: "Noah Baumbach", pct: 18.0 },
      { name: "Kogonada", pct: 12.0 }
    ]
  },
  {
    title: "Best Actor",
    outcomes: [
      { name: "Timothée Chalamet", pct: 28.0 },
      { name: "Oscar Isaac", pct: 20.0 },
      { name: "Wagner Moura", pct: 12.0 }
    ]
  }
];

function ProbabilityPill({ pct }: { pct: number }) {
  return (
    <span
      style={{
        border: "1px solid rgba(255,255,255,.14)",
        background: "rgba(255,255,255,.06)",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        color: "rgba(255,255,255,.86)"
      }}
    >
      {pct.toFixed(1)}%
    </span>
  );
}

export default function OscarsPage() {
  return (
    <main style={{ marginTop: 18 }}>
      <div className="hero">
        <div className="kicker">Oscars</div>
        <h1 className="h1" style={{ marginTop: 12 }}>
          Oscar Predictions Market
        </h1>
        <p className="sub">
          This is a preview of how TCGX markets will look: clean categories, clear odds, and a portfolio-style
          ballot. Payments and settlement logic will come after the visual product is locked.
        </p>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {categories.map((c) => (
          <section key={c.title} className="card">
            <div className="cardTitle">{c.title}</div>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {c.outcomes.map((o) => (
                <div
                  key={o.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(0,0,0,.18)"
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{o.name}</div>
                  <ProbabilityPill pct={o.pct} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="footer" style={{ marginTop: 16 }}>
        Preview only. Percentages are placeholders for beta UI. Final markets will pull from internal models and settlement rules.
      </div>
    </main>
  );
}
