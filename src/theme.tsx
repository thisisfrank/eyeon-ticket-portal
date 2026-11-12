import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';

export type Theme = 'light' | 'dark';

const KEY = 'portal-theme';

export function readThemeChoice(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111111' : '#f4f4f2');
}

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

/** Login stays dark and the board stays light until someone picks a mode. */
export function ThemeRoot({ surface, children }: { surface: 'login' | 'app'; children: ReactNode }) {
  const [choice, setChoice] = useState<Theme | null>(readThemeChoice);
  const theme = choice ?? (surface === 'login' ? 'dark' : 'light');

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore private-mode storage failures */
    }
    setChoice(next);
  };

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const value = useContext(ThemeContext);
  if (!value) return null;
  const { theme, toggle } = value;
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-quiet h-9 gap-2 px-3 text-sm"
      aria-pressed={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline">{dark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}
