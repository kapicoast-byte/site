import "../globals.css";
import "./admin.css";

export const metadata = { title: "Admin — Kapi Coast", robots: { index: false } };

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
