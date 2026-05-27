import ResetForm from "./ResetForm";
import RequestForm from "./RequestForm";

export const metadata = {
  title: "Reset password · Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0806] px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-[#c9a961]">
          Admin
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-white">
          Reset password
        </h1>
        {t ? <ResetForm token={t} /> : <RequestForm />}
      </div>
    </main>
  );
}
