import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set up your site",
  robots: { index: false, follow: false },
};

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
