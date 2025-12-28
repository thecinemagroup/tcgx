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
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system" }}>
        {children}
      </body>
    </html>
  );
}
