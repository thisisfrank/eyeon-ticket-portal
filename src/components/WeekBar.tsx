import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api, errorMessage } from '../api';
import type { Week } from '../types';
import { formatWeekRange, roundedElapsedSeconds, shiftWeek, timerStartedMs, weekStartKey } from '../lib/format';
import { TimeControl } from './TimeControl';

interface Props {
  weeks: Week[];
  now: number;
  onWeeksChange: (update: (weeks: Week[]) => Week[]) => void;
  onError: (message: string) => void;
}

/** Developer-only footer: miscellaneous time and a note for each week. */
export function WeekBar({ weeks, now, onWeeksChange, onError }: Props) {
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const editingNote = useRef(false);

  const key = shiftWeek(weekStartKey(new Date()), offset);
  const week = weeks.find((item) => item.weekStart === key) || null;

  useEffect(() => {
    if (!editingNote.current) setNote(week?.note || '');
  }, [key, week?.note]);

  const save = async (changes: Partial<Pick<Week, 'misc' | 'timerStarted' | 'note'>>) => {
    if (busy) return;
    setBusy(true);
    const before = weeks;
    if (week) onWeeksChange((list) => list.map((item) => (item.id === week.id ? { ...item, ...changes } : item)));
    try {
      const { week: saved } = await api.saveWeek(key, changes);
      onWeeksChange((list) => (list.some((item) => item.id === saved.id) ? list.map((item) => (item.id === saved.id ? saved : item)) : [...list, saved]));
    } catch (error) {
      onWeeksChange(() => before);
      onError(errorMessage(error, 'Could not save this week.'));
    } finally {
      setBusy(false);
    }
  };

  const toggle = () => {
    const started = timerStartedMs(week?.timerStarted);
    if (started == null) return void save({ timerStarted: new Date().toISOString() });
    void save({ misc: (week?.misc || 0) + roundedElapsedSeconds(started), timerStarted: null });
  };

  const navButton =
    'grid h-8 w-8 place-items-center rounded-full border border-line text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-30';

  return (
    <footer className="sticky bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-6">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setOffset((value) => value - 1)} className={navButton} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setOffset((value) => value + 1)} disabled={offset >= 0} className={navButton} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="min-w-[150px]">
          <p className="eyebrow text-[10px] text-accent">{offset === 0 ? 'This week' : 'Week of'}</p>
          <p className="text-sm font-medium text-ink">{formatWeekRange(key)}</p>
        </div>
        <TimeControl
          spent={week?.misc || 0}
          timerStarted={week?.timerStarted}
          now={now}
          busy={busy}
          withSteps
          size="md"
          onToggle={toggle}
          onAdjust={(minutes) => void save({ misc: Math.max(0, (week?.misc || 0) + minutes * 60) })}
        />
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onFocus={() => {
            editingNote.current = true;
          }}
          onBlur={() => {
            editingNote.current = false;
            if (note !== (week?.note || '')) void save({ note });
          }}
          placeholder="Miscellaneous notes for this week"
          className="field h-10 min-w-0 flex-1 basis-full sm:basis-auto"
        />
      </div>
    </footer>
  );
}
