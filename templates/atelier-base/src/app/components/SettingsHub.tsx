"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import SettingsPanel from "./SettingsPanel";
import ThemePanel from "./ThemePanel";
import ServicesPanel from "./ServicesPanel";
import StaffPanel from "./StaffPanel";
import CouponsPanel from "./CouponsPanel";
import BlogPanel from "./BlogPanel";
import UsersPanel from "./UsersPanel";
import ToolsPanel from "./ToolsPanel";
import GiftCardsPanel from "./GiftCardsPanel";
import LanguagesPanel from "./LanguagesPanel";

type Me = { id: string; email: string; role: "admin" | "barber"; barberId?: string };

type Section =
  | "general"
  | "theme"
  | "services"
  | "staff"
  | "coupons"
  | "gifts"
  | "blog"
  | "languages"
  | "users"
  | "tools";

/**
 * The admin splits settings into two groups, each its own top-level button:
 *   - "business": how the salon runs   (setup, staff, services, promos)
 *   - "site":     the website + system (theme, blog, languages, users, tools)
 * SettingsHub renders one scope at a time; with no scope it shows all eleven.
 */
export type SettingsScope = "business" | "site";

// Order mirrors a sensible setup flow within each scope.
const SECTIONS: { id: Section; label: string; hint: string; scope: SettingsScope }[] = [
  { id: "general", label: "Setup", hint: "Brand, business details, hours, email, analytics", scope: "business" },
  { id: "staff", label: "Staff", hint: "Add stylists and their weekly availability", scope: "business" },
  { id: "services", label: "Services", hint: "Menu, prices, duration, buffers, add-ons", scope: "business" },
  { id: "coupons", label: "Coupons", hint: "Promo codes + referral rewards", scope: "business" },
  { id: "gifts", label: "Gift cards", hint: "Auto-issued codes, redeem at the till", scope: "business" },
  { id: "theme", label: "Theme", hint: "Colours and fonts", scope: "site" },
  { id: "blog", label: "Blog", hint: "Journal articles and categories", scope: "site" },
  { id: "languages", label: "Languages", hint: "Which languages visitors can switch between", scope: "site" },
  { id: "users", label: "Users", hint: "Invite admin / stylist accounts", scope: "site" },
  { id: "tools", label: "Tools", hint: "Backup, import, GDPR export", scope: "site" },
];

export default function SettingsHub({
  me,
  isTenant = false,
  scope,
}: {
  me: Me;
  isTenant?: boolean;
  /** Limit the hub to one scope. Omitted shows every section. */
  scope?: SettingsScope;
}) {
  const sections = scope ? SECTIONS.filter((s) => s.scope === scope) : SECTIONS;
  const [section, setSection] = useState<Section>(sections[0].id);

  const current = sections.find((s) => s.id === section) ?? sections[0];
  return (
    <div>
      <div className="mb-3 flex items-center gap-1 overflow-x-auto whitespace-nowrap rounded-full border border-white/15 bg-white/[0.04] p-1 backdrop-blur sm:inline-flex sm:whitespace-normal">
        {sections.map((s, i) => {
          const active = current.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`relative isolate rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors ${
                active ? "text-black" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="settings-sub-tab"
                  className="absolute inset-0 -z-10 rounded-full bg-[#c9a961]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{`${i + 1}. ${s.label}`}</span>
            </button>
          );
        })}
      </div>

      <p className="mb-6 text-xs uppercase tracking-widest text-white/60">
        {current.hint}
      </p>

      {current.id === "general" && <SettingsPanel />}
      {current.id === "theme" && <ThemePanel />}
      {current.id === "services" && <ServicesPanel />}
      {current.id === "staff" && <StaffPanel />}
      {current.id === "coupons" && <CouponsPanel />}
      {current.id === "gifts" && <GiftCardsPanel />}
      {current.id === "blog" && <BlogPanel />}
      {current.id === "languages" && <LanguagesPanel />}
      {current.id === "users" && <UsersPanel me={me} />}
      {current.id === "tools" && <ToolsPanel isTenant={isTenant} />}
    </div>
  );
}
