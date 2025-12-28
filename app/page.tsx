import "./globals.css";

export const metadata = {
  title: "TCGX — The Cinema Group Exchange",
  description: "Entertainment prediction markets"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="nav">
            <div className="brand">
              <div className="brandMark" />
              <div>
                <div className="brandName">TCGX</div>
                <div style={{ color: "rgba(255,255,255,.62)", fontSize: 12 }}>
                  The Cinema Group Exchange
                </div>
              </div>
            </div>

            <nav className="navLinks">
              <a className="pill" href="/">Home</a>
              <a className="pill" href="/oscars">Oscars</a>
            </nav>
          </header>

          {children}

          <footer className="footer">
            © {new Date().getFullYear()} The Cinema Group Exchange (TCGX). Private beta preview.
          </footer>
        </div>
      </body>
    </html>
  );
}
