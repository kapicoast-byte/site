import type { Metadata, Viewport } from "next";
import "./globals.css";
import ScrollReveal from "@/components/ScrollReveal";
import CardSpotlight from "@/components/CardSpotlight";

export const metadata: Metadata = {
  title: "Kapi Coast — காபி கோஸ்ட் · Filter kapi, kadak chai & street eats on OMR, Chennai",
  description:
    "Kapi Coast on OMR, Kazhipattur — filter coffee, chai, chaat and street eats. Menu with recipes, party cakes, and notes from the counter.",
  icons: { icon: "/img/logo.png" },
};

// themeColor belongs on the viewport export in Next 15, not metadata.
export const viewport: Viewport = { themeColor: "#100C08" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* suppressHydrationWarning here covers a real-world nuisance, not a bug of
       ours: browser extensions (password managers, dark-mode tools, and the
       crxemulator one seen in testing) write attributes onto <html> and <body>
       before React hydrates, and React flags the mismatch. It applies only to
       this element's own attributes — one level deep — so genuine mismatches
       anywhere inside the page are still reported. */
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Rozha+One&family=Anton&family=Karla:wght@400;500;700&family=Anek+Tamil:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        {/* Renders nothing. It finds the page's own sections and animates them
            in as they are scrolled to, so no page had to be edited to opt in
            and nothing has to be remembered when one is added. */}
        <ScrollReveal />
        {/* Also renders nothing. One delegated listener lights whichever card
            the pointer is over. */}
        <CardSpotlight />
      </body>
    </html>
  );
}
