import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cancelAlert, scheduleAlert, sendAlert, setupAlerts, type Alert } from './notify';

// Everything here is sample data held in memory, like the kitchen app. The rider opens mid-way
// through the lunch shift, as on the design canvas: 11 drops done, the next run waiting at the hatch.

export const PER_DROP = 2500;
export const CASH_LIMIT = 50_000;
// How long a rider waits for a student who isn't answering before taking the bag back.
export const WAIT_MS = 5 * 60_000;
export const KITCHEN = 'Nakawa Kitchen';
// Where at each kitchen the bags wait.
export const KITCHEN_SPOT: Record<string, string> = { 'Nakawa Kitchen': 'hatch', 'Rolex Corner': 'counter' };
export const RIDER = 'Moses';
export const SMS_BACKUP = '078 ••• 552';
// A new run rings for this long before it passes to another rider.
export const OFFER_MS = 42_000;
// Sample timings: the run offer rings a moment after you're free; "Leave now" and "bags sealed"
// follow once you take it.
const OFFER_DELAY_MS = 3000;
const LEAVE_MS = 2500;
const SEALED_MS = 10_000;

export type Point = [number, number];

export type Stop = {
  bag: string;
  student: string;
  // First name, used in sentences such as "Brian isn't answering".
  first: string;
  place: string;
  floor?: string;
  note?: string;
  // Sample: the student edits the note while the rider is on the way.
  newNote?: string;
  // The student's saved friend, called when they don't answer. Not everyone sets one.
  friend?: { name: string; place: string };
  // Where the bag is picked up; Nakawa Kitchen when not set.
  kitchen?: string;
  eta: string;
  // Cash to collect before the code; 0 when the student paid in the app.
  cash: number;
  code: string;
  sealedAt: string;
  // Riding mode: the road from the last stop, where the rider is on it, the next turn and minutes left.
  leg: Point[];
  rider: Point;
  label: { at: Point; anchor: 'start' | 'end' };
  turn: { distance: string; text: string; icon: 'right' | 'left' | 'straight' };
  minutes: number;
  progress: number;
};

export type Run = {
  id: string;
  title: string;
  // How the run offer names it: "Lunch run, 2 drops."
  name: string;
  slot: number;
  pickupAt: string;
  // When it shows on the Shift timeline.
  plannedAt: string;
  away: string;
  stops: Stop[];
  pays: number;
};

export type StopResult = 'delivered' | 'returned';

