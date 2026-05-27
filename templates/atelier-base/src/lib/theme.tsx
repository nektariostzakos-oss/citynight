"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

const COOKIE = "atelier_theme";

function readCookie(): Theme | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )atelier_theme=(dark|light)/);
  return (m?.[1] as Theme) ?? null;
}

function writeCookie(t: Theme) {
  document.cookie = `${COOKIE}=${t}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

function applyTheme(t: Theme) {
  const html = document.documentElement;
  if (t === "light") html.classList.add("light");
  else html.classList.remove("light");
  html.style.colorScheme = t;
}

type Ctx = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void };

const Ctx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  // Sync state with whatever the inline pre-paint script set.
  useEffect(() => {
    const fromCookie = readCookie();
    if (fromCookie) {
      setThemeState(fromCookie);
      applyTheme(fromCookie);
    } else {
      // No saved choice: honour the theme the layout server-rendered from the
      // tenant's settings, rather than forcing dark over a light template.
      const ssrTheme: Theme = document.documentElement.classList.contains("light")
        ? "light"
        : "dark";
      setThemeState(ssrTheme);
      applyTheme(ssrTheme);
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      theme,
      setTheme: (t) => {
        setThemeState(t);
        writeCookie(t);
        applyTheme(t);
      },
      toggle: () => {
        const next = theme === "dark" ? "light" : "dark";
        setThemeState(next);
        writeCookie(next);
        applyTheme(next);
      },
    }),
    [theme]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) {
    return {
      theme: "dark" as Theme,
      setTheme: () => {},
      toggle: () => {},
    };
  }
  return c;
}

/**
 * Inline script run before hydration to apply the theme class so there's
 * no flash. Inject as <script dangerouslySetInnerHTML> in the layout.
 */
export const themeBootScript = `
(function(){try{
  var m = document.cookie.match(/(?:^|; )atelier_theme=(dark|light)/);
  var t = m ? m[1] : 'dark';
  if (t === 'light') document.documentElement.classList.add('light');
  document.documentElement.style.colorScheme = t;
}catch(e){}})();
`;

/**
 * Demo-mode variant: ignore any prior cookie and force dark on every page
 * load. The runtime toggle still works in-session, but a fresh navigation
 * always restarts in dark.
 */
export const themeBootScriptForceDark = `
(function(){try{
  document.cookie = 'atelier_theme=dark; path=/; max-age=' + (60*60*24*365);
  document.documentElement.classList.remove('light');
  document.documentElement.style.colorScheme = 'dark';
}catch(e){}})();
`;
