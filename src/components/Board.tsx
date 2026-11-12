import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, Plus, RefreshCw, Search } from 'lucide-react';
import { api, errorMessage, type TicketChanges } from '../api';
import type { BoardData, Reply, Role, Session, Ticket, Week } from '../types';
import { COLUMNS, columnLabel, columnOf, type ColumnId } from '../lib/board';
import { compareTickets, rankBetween, roundedElapsedSeconds, timerStartedMs } from '../lib/format';
import { newestReplyTimes, readSeen, seenKeyFor, writeSeen, type SeenMap } from '../lib/seen';
import { boardStats, needsTeamReply } from '../lib/stats';
import { StatStrip } from './StatStrip';
import { Eyebrow, Wordmark } from './Brand';
import { DemoBanner } from './DemoBanner';
import { TicketCard } from './TicketCard';
import { TicketDrawer } from './TicketDrawer';
import { NewTicketModal } from './NewTicketModal';
import { WeekBar } from './WeekBar';

interface Props {
  session: Session;
  onSignOut: () => void;
  onDemoSwitch?: (role: Role) => void;
  onDemoReset?: () => void;
}

type DropTarget = { column: ColumnId; index: number };

const EMPTY: BoardData = { tickets: [], replies: [], weeks: [], types: [] };
const QUIET_REFRESH_MS = 30_000;

