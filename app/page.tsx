export default function HomePage() {
  return (
    <main style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "36px", marginBottom: "12px" }}>
        The Cinema Group Exchange (TCGX)
      </h1>

      <p style={{ fontSize: "18px", lineHeight: 1.6 }}>
        TCGX is a real-money entertainment prediction platform where users
        compete in skill-based contests across film, television,
        awards, and box office outcomes.
      </p>

      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px"
        }}
      >
        <h2>Oscar Predictions</h2>
        <p>
          Submit a full ballot, compete on accuracy, and earn payouts
          based on difficulty-weighted results.
        </p>
        <p style={{ fontStyle: "italic" }}>
          Private beta — coming online soon.
        </p>
      </div>
    </main>
  );
}
