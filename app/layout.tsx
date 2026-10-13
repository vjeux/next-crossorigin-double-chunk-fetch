import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/" id="to-home">Home</Link> | <Link href="/about" id="to-about">About</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
