import type { Metadata } from "next";
import HomeContent from "../components/HomeContent";

// Same 60s ISR window as the real homepage — the "next slot" badge moves in
// 30-min steps, and the showcase phone iframes this often.
export const revalidate = 60;

/**
 * `/preview` is the homepage rendered for the showcase hero's phone mock-up.
 * It is identical to `/` except the hero is `framed` (no nested phone), which
 * is what breaks the otherwise-infinite phone -> /preview -> phone loop.
 * Never indexed: it is a decoration, not a real page.
 */
export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false, nocache: true },
};

export default function PreviewPage() {
  return <HomeContent framed />;
}
