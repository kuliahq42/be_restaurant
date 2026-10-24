import "./globals.css";

export const metadata = {
  title: "Restaurant Backend API",
  description: "Restaurant Ordering, Inventory & Accounting API",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