const runs: Run[] = [
  {
    id: 'A',
    title: 'Library, then Block B',
    name: 'Lunch run',
    slot: 3,
    pickupAt: '12:55',
    plannedAt: '12:55',
    away: '4 min away',
    pays: 5000,
    stops: [
      {
        bag: '4823',
        student: 'Grace A.',
        first: 'Grace',
        place: 'Library entrance',
        note: 'By the main steps',
        eta: '1:02',
        cash: 0,
        code: '3390',
        sealedAt: '12:51',
        leg: [[150, 700], [150, 330], [260, 330], [260, 250]],
        rider: [150, 470],
        label: { at: [226, 230], anchor: 'end' },
        turn: { distance: '120 m', text: 'Turn right at the library road', icon: 'right' },
        minutes: 3,
        progress: 0.62,
      },
      {
        bag: '4821',
        student: 'Brian K.',
        first: 'Brian',
        place: 'Block B, room 214',
        floor: '2nd floor',
        note: "Room 214, I'll come down.",
        newNote: "Call me at the gate, the guard won't let you up.",
        friend: { name: 'Kato', place: 'Block B room 216' },
        eta: '1:07',
        cash: 14_000,
        code: '7415',
        sealedAt: '12:52',
        leg: [[260, 330], [260, 420], [318, 420]],
        rider: [260, 360],
        label: { at: [300, 460], anchor: 'start' },
        turn: { distance: '90 m', text: 'Left at the Block B lane', icon: 'left' },
        minutes: 2,
        progress: 0.4,
      },
    ],
  },
  {
    id: 'B',
    title: 'After-lectures drop',
    name: 'After-lectures run',
    slot: 5,
    pickupAt: '1:10',
    plannedAt: '1:00',
    away: 'one loop',
    pays: 10_000,
    stops: [
      {
        bag: '4830',
        student: 'Aisha N.',
        first: 'Aisha',
        place: 'Block A, room 108',
        floor: 'Ground floor',
        kitchen: 'Rolex Corner',
        friend: { name: 'Ruth', place: 'Block A room 110' },
        eta: '1:16',
        cash: 0,
        code: '2208',
        sealedAt: '1:06',
        leg: [[150, 700], [150, 330], [90, 330]],
        rider: [150, 520],
        label: { at: [60, 310], anchor: 'start' },
        turn: { distance: '200 m', text: 'Straight on to the Block A path', icon: 'straight' },
        minutes: 4,
        progress: 0.3,
      },
      {
        bag: '4832',
        student: 'Peter O.',
        first: 'Peter',
        place: 'Block B, room 305',
        floor: '3rd floor',
        note: 'Leave it with my roommate if I am in the shower',
        newNote: 'Running late from the lab. My roommate Tom has the code.',
        eta: '1:20',
        cash: 11_500,
        code: '5061',
        sealedAt: '1:07',
        leg: [[90, 330], [260, 330], [260, 420], [318, 420]],
        rider: [200, 330],
        label: { at: [300, 460], anchor: 'start' },
        turn: { distance: '60 m', text: 'Right towards Block B', icon: 'right' },
        minutes: 3,
        progress: 0.45,
      },
      {
        bag: '4835',
        student: 'Joan M.',
        first: 'Joan',
        place: 'Block C, room 12',
        friend: { name: 'Sam', place: 'Block C room 14' },
        eta: '1:24',
        cash: 0,
        code: '9134',
        sealedAt: '1:08',
        leg: [[318, 420], [260, 420], [260, 540], [330, 540]],
        rider: [260, 480],
        label: { at: [372, 580], anchor: 'end' },
        turn: { distance: '50 m', text: 'Left at the Block C corner', icon: 'left' },
        minutes: 2,
        progress: 0.5,
      },
      {
        bag: '4838',
        student: 'Daniel W.',
        first: 'Daniel',
        place: 'Main gate',
        note: 'Blue jacket, by the boda stage',
        eta: '1:29',
        cash: 0,
        code: '6627',
        sealedAt: '1:09',
        leg: [[330, 540], [60, 540]],
        rider: [250, 540],
        label: { at: [40, 520], anchor: 'start' },
        turn: { distance: '180 m', text: 'Straight on to the main gate', icon: 'straight' },
        minutes: 3,
        progress: 0.35,
      },
    ],
  },
];

export type Tip = { from: string; note?: string; amount: number };
export type HandIn = { day: string; by: string; receipt: string; amount: number };
export type CashOrder = { bag: string; student: string; at: string; amount: number };

// Where the rider is in the current run.
export type Stage = 'waiting' | 'pickup' | 'riding' | 'handover';

// Bags to collect at one kitchen, in pickup order.
export type KitchenPickup = { name: string; spot: string; bags: { bag: string; sealedAt: string }[] };

// An alert shown inside the app: the twin of a system notification, and the fallback when the
// phone can't show one (no native module yet, or alerts not allowed).
export type Banner = {
  id: number;
  kicker: string;
  title: string;
  body?: string;
  kitchens?: KitchenPickup[];
  // The loud ones get the orange edge.
  loud?: boolean;
  primary?: { label: string; url?: string };
  secondary?: { label: string; url?: string };
};
export type BannerInput = Omit<Banner, 'id'>;

export type ReminderId = 'shift-reminder' | 'pay-summary';
export type Reminder = { id: ReminderId; title: string; at: Date; on: boolean };

export type Offer = { runId: string; at: number };

