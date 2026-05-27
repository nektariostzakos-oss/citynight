import type { Metadata } from "next";

// The review page is reached only via a signed token link in the post-visit
// review-request email. Give it a real title and keep it out of search.
export const metadata: Metadata = {
  title: "Rate your visit",
  robots: { index: false, follow: false, nocache: true },
};

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