export function Board({ session, onSignOut, onDemoSwitch, onDemoReset }: Props) {
  const { user, features } = session;
  const developer = user.role === 'developer';

  const [data, setData] = useState<BoardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [onlyNeedsReply, setOnlyNeedsReply] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyTimers, setBusyTimers] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const lastLoaded = useRef(0);
  const interacting = useRef(false);
  interacting.current = Boolean(draggedId) || saving || busyTimers.length > 0;
  const seenKey = seenKeyFor(user, session.demo);
  const [seen, setSeen] = useState<SeenMap>({});

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const next = await api.board();
      setData(next);
      setError('');
      lastLoaded.current = Date.now();
      // First visit in this browser: treat everything already there as read.
      const stored = readSeen(seenKey);
      const baseline = stored ?? newestReplyTimes(next.replies);
      if (!stored) writeSeen(seenKey, baseline);
      setSeen(baseline);
    } catch (loadError) {
      setError(errorMessage(loadError, 'Could not load tickets.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [seenKey]);

  useEffect(() => {
    void load();
  }, [load]);

  // Pick up new replies when someone comes back to the tab.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== 'visible' || interacting.current) return;
      if (Date.now() - lastLoaded.current > QUIET_REFRESH_MS) void load(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [load]);

  const timerRunning =
    developer &&
    (data.tickets.some((ticket) => timerStartedMs(ticket.timerStarted) != null) ||
      data.weeks.some((week) => timerStartedMs(week.timerStarted) != null));

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  // --- Derived data ----------------------------------------------------------

  const repliesByTicket = useMemo(() => {
    const map = new Map<string, Reply[]>();
    for (const reply of data.replies) {
      if (!reply.ticketId) continue;
      const list = map.get(reply.ticketId) || [];
      list.push(reply);
      map.set(reply.ticketId, list);
    }
    return map;
  }, [data.replies]);

  /** Projects ordered by most recent ticket. */
  const projects = useMemo(() => {
    const latest = new Map<string, number>();
    for (const ticket of data.tickets) {
      if (!ticket.project) continue;
      const time = Date.parse(ticket.submitted) || 0;
      latest.set(ticket.project, Math.max(latest.get(ticket.project) || 0, time));
    }
    return [...latest.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [data.tickets]);

  const clients = useMemo(
    () => [...new Set(data.tickets.map((ticket) => ticket.clientEmail).filter(Boolean))].sort(),
    [data.tickets]
  );

  const visibleTickets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.tickets.filter((ticket) => {
      if (onlyNeedsReply && !needsTeamReply(ticket, repliesByTicket.get(ticket.id))) return false;
      if (typeFilter !== 'all' && ticket.type !== typeFilter) return false;
      if (projectFilter !== 'all' && ticket.project !== projectFilter) return false;
      if (!needle) return true;
      return [String(ticket.number ?? ''), ticket.type, ticket.project, ticket.clientName, ticket.clientEmail, ticket.description, ticket.response]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [data.tickets, query, typeFilter, projectFilter, onlyNeedsReply, repliesByTicket]);

  const stats = useMemo(() => boardStats(visibleTickets, repliesByTicket), [visibleTickets, repliesByTicket]);

  const columns = useMemo(
    () =>
      COLUMNS.map((column) => ({
        ...column,
        tickets: visibleTickets.filter((ticket) => columnOf(ticket) === column.id).sort(compareTickets),
      })),
    [visibleTickets]
  );

  /** The newest message came from the other side and this viewer hasn't opened it yet. */
  const waitingOnViewer = (ticket: Ticket) => {
    const thread = repliesByTicket.get(ticket.id);
    const last = thread?.[thread.length - 1];
    if (!last || columnOf(ticket) === 'Closed') return false;
    const fromOtherSide = developer ? last.from === 'Client' : last.from !== 'Client';
    return fromOtherSide && (Date.parse(last.posted) || 0) > (seen[ticket.id] || 0);
  };

  const selected = data.tickets.find((ticket) => ticket.id === selectedId) || null;
  const selectedThread = selected ? repliesByTicket.get(selected.id) : undefined;
  const selectedNewest = selectedThread?.length ? Date.parse(selectedThread[selectedThread.length - 1].posted) || 0 : 0;

  // Opening a thread marks it read.
  useEffect(() => {
    if (!selectedId || !selectedNewest) return;
    setSeen((current) => {
      if ((current[selectedId] || 0) >= selectedNewest) return current;
      const next = { ...current, [selectedId]: selectedNewest };
      writeSeen(seenKey, next);
      return next;
    });
  }, [selectedId, selectedNewest, seenKey]);

  // --- Updates ---------------------------------------------------------------

  const patchLocal = (id: string, changes: Partial<Ticket>) =>
    setData((current) => ({
      ...current,
      tickets: current.tickets.map((ticket) => (ticket.id === id ? { ...ticket, ...changes } : ticket)),
    }));

  const saveTicket = async (ticket: Ticket, changes: TicketChanges, kind: 'move' | 'timer' | 'notes') => {
    const before = data.tickets;
    patchLocal(ticket.id, changes);
    if (kind === 'move') setSaving(true);
    if (kind === 'timer') setBusyTimers((ids) => [...ids, ticket.id]);
    try {
      await api.updateTicket(ticket.id, changes);
    } catch (saveError) {
      setData((current) => ({ ...current, tickets: before }));
      setError(errorMessage(saveError, 'Could not save that change.'));
    } finally {
      if (kind === 'move') setSaving(false);
      if (kind === 'timer') setBusyTimers((ids) => ids.filter((id) => id !== ticket.id));
    }
  };

  const toggleTimer = (ticket: Ticket) => {
    if (busyTimers.includes(ticket.id)) return;
    const started = timerStartedMs(ticket.timerStarted);
    if (started == null) return void saveTicket(ticket, { timerStarted: new Date().toISOString() }, 'timer');
    void saveTicket(ticket, { timeSpent: (ticket.timeSpent || 0) + roundedElapsedSeconds(started), timerStarted: null }, 'timer');
  };

  const adjustTimer = (ticket: Ticket, minutes: number) => {
    if (busyTimers.includes(ticket.id)) return;
    void saveTicket(ticket, { timeSpent: Math.max(0, (ticket.timeSpent || 0) + minutes * 60) }, 'timer');
  };

  const handleDrop = (columnId: ColumnId, index: number) => {
    const moving = data.tickets.find((ticket) => ticket.id === draggedId);
    setDraggedId(null);
    setDropTarget(null);
    if (!moving || saving) return;

    const visible = (columns.find((column) => column.id === columnId)?.tickets || []).filter((ticket) => ticket.id !== moving.id);
    const all = data.tickets.filter((ticket) => columnOf(ticket) === columnId && ticket.id !== moving.id).sort(compareTickets);
    const before = visible[Math.max(0, Math.min(index, visible.length))];
    const position = before ? Math.max(0, all.findIndex((ticket) => ticket.id === before.id)) : all.length;

    const source = columnOf(moving);
    if (source === columnId) {
      const original = data.tickets
        .filter((ticket) => columnOf(ticket) === columnId)
        .sort(compareTickets)
        .findIndex((ticket) => ticket.id === moving.id);
      if (original === position) return;
    }

    const changes: TicketChanges = { rank: rankBetween(all[position - 1], all[position]) };
    if (columnId === 'Working') {
      changes.working = true;
    } else {
      if (moving.working) changes.working = false;
      if (moving.status !== columnId) changes.status = columnId;
    }
    void saveTicket(moving, changes, 'move');
  };

  const onReplied = (reply: Reply, patch: Partial<Ticket> & { id: string }) => {
    setData((current) => ({
      ...current,
      replies: [...current.replies, reply],
      tickets: current.tickets.map((ticket) => (ticket.id === patch.id ? { ...ticket, ...patch } : ticket)),
    }));
  };

  const onCreated = (ticket: Ticket) => {
    setData((current) => ({ ...current, tickets: [ticket, ...current.tickets] }));
    setComposing(false);
    setQuery('');
    setTypeFilter('all');
    setProjectFilter('all');
    setSelectedId(ticket.id);
  };

  const setWeeks = (update: (weeks: Week[]) => Week[]) => setData((current) => ({ ...current, weeks: update(current.weeks) }));

  // --- Render ----------------------------------------------------------------

  const total = data.tickets.length;
  const hour = new Date().getHours();
  const devHeadline = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
  const showWeekBar = developer && features.weeks && !loading;
  const filterSelect = 'field select-chevron h-11 w-auto min-w-0 text-sm';

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {session.demo && onDemoSwitch && onDemoReset && (
        <DemoBanner role={user.role} onSwitch={onDemoSwitch} onReset={onDemoReset} onExit={onSignOut} />
      )}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Wordmark />
            <span className="hidden rounded-full border border-line px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted sm:inline">
              {developer ? 'Developer' : 'Client'}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden max-w-[260px] truncate text-sm text-muted md:inline">{user.email || user.name}</span>
            <button type="button" onClick={onSignOut} className="btn-quiet h-9 px-3.5 text-sm">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1600px] px-4 pb-5 pt-8 sm:px-6 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <Eyebrow>{developer ? 'Developer board' : 'Your tickets'}</Eyebrow>
            <h1 className="display mt-3 text-[clamp(34px,4.4vw,56px)] leading-[0.98]">
              {developer ? devHeadline : 'What can we help with?'}
            </h1>
            {!developer && (
              <p className="mt-3 text-[17px] leading-relaxed text-body">
                {total === 0 && !loading
                  ? 'You haven’t submitted any tickets yet. Use New ticket to send your first one, with screenshots if you have them.'
                  : 'Submit a ticket, attach screenshots, and reply right on the thread. We keep the status up to date as we work.'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={loading || refreshing}
              className="btn-quiet h-11 w-11"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => setComposing(true)} className="btn-primary h-11 px-5 text-[15px]">
              <Plus className="h-4 w-4" />
              New ticket
            </button>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-2.5">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={developer ? 'Search tickets, clients, projects' : 'Search your tickets'}
              className="field h-11 pl-10 text-sm"
              aria-label="Search tickets"
            />
          </label>
          {projects.length > 1 && (
            <select aria-label="Project" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className={filterSelect}>
              <option value="all">All projects</option>
              {[...projects].sort((a, b) => a.localeCompare(b)).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
          {data.types.length > 0 && (
            <select aria-label="Type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={filterSelect}>
              <option value="all">All types</option>
              {data.types.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
          {saving && <span className="self-center px-2 text-sm text-muted">Saving&hellip;</span>}
        </div>

        {error && (
          <div role="alert" className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-danger">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="shrink-0 font-medium underline-offset-2 hover:underline">
              Dismiss
            </button>
          </div>
        )}
      </section>

      {loading ? (
        <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-4 px-4 pb-8 sm:px-6 md:grid-cols-2 xl:grid-cols-4" aria-label="Loading tickets">
          {COLUMNS.map((column) => (
            <div key={column.id} className="h-[420px] animate-pulse rounded-2xl bg-column" />
          ))}
        </div>
      ) : (
        <div className="scroll-quiet mx-auto w-full max-w-[1600px] flex-1 snap-x overflow-x-auto px-4 pb-6 sm:px-6">
          {developer && !loading && (
            <StatStrip stats={stats} needsReplyActive={onlyNeedsReply} onToggleNeedsReply={() => setOnlyNeedsReply((value) => !value)} />
          )}
          <div className="flex w-full gap-4">
          {columns.map((column, columnIndex) => (
            <section
              key={column.id}
              className={`flex min-w-[calc(100vw-56px)] flex-1 snap-start flex-col sm:min-w-[288px] rounded-2xl border border-line bg-column ${
                showWeekBar ? 'h-[calc(100dvh-150px)]' : 'h-[calc(100dvh-96px)]'
              } min-h-[440px]`}
              aria-label={columnLabel(column.id, user.role)}
              onDragOver={(event) => {
                if (!draggedId) return;
                event.preventDefault();
                setDropTarget({ column: column.id, index: column.tickets.filter((ticket) => ticket.id !== draggedId).length });
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!draggedId) return;
                handleDrop(column.id, dropTarget?.column === column.id ? dropTarget.index : column.tickets.length);
              }}
            >
              <header className="flex items-center justify-between px-4 pb-3 pt-4">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[11px] font-semibold text-accent">{String(columnIndex + 1).padStart(2, '0')}</span>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} aria-hidden />
                  <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">{columnLabel(column.id, user.role)}</h2>
                </div>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-line bg-card px-2 font-mono text-[11px] font-semibold text-body">
                  {column.tickets.length}
                </span>
              </header>

              <div className="scroll-quiet flex-1 space-y-2.5 overflow-y-auto px-3 pb-3">
                {column.tickets.map((ticket, index) => (
                  <div key={ticket.id}>
                    {dropTarget?.column === column.id && dropTarget.index === index && draggedId !== ticket.id && (
                      <div className="mb-2.5 h-1 rounded-full bg-accent-fill" />
                    )}
                    <TicketCard
                      ticket={ticket}
                      role={user.role}
                      replyCount={repliesByTicket.get(ticket.id)?.length || 0}
                      waitingOnViewer={waitingOnViewer(ticket)}
                      showProject={projects.length > 1}
                      draggable={developer && !saving}
                      dragging={draggedId === ticket.id}
                      now={now}
                      timerBusy={busyTimers.includes(ticket.id)}
                      onOpen={() => setSelectedId(ticket.id)}
                      onDragStart={developer ? () => setDraggedId(ticket.id) : undefined}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDropTarget(null);
                      }}
                      onDragOver={
                        developer
                          ? (event) => {
                              if (!draggedId) return;
                              event.preventDefault();
                              event.stopPropagation();
                              const rect = event.currentTarget.getBoundingClientRect();
                              let next = index + (event.clientY > rect.top + rect.height / 2 ? 1 : 0);
                              const from = column.tickets.findIndex((item) => item.id === draggedId);
                              if (from !== -1 && from < next) next -= 1;
                              setDropTarget({ column: column.id, index: next });
                            }
                          : undefined
                      }
                      onToggleTimer={developer ? () => toggleTimer(ticket) : undefined}
                      onAdjustTimer={developer ? (minutes) => adjustTimer(ticket, minutes) : undefined}
                    />
                  </div>
                ))}
                {dropTarget?.column === column.id && dropTarget.index >= column.tickets.filter((ticket) => ticket.id !== draggedId).length && (
                  <div className="h-1 rounded-full bg-accent-fill" />
                )}
                {column.tickets.length === 0 && (
                  <div className="grid h-28 place-items-center rounded-xl border border-dashed border-line-strong px-4 text-center text-sm text-faint">
                    {developer ? 'Drop tickets here' : column.id === 'New' ? 'Nothing waiting. New tickets show up here.' : 'Nothing here yet'}
                  </div>
                )}
              </div>
            </section>
          ))}
          </div>
        </div>
      )}

      {showWeekBar && <WeekBar weeks={data.weeks} now={now} onWeeksChange={setWeeks} onError={setError} />}

      {selected && (
        <TicketDrawer
          ticket={selected}
          replies={repliesByTicket.get(selected.id) || []}
          role={user.role}
          features={features}
          now={now}
          timerBusy={busyTimers.includes(selected.id)}
          onClose={() => setSelectedId(null)}
          onReplied={onReplied}
          onToggleTimer={() => toggleTimer(selected)}
          onAdjustTimer={(minutes) => adjustTimer(selected, minutes)}
          onSaveNotes={(notes) => void saveTicket(selected, { internalNotes: notes }, 'notes')}
        />
      )}

      {composing && (
        <NewTicketModal
          role={user.role}
          types={data.types}
          projects={projects}
          clients={clients}
          features={features}
          onClose={() => setComposing(false)}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}
