import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// Everything here is sample data held in memory, like the kitchen app. The rider opens mid-way
// through the lunch shift, as on the design canvas: 11 drops done, the next run waiting at the hatch.

export const PER_DROP = 2500;
export const CASH_LIMIT = 50_000;
// How long a rider waits for a student who isn't answering before taking the bag back.
export const WAIT_MS = 5 * 60_000;
export const KITCHEN = 'Nakawa Kitchen';

export type Point = [number, number];

export type Stop = {
  bag: string;
  student: string;
  // First name, used in sentences such as "Brian isn't answering".
  first: string;
  place: string;
  floor?: string;
  note?: string;
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
        note: "Call me at the gate, the guard won't let you up.",
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

  const run = runs[runIndex] ?? null;
  const stop = run?.stops[stopIndex] ?? null;

  const notify = useCallback((message: string) => setToast(message), []);

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
    }),
    [online, onlineSince, checks, runIndex, run, stage, scanned, stopIndex, stop, arrivedAt, results, voice, drops, tips, tipTotal, pay, cash, cashOrders, handIns, toast, goOnline, goOffline, toggleCheck, startPickup, scanNext, arrive, backToRoute, completeStop, notify],
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

export function greeting() {
  const h = new Date().getHours();
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
