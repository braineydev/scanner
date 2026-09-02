import "./globals.css";

export const metadata = {
  title: "Inventory Product Entry",
  description: "Inventory product lookup and manual entry flow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
