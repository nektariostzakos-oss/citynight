import type { Metadata } from "next";

// The preference center is reached only via a signed token link in an email
// or SMS — never browsed to. Give it a real title and keep it out of search.
export const metadata: Metadata = {
  title: "Communication preferences",
  robots: { index: false, follow: false, nocache: true },
};

export default function PreferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