type RiderState = {
  online: boolean;
  onlineSince: number;
  checks: boolean[];
  runIndex: number;
  run: Run | null;
  nextRun: Run | null;
  stage: Stage;
  scanned: string[];
  stopIndex: number;
  stop: Stop | null;
  arrivedAt: number | null;
  results: StopResult[];
  voice: boolean;
  drops: number;
  tips: Tip[];
  tipTotal: number;
  pay: number;
  cash: number;
  cashOrders: CashOrder[];
  handIns: HandIn[];
  toast: string | null;
  offer: Offer | null;
  banner: Banner | null;
  tipAlerts: boolean;
  shiftReminder: boolean;
  batterySaver: boolean;
  reminders: Reminder[];
  goOnline: () => void;
  goOffline: () => void;
  toggleCheck: (i: number) => void;
  startPickup: () => void;
  scanNext: () => string | null;
  arrive: () => void;
  backToRoute: () => void;
  completeStop: (result: StopResult) => void;
  setVoice: (v: boolean) => void;
  notify: (message: string) => void;
  acceptRun: () => void;
  passRun: (why: 'declined' | 'timeout') => void;
  raise: (banner: BannerInput, alert?: Alert) => void;
  dismissBanner: () => void;
  changeNote: (bag: string, note: string) => void;
  setTipAlerts: (v: boolean) => void;
  setShiftReminder: (v: boolean) => void;
  fixBatterySaver: () => void;
  previewReminder: (id: ReminderId) => void;
};

const Ctx = createContext<RiderState | null>(null);

const startTips: Tip[] = [
  { from: 'Aisha N.', note: 'Still hot, thank you!', amount: 2000 },
  { from: 'Peter O.', amount: 1000 },
  { from: 'Joan M.', amount: 500 },
];

