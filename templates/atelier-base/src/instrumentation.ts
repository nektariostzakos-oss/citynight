export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // In demo mode, seed the full demo on first boot if it was never set up
    // (fresh deploy with no data/settings.json). No-op on customer installs.
    const { ensureDemoSeeded } = await import("./lib/demoMode");
    await ensureDemoSeeded().catch(() => {});

    const { startReminderScheduler } = await import("./lib/reminderScheduler");
    startReminderScheduler();
  }
}
