import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, GripVertical, Plus, Settings2, TableProperties, UserRoundPlus, Users } from "lucide-react";

const PLAYERS = ["Yuriy", "Kostia", "Ivan", "Vlad", "Robert"];
const X01_SCORES = ["301", "501", "701"];
const IN_RULES = ["Straight in", "Double in"];
const OUT_RULES = ["Double out", "Straight out"];
const MULTIPLIERS = ["Single", "Double", "Treble"];
const FINISHING_PLACES = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
const MODES = [
  { id: "match", title: "Match", subtitle: "Classic x01 match" },
  { id: "cricket", title: "Cricket", subtitle: "Cricket / Tactics" },
  { id: "clockwise", title: "Clockwise", subtitle: "Around the clock" },
  { id: "checkout", title: "121 Checkout", subtitle: "Checkout training" },
];
const TEXT = {
  newGame: "New Game", orientation: "Layout", portrait: "Portrait", landscape: "Landscape", players: "Player details",
  settings: "Game settings", start: "Start game", orderTitle: "Who throws first?",
  orderHelp: "Throw at the bull offline, then drag players to the throwing order", confirm: "Tap to confirm throw",
  game: "Game", end: "End", turn: "'s turn to throw!", avg: "3-dart avg.", last: "Last score", darts: "Darts thrown",
  noOut: "No outshot", submit: "Submit", miss: "Miss", result: "Result", guest: "Guest", add: "Add",
  scorecard: "Scorecard", set: "Set", podium: "Podium", point: "point", points: "points",
  selectedMode: "Selected mode", noTurns: "No submitted turns yet", total: "Total", try: "Try", left: "left", mainMenu: "Main menu"
};
const PLAYER_TEMPLATE = { remaining: 301, lastScore: null, dartsThrown: 0, totalScored: 0, finishedPlace: null };
const CHECKOUT_THROWS = (() => {
  const make = (prefix, factor, type) => Array.from({ length: 20 }, (_, i) => ({ label: `${prefix}${i + 1}`, value: (i + 1) * factor, type }));
  return [...make("T", 3, "treble"), ...make("D", 2, "double"), ...make("", 1, "single"), { label: "Bull", value: 50, type: "bull" }, { label: "Outer", value: 25, type: "outer" }];
})();
function Button({ children, className = "", disabled = false, ...props }) { return <button disabled={disabled} className={["inline-flex items-center justify-center transition active:scale-[0.98]",[...]
function cx(...classes) { return classes.filter(Boolean).join(" "); }
export function getNextIndex(currentIndex, playersCount, finishedIndexes = []) { if (playersCount <= 0) return 0; for (let step = 1; step <= playersCount; step++) { const next = (currentIndex + st[...]
export function getThrowValue(number, multiplier) { if (multiplier === "Double") return number * 2; if (multiplier === "Treble") return number * 3; if (multiplier === "Bull") return 50; if (multip[...]
export function getThrowLabel(number, multiplier) { if (multiplier === "Miss") return "MISS"; if (multiplier === "Bull") return "Bull"; if (multiplier === "Outer") return "Outer"; if (multiplier =[...]
export function createThrow(number, multiplier) { return { number, multiplier, value: getThrowValue(number, multiplier), label: getThrowLabel(number, multiplier) }; }
export function createMissThrow() { return { number: 0, multiplier: "Miss", value: 0, label: "MISS" }; }
export function appendThrow(currentThrows, nextThrow) { return currentThrows.length >= 3 ? currentThrows : [...currentThrows, nextThrow]; }
export function buildInitialScores(players, startScore) { const remaining = Number(startScore) || 301; return Object.fromEntries(players.map((p) => [p, { ...PLAYER_TEMPLATE, remaining }])); }
function checkoutDifficulty(combo) { const preferred = { D20: 0, D16: 1, D12: 2, D10: 3, D8: 4, D6: 5, D4: 6, D3: 7, D2: 8, D1: 9, Bull: 20 }; const typeWeight = { single: 0, double: 2, treble: 3,[...]
export function getCheckoutOptions(remaining, outRule = "Double out") { const target = Number(remaining); if (!Number.isFinite(target) || target <= 0 || target > 170) return []; if (outRule === "D[...]
export function isBust(remaining, roundTotal, outRule, lastThrow = null) { const next = remaining - roundTotal; if (next < 0) return true; if (outRule === "Double out") { if (next === 1) return tr[...]
export function isFinished(remaining, roundTotal, lastThrow, outRule) { const next = remaining - roundTotal; if (next !== 0) return false; return outRule !== "Double out" || lastThrow?.multiplier [...]
function placeNumber(place) { if (!place) return 999; const n = Number(String(place).replace(/[^0-9]/g, "")); return Number.isFinite(n) && n > 0 ? n : 999; }
export function buildGameResult(players, scores) { const podiumSize = players.length > 5 ? 3 : players.length >= 3 ? 2 : 1; return players.map((p) => { const s = scores[p] || {}; return { player: [...]
export function buildScorecardRows(turnHistory, players) { const grouped = Object.fromEntries(players.map((p) => [p, []])); for (const turn of turnHistory) if (grouped[turn.player]) grouped[turn.p[...]
function runSelfTests() { console.assert(getNextIndex(0, 3, [1]) === 2); console.assert(getThrowValue(20, "Treble") === 60); console.assert(getThrowLabel(8, "Single") === "Single"); console.assert[...]
if (typeof window !== "undefined") runSelfTests();

export default function DartsGameApp() {
  const [screen, setScreen] = useState("modes");
  const [layout, setLayout] = useState("portrait");
  const [players, setPlayers] = useState(PLAYERS);
  const [selectedMode, setSelectedMode] = useState("match");
  const [selectedPlayers, setSelectedPlayers] = useState(["Yuriy", "Kostia"]);
  const [throwOrder, setThrowOrder] = useState(["Yuriy", "Kostia"]);
  const [draggedPlayer, setDraggedPlayer] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [score, setScore] = useState("301");
  const [inRule, setInRule] = useState("Straight in");
  const [outRule, setOutRule] = useState("Double out");
  const [scores, setScores] = useState(buildInitialScores(["Yuriy", "Kostia"], "301"));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [multiplier, setMultiplier] = useState("Single");
  const [roundInput, setRoundInput] = useState([]);
  const [turnHistory, setTurnHistory] = useState([]);
  const activeMode = useMemo(() => MODES.find((m) => m.id === selectedMode) || MODES[0], [selectedMode]);
  const currentPlayer = throwOrder[currentIndex] || throwOrder[0] || "";
  const currentScore = scores[currentPlayer] || { ...PLAYER_TEMPLATE, remaining: Number(score) || 301 };
  const roundTotal = useMemo(() => roundInput.reduce((sum, d) => sum + d.value, 0), [roundInput]);
  const liveBust = isBust(currentScore.remaining, roundTotal, outRule, roundInput[roundInput.length - 1]);
  const liveRemaining = liveBust ? currentScore.remaining : Math.max(0, currentScore.remaining - roundTotal);
  const resetTurnState = () => { setRoundInput([]); setTurnHistory([]); setCurrentIndex(0); };
  const openMode = (modeId) => { setSelectedMode(modeId); resetTurnState(); setScreen("setup"); };
  const togglePlayer = (player) => setSelectedPlayers((current) => { const updated = current.includes(player) ? current.filter((x) => x !== player) : [...current, player]; setThrowOrder(updated); [...]
  const addGuest = () => { const name = guestName.trim(); if (!name || players.includes(name)) return; const updated = [...selectedPlayers, name]; setPlayers([...players, name]); setSelectedPlayer[...]
  const startGame = () => { if (selectedPlayers.length < 2) return; setThrowOrder(selectedPlayers); setScores(buildInitialScores(selectedPlayers, score)); resetTurnState(); setScreen("order"); };
  const movePlayer = (from, to) => { if (from === to || from < 0 || to < 0) return; setThrowOrder((cur) => { const next = [...cur]; const [removed] = next.splice(from, 1); next.splice(to, 0, remov[...]
  const handleDrop = (target) => { if (!draggedPlayer || draggedPlayer === target) return; movePlayer(throwOrder.indexOf(draggedPlayer), throwOrder.indexOf(target)); setDraggedPlayer(null); };
  const confirmThrowOrder = () => { setScores(buildInitialScores(throwOrder, score)); resetTurnState(); setScreen("playing"); };
  const addThrow = (num, mult = multiplier) => setRoundInput((cur) => appendThrow(cur, createThrow(num, mult)));
  const submitRound = () => {
    if (!currentPlayer || scores[currentPlayer]?.finishedPlace) return;
    const darts = roundInput.length ? roundInput : [createMissThrow()];
    const total = darts.reduce((s, d) => s + d.value, 0);
    const lastThrow = darts[darts.length - 1];
    const bust = isBust(currentScore.remaining, total, outRule, lastThrow);
    const finished = isFinished(currentScore.remaining, total, lastThrow, outRule);
    const existingFinished = Object.values(scores).filter((x) => x.finishedPlace).length;
    const finishedPlace = finished ? FINISHING_PLACES[existingFinished] || `${existingFinished + 1}th` : null;
    const remainingAfter = finished ? 0 : bust ? currentScore.remaining : currentScore.remaining - total;
    const totalForStats = bust ? 0 : total;
    const nextScores = { ...scores, [currentPlayer]: { ...currentScore, remaining: remainingAfter, lastScore: bust ? "BUST" : total, dartsThrown: currentScore.dartsThrown + Math.max(darts.length, [...]
    const turn = { id: `${Date.now()}-${currentPlayer}`, turn: turnHistory.length + 1, player: currentPlayer, darts, total: totalForStats, attemptedTotal: total, result: finished ? finishedPlace :[...]
    const finishedIndexes = throwOrder.map((p, i) => nextScores[p]?.finishedPlace ? i : null).filter((i) => i !== null);
    setTurnHistory((cur) => [...cur, turn]); setScores(nextScores); setRoundInput([]);
    if (finishedIndexes.length >= throwOrder.length) { setScreen("result"); return; }
    setCurrentIndex((i) => getNextIndex(i, throwOrder.length, finishedIndexes));
  };
  const shell = `mx-auto min-h-screen ${layout === "landscape" ? "max-w-5xl" : "max-w-md"} bg-gradient-to-b from-[#07130f] via-[#0d231a] to-[#07130f] px-5 pb-8 pt-6 shadow-2xl`;
  return <div className="min-h-screen bg-[#07130f] text-white"><div className={shell}>{screen === "modes" && <ModesScreen layout={layout} onLayout={setLayout} onMode={openMode} />}{screen === "se[...]
}
function Header({ title, onBack, right }) { return <header className="mb-6 flex items-center justify-between">{onBack ? <button onClick={onBack} className="rounded-xl p-2 text-white/90"><ArrowLef[...]
function ModesScreen({ layout, onLayout, onMode }) { return <><Header title={TEXT.newGame}/><section className="mb-6 rounded-[24px] bg-[#0b1a14]/95 p-4 shadow-xl"><SettingGroup label={TEXT.orient[...]
function SetupScreen(props) { const grid = props.layout === "landscape" ? "grid grid-cols-2 gap-5" : "space-y-4"; return <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><Header t[...]
function PlayerPanel({ players, selectedPlayers, guestName, showGuestInput, onTogglePlayer, onShowGuest, onGuestName, onAddGuest }) { return <section className="rounded-[24px] bg-[#11271d]/95 p-5[...]
function SettingsPanel({ selectedMode, activeMode, score, inRule, outRule, onScore, onInRule, onOutRule }) { return <section className="rounded-[24px] bg-[#0b1a14]/95 p-5 shadow-xl"><div classNam[...]
function OrderScreen({ throwOrder, onDragStart, onDrop, onBack, onConfirm }) { return <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><Header title={TEXT.orderTitle} onBack={onBa[...]
function PlayerOrderRow({ player, index, onDragStart, onDrop }) { return <div draggable onDragStart={()=>onDragStart(player)} onDragOver={(e)=>e.preventDefault()} onDrop={()=>onDrop(player)} clas[...]
function PlayingScreen(props) { const avg=props.currentScore.dartsThrown?((props.currentScore.totalScored/props.currentScore.dartsThrown)*3).toFixed(2):"0.00"; const outs=getCheckoutOptions(props[...]
function PlayingHeaderActions({ layout, onToggleLayout, onOpenScorecard, onEndGame }) { return <div className="flex items-center gap-2"><button onClick={onToggleLayout} className="flex h-10 w-10 [...]
function PlayerScoreList({ throwOrder, scores, score, currentPlayer, liveRemaining, outRule, avg, checkoutOptions }) { return <section className="mb-5 overflow-hidden rounded-[28px] bg-[#ff9f23] [...]
function PlayerScoreRow({ player, score, active, remaining, avg, outs }) { return <div className={cx("rounded-[22px] transition",active?"bg-[#ff5a3a] p-4":"bg-[#ff9f23] px-4 py-1.5")}><div classN[...]
function ActivePlayerDetails({ score, remaining, avg, outs }) { return <div><div className="grid grid-cols-[0.9fr_1.1fr] gap-3"><div className="text-[70px] font-black leading-none text-white">{re[...]
function RoundInputBar({ roundInput, roundTotal, onSubmit }) { return <section className="mb-5 overflow-hidden rounded-[28px] bg-white shadow-xl"><div className="grid grid-cols-[70px_1fr_150px] i[...]
function DartSlot({ dart }) { return <div className="flex flex-col items-center justify-center border-r border-black/10 last:border-r-0"><span className="text-3xl font-black">{dart?.value??""}</s[...]
function DartPad({ onAddThrow, onUndo, onMiss }) {
  const [hoveredNumber, setHoveredNumber] = useState(null);
  const sectors = Array.from({ length: 20 }, (_, i) => i + 1);
  
  return <div>
    <section className="mb-5">
      <div className="mb-5 grid grid-cols-5 gap-2">
        {sectors.map((num) => (
          <div key={num} className="relative">
            {/* Трикутник */}
            <button
              onClick={() => onAddThrow(num, "Single")}
              onMouseEnter={() => setHoveredNumber(num)}
              onMouseLeave={() => setHoveredNumber(null)}
              className="w-full aspect-square flex items-center justify-center relative group"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-full h-full"
                  style={{
                    clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                    backgroundColor: hoveredNumber === num ? "#ff7a45" : "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                />
              </div>
              <span className="relative z-10 text-2xl font-black text-white">{num}</span>
            </button>
            
            {/* D та T кнопки - показуються при наведенні */}
            {hoveredNumber === num && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute bottom-0 left-0 right-0 flex gap-1 translate-y-full"
              >
                <button
                  onClick={() => onAddThrow(num, "Double")}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 rounded"
                >
                  D
                </button>
                <button
                  onClick={() => onAddThrow(num, "Treble")}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 rounded"
                >
                  T
                </button>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </section>

    {/* Нижня панель: Undo, Miss, Bull, Outer */}
    <section className="flex gap-2">
      <button
        onClick={onUndo}
        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition"
      >
        ← Undo
      </button>
      <button
        onClick={onMiss}
        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition"
      >
        Miss
      </button>
      <button
        onClick={() => onAddThrow(50, "Bull")}
        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 rounded-xl transition"
      >
        Bull
      </button>
      <button
        onClick={() => onAddThrow(25, "Outer")}
        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-xl transition"
      >
        Outer
      </button>
    </section>
  </div>;
}
function BullButton({ label, value, onClick }) { return <button onClick={onClick} className="pb-3 text-white/85"><span className="block">{label}</span><span className="block text-sm font-bold tex[...]
function LayoutIcon({ target }) { return <span className={cx("block rounded-[6px] border-2 border-white",target==="landscape"?"h-4 w-7":"h-7 w-4")} aria-hidden="true"/>; }
function ScorecardScreen({ players, turnHistory, onBack }) { const rows=buildScorecardRows(turnHistory,players); return <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><Header ti[...]
function ScorecardRow({ row, players }) { return <React.Fragment><div className="flex items-center justify-center rounded-2xl bg-[#0b1a14] px-2 py-4 text-center text-white"><div><div className="t[...]
function ScorecardHeaderCell({ children }) { return <div className="flex items-center justify-center rounded-2xl bg-[#0b1a14] px-3 py-4 text-sm font-black uppercase text-white/70">{children}</div[...]
function PlayerHeader({ player }) { return <div className="rounded-2xl bg-[#0b1a14] px-3 py-4 text-center text-white"><div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center round[...]
function ScorecardCell({ cell }) { if(!cell)return <div className="flex h-full min-h-[104px] items-center justify-center rounded-xl border border-dashed border-white/10 text-sm font-bold text-whi[...]
function DartMini({ dart }) { return <div className="rounded-xl bg-black/5 px-1 py-2 text-center"><div className="text-base font-black leading-none">{dart?.value??"-"}</div><div className="mt-1 t[...]
function StatusBadge({ result }) { const color=result==="BUST"?"bg-[#ff5a3a] text-white":result==="OK"?"bg-emerald-200 text-black":"bg-orange-300 text-black"; return <div className={`rounded-xl p[...]
function ResultScreen({ players, scores, onBack, onMainMenu }) { const podium=buildGameResult(players,scores); const order=podium.length===1?[podium[0]]:podium.length===2?[podium[1],podium[0]]:[p[...]
function PodiumColumn({ item }) { const height={1:"h-36",2:"h-28",3:"h-20"}[item.place]; const badge={1:"bg-orange-400 text-black",2:"bg-slate-200 text-black",3:"bg-amber-700 text-white"}[item.pl[...]
function ResultRow({ player, score={}, podium }) { const item=podium.find((x)=>x.player===player); return <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3"><div[...]
function Avatar({ name, active=false, size="sm" }) { const sizeClass=size==="lg"?"mb-2 h-16 w-16 text-2xl":size==="xs"?"h-8 w-8 text-base":"h-10 w-10 text-lg"; const color=active?"border-orange-4[...]
function Stat({ label, value }) { return <div className="flex justify-between gap-2"><span>{label}</span><span className="font-black text-white">{value}</span></div>; }
function SettingGroup({ label, children }) { return <div><p className="mb-2 text-sm font-bold text-white/50">{label}</p>{children}</div>; }
function Segmented({ items, labels={}, value, onChange, className="" }) { return <div className={`rounded-[18px] bg-black/35 p-1 ${className}`} style={{display:"grid",gridTemplateColumns:`repeat([...]