export function RiderProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  // 2 h 14 online when the app opens, as on the canvas.
  const [onlineSince, setOnlineSince] = useState(() => Date.now() - (2 * 60 + 14) * 60_000);
  const [checks, setChecks] = useState([true, true, false]);
  const [runIndex, setRunIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('waiting');
  const [scanned, setScanned] = useState<string[]>([]);
  const [stopIndex, setStopIndex] = useState(0);
  const [arrivedAt, setArrivedAt] = useState<number | null>(null);
  const [results, setResults] = useState<StopResult[]>([]);
  const [voice, setVoice] = useState(true);
  const [drops, setDrops] = useState(11);
  const [tips] = useState(startTips);
  const [cashOrders, setCashOrders] = useState<CashOrder[]>([{ bag: '4809', student: 'Joan M.', at: '12:20', amount: 14_000 }]);
  const [handIns] = useState<HandIn[]>([
    { day: 'Mon', by: 'Sarah', receipt: 'C-2207', amount: 42_000 },
    { day: 'Sun', by: 'Sarah', receipt: 'C-2189', amount: 18_500 },
  ]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const [accepted, setAccepted] = useState<string[]>([]);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [sealedFor, setSealedFor] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tipAlerts, setTipAlerts] = useState(true);
  const [shiftReminder, setShiftReminder] = useState(true);
  // Sample: battery saver is on until the rider fixes it in the alerts check. We can't read it yet.
  const [batterySaver, setBatterySaver] = useState(true);

  const run = runs[runIndex] ?? null;
  const baseStop = run?.stops[stopIndex] ?? null;
  // The student's latest note wins over the one they ordered with.
  const stop = useMemo(() => (baseStop && notes[baseStop.bag] ? { ...baseStop, note: notes[baseStop.bag] } : baseStop), [baseStop, notes]);

  const notify = useCallback((message: string) => setToast(message), []);

  // Shows the alert in the app and, when the phone allows, as a system notification too.
  const raise = useCallback((b: BannerInput, alert?: Alert) => {
    setBanner({ ...b, id: Date.now() });
    if (alert) sendAlert(alert);
  }, []);
  const dismissBanner = useCallback(() => setBanner(null), []);

  useEffect(() => {
    setupAlerts();
  }, []);

  // A new run rings a moment after the rider is free for it.
  useEffect(() => {
    if (!online || !run || stage !== 'waiting' || accepted.includes(run.id) || offer) return;
    const t = setTimeout(() => {
      setOffer({ runId: run.id, at: Date.now() });
      sendAlert({ kind: 'run', channel: 'runs', title: 'New run', body: `${kitchenOf(run.stops[run.stops.length - 1])} ${spotOf(run.stops[run.stops.length - 1])} ${run.pickupAt}. ${run.stops.length} drops, UGX ${run.pays.toLocaleString('en-US')}.`, url: '/' });
    }, OFFER_DELAY_MS);
    return () => clearTimeout(t);
  }, [online, run, stage, accepted, offer]);

  const acceptRun = useCallback(() => {
    if (!offer) return;
    setAccepted((a) => [...a, offer.runId]);
    setOffer(null);
  }, [offer]);

  const passRun = useCallback(
    (why: 'declined' | 'timeout') => {
      if (!offer) return;
      setOffer(null);
      setRunIndex((i) => i + 1);
      if (why === 'declined') {
        setToast('Run passed on · stay online for the next one');
        return;
      }
      raise(
        { kicker: 'Run passed on', title: 'No answer, so another rider has it', body: "That's fine. Stay online and we'll ring you for the next run.", primary: { label: 'Got it' } },
        { kind: 'pickup', channel: 'pickup', title: 'Run passed on', body: 'No answer in 42 seconds, so another rider has it. Stay online for the next one.' },
      );
    },
    [offer, raise],
  );

  // After taking a run: "Leave now", timed to arrive as the bags are sealed, then "sealed and waiting".
  useEffect(() => {
    if (!run || stage !== 'waiting' || !accepted.includes(run.id) || sealedFor === run.id) return;
    const kitchens = pickupOrder(run);
    const first = kitchens[0];
    const leave = setTimeout(
      () =>
        raise(
          { kicker: 'Leave now', title: `Leave now for ${first.name}`, body: 'Timed so you arrive as the bags are sealed.', primary: { label: 'Got it' } },
          { kind: 'pickup', channel: 'pickup', title: `Leave now for ${first.name}`, body: 'Timed so you arrive as the bags are sealed.', url: '/' },
        ),
      LEAVE_MS,
    );
    const sealed = setTimeout(() => {
      setSealedFor(run.id);
      raise(
        { kicker: 'Pick up now', title: 'Your bags are sealed and waiting', kitchens, loud: true, primary: { label: 'Open scanner', url: '/pickup' }, secondary: { label: 'Later' } },
        {
          kind: 'pickup',
          channel: 'runs',
          title: 'Your bags are sealed and waiting',
          body: kitchens.map((k, i) => `${i + 1}. ${k.name} ${k.spot}: ${k.bags.map((b) => b.bag).join(', ')}`).join('\n'),
          url: '/pickup',
        },
      );
    }, SEALED_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(sealed);
    };
  }, [run, stage, accepted, sealedFor, raise]);

  const changeNote = useCallback((bag: string, note: string) => setNotes((n) => ({ ...n, [bag]: note })), []);
  const fixBatterySaver = useCallback(() => setBatterySaver(false), []);

  const goOnline = useCallback(() => {
    setOnline(true);
    setOnlineSince(Date.now());
  }, []);

  const toggleCheck = useCallback((i: number) => setChecks((c) => c.map((v, j) => (j === i ? !v : v))), []);

  const startPickup = useCallback(() => {
    setStage((s) => (s === 'waiting' ? 'pickup' : s));
  }, []);

  // Bags are scanned in loading order: the last stop first.
  const scanNext = useCallback(() => {
    if (!run) return null;
    const order = [...run.stops].reverse().map((s) => s.bag);
    const next = order.find((b) => !scanned.includes(b));
    if (!next) return null;
    const all = [...scanned, next];
    setScanned(all);
    if (all.length === order.length) {
      setStage('riding');
      setStopIndex(0);
    }
    return next;
  }, [run, scanned]);

  const arrive = useCallback(() => {
    setStage('handover');
    setArrivedAt(Date.now());
  }, []);

  const backToRoute = useCallback(() => setStage('riding'), []);

  const completeStop = useCallback(
    (result: StopResult) => {
      if (!run || !stop) return;
      // Returned bags are still paid. Cash only changes hands on a delivery.
      setDrops((d) => d + 1);
      if (result === 'delivered' && stop.cash > 0) {
        setCashOrders((c) => [{ bag: stop.bag, student: stop.student, at: stop.eta, amount: stop.cash }, ...c]);
      }
      const done = [...results, result];
      setArrivedAt(null);
      if (stopIndex + 1 < run.stops.length) {
        setResults(done);
        setStopIndex(stopIndex + 1);
        setStage('riding');
        setToast(result === 'delivered' ? `Delivered to ${stop.first} · +${PER_DROP.toLocaleString('en-US')}` : `Bag ${stop.bag} goes back · you're still paid`);
      } else {
        setResults([]);
        setScanned([]);
        setStopIndex(0);
        setStage('waiting');
        setRunIndex((i) => i + 1);
        setToast(`Run done · ${run.pays.toLocaleString('en-US')} added to tonight's pay`);
      }
    },
    [run, stop, results, stopIndex],
  );

  const goOffline = useCallback(() => {
    setOnline(false);
    setChecks([false, false, false]);
  }, []);

  const tipTotal = tips.reduce((sum, t) => sum + t.amount, 0);
  const cash = cashOrders.reduce((sum, c) => sum + c.amount, 0);
  const pay = drops * PER_DROP + tipTotal;

  // Scheduled reminders: 30 minutes before the next shift, and tonight's pay with the cash to hand in.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  const shift = nextShift(new Date(clock));
  const shiftAt = shift.remindAt.getTime();
  const payAt = nextPayTime(new Date(clock)).getTime();
  const reminders = useMemo<Reminder[]>(
    () => [
      { id: 'shift-reminder', title: `Shift reminder · ${shift.name.toLowerCase()} ${shift.from}`, at: new Date(shiftAt), on: shiftReminder },
      { id: 'pay-summary', title: 'Tonight’s pay and cash to hand in', at: new Date(payAt), on: true },
    ],
    [shift.name, shift.from, shiftAt, payAt, shiftReminder],
  );

  const reminderContent = useCallback(
    (id: ReminderId, at: Date): { banner: BannerInput; alert: Alert } => {
      if (id === 'shift-reminder') {
        const s = nextShift(new Date(at.getTime() - 1));
        const hi = `${greeting(s.start)}, ${RIDER}`;
        const body = `Shift ${s.from} to ${s.to} · ${KITCHEN}. ${s.plan}.`;
        return {
          banner: { kicker: 'Shift in 30 min', title: hi, body, primary: { label: 'Got it' }, secondary: { label: 'See my shift', url: '/shift' } },
          alert: { kind: 'reminder', channel: 'reminders', title: `Shift in 30 min · ${hi}`, body, url: '/shift' },
        };
      }
      const cashLine = cash > 0 ? `You're holding UGX ${cash.toLocaleString('en-US')}. Hand it in at ${KITCHEN} before your next run.` : 'No cash to hand in.';
      const body = `${drops} drops × ${PER_DROP.toLocaleString('en-US')} plus ${tipTotal.toLocaleString('en-US')} in tips. ${cashLine}`;
      return {
        banner: { kicker: 'Tonight’s pay', title: `UGX ${pay.toLocaleString('en-US')} on its way to MoMo`, body, primary: { label: 'Got it' }, secondary: cash > 0 ? { label: 'Hand in cash', url: '/cash' } : undefined },
        alert: { kind: 'reminder', channel: 'reminders', title: `Tonight’s pay is on its way: UGX ${pay.toLocaleString('en-US')} to MoMo`, body, url: cash > 0 ? '/cash' : '/money' },
      };
    },
    [cash, drops, pay, tipTotal],
  );

  // Hand the reminders to the phone. Where it can't take them, keep them for an in-app timer.
  const inApp = useRef<Partial<Record<ReminderId, number>>>({});
  useEffect(() => {
    let alive = true;
    (async () => {
      const results = await Promise.all(
        reminders.map(async (r) => {
          if (!r.on) {
            await cancelAlert(r.id);
            return [r.id, null] as const;
          }
          const c = reminderContent(r.id, r.at);
          const ok = await scheduleAlert(r.id, r.at, c.alert);
          return [r.id, ok ? null : r.at.getTime()] as const;
        }),
      );
      if (!alive) return;
      const next: Partial<Record<ReminderId, number>> = {};
      for (const [id, at] of results) if (at !== null) next[id] = at;
      inApp.current = next;
    })();
    return () => {
      alive = false;
    };
  }, [reminders, reminderContent]);

  // The in-app timer: checked on the 15-second clock while the app is open.
  useEffect(() => {
    for (const id of Object.keys(inApp.current) as ReminderId[]) {
      const at = inApp.current[id];
      if (at !== undefined && at <= clock && clock - at < 60_000) {
        delete inApp.current[id];
        raise(reminderContent(id, new Date(at)).banner);
      }
    }
  }, [clock, raise, reminderContent]);

  const previewReminder = useCallback(
    (id: ReminderId) => {
      const r = reminders.find((x) => x.id === id);
      if (!r) return;
      const c = reminderContent(id, r.at);
      raise(c.banner, c.alert);
    },
    [reminders, reminderContent, raise],
  );

  const value = useMemo<RiderState>(
    () => ({
      online,
      onlineSince,
      checks,
      runIndex,
      run,
      nextRun: runs[runIndex + 1] ?? null,
      stage,
      scanned,
      stopIndex,
      stop,
      arrivedAt,
      results,
      voice,
      drops,
      tips,
      tipTotal,
      pay,
      cash,
      cashOrders,
      handIns,
      toast,
      offer,
      banner,
      tipAlerts,
      shiftReminder,
      batterySaver,
      reminders,
      goOnline,
      goOffline,
      toggleCheck,
      startPickup,
      scanNext,
      arrive,
      backToRoute,
      completeStop,
      setVoice,
      notify,
      acceptRun,
      passRun,
      raise,
      dismissBanner,
      changeNote,
      setTipAlerts,
      setShiftReminder,
      fixBatterySaver,
      previewReminder,
    }),
    [
      online, onlineSince, checks, runIndex, run, stage, scanned, stopIndex, stop, arrivedAt, results, voice, drops, tips, tipTotal, pay, cash, cashOrders, handIns, toast,
      offer, banner, tipAlerts, shiftReminder, batterySaver, reminders,
      goOnline, goOffline, toggleCheck, startPickup, scanNext, arrive, backToRoute, completeStop, notify,
      acceptRun, passRun, raise, dismissBanner, changeNote, fixBatterySaver, previewReminder,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRider() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRider must be used inside RiderProvider');
  return v;
}

// Re-renders every `ms` so clocks and countdowns stay current.
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function today() {
  return DAYS[new Date().getDay()];
}

export function greeting(at = new Date()) {
  const h = at.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// "2 h 14", or "25 min" in the first hour.
export function onlineFor(since: number, now: number) {
  const mins = Math.max(0, Math.floor((now - since) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h} h ${String(mins % 60).padStart(2, '0')}` : `${mins} min`;
}

export function ordinal(n: number) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

export function kitchenOf(stop: Stop) {
  return stop.kitchen ?? KITCHEN;
}

export function spotOf(stop: Stop) {
  return KITCHEN_SPOT[kitchenOf(stop)] ?? 'hatch';
}

// Kitchens in pickup order, following the loading order (the last stop's bag goes in first).
export function pickupOrder(run: Run): KitchenPickup[] {
  const out: KitchenPickup[] = [];
  for (const stop of [...run.stops].reverse()) {
    const name = kitchenOf(stop);
    let k = out.find((x) => x.name === name);
    if (!k) {
      k = { name, spot: spotOf(stop), bags: [] };
      out.push(k);
    }
    k.bags.push({ bag: stop.bag, sealedAt: stop.sealedAt });
  }
  return out;
}

// "18:30" -> "6:30", the way the app writes times.
export function clockTime(d: Date) {
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Sample rota: lunch and the evening meal plans, every day.
const SHIFTS = [
  { name: 'Lunch shift', start: [11, 30], end: [14, 30], plan: 'Lunch runs and the after-lectures drop' },
  { name: 'Evening shift', start: [18, 30], end: [21, 30], plan: 'Supper plan drop, 9 bags' },
] as const;

// The next shift whose 30-minute reminder is still ahead.
export function nextShift(now: Date) {
  for (let day = 0; day < 2; day++) {
    for (const s of SHIFTS) {
      const start = new Date(now);
      start.setDate(start.getDate() + day);
      start.setHours(s.start[0], s.start[1], 0, 0);
      const remindAt = new Date(start.getTime() - 30 * 60_000);
      if (remindAt.getTime() > now.getTime()) {
        const end = new Date(start);
        end.setHours(s.end[0], s.end[1], 0, 0);
        return { name: s.name, plan: s.plan, start, remindAt, from: clockTime(start), to: clockTime(end) };
      }
    }
  }
  throw new Error('No shift found');
}

// Tonight's pay goes out at 9:30 pm, with the cash still to hand in.
export function nextPayTime(now: Date) {
  const at = new Date(now);
  at.setHours(21, 30, 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return at;
}
