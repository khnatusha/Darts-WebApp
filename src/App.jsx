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
function Button({ children, className = "", disabled = false, ...props }) { return <button disabled={disabled} className={["inline-flex items-center justify-center transition active:scale-[0.98]", disabled ? "cursor-not-allowed opacity-60" : "", className].join(" ")} {...props}>{children}</button>; }
function cx(...classes) { return classes.filter(Boolean).join(" "); }
export function getNextIndex(currentIndex, playersCount, finishedIndexes = []) { if (playersCount <= 0) return 0; for (let step = 1; step <= playersCount; step++) { const next = (currentIndex + step) % playersCount; if (!finishedIndexes.includes(next)) return next; } return currentIndex; }
export function getThrowValue(number, multiplier) { if (multiplier === "Double") return number * 2; if (multiplier === "Treble") return number * 3; if (multiplier === "Bull") return 50; if (multiplier === "Outer") return 25; return number; }
export function getThrowLabel(number, multiplier) { if (multiplier === "Miss") return "MISS"; if (multiplier === "Bull") return "Bull"; if (multiplier === "Outer") return "Outer"; if (multiplier === "Double") return `D${number}`; if (multiplier === "Treble") return `T${number}`; return "Single"; }
export function createThrow(number, multiplier) { return { number, multiplier, value: getThrowValue(number, multiplier), label: getThrowLabel(number, multiplier) }; }
export function createMissThrow() { return { number: 0, multiplier: "Miss", value: 0, label: "MISS" }; }
export function appendThrow(currentThrows, nextThrow) { return currentThrows.length >= 3 ? currentThrows : [...currentThrows, nextThrow]; }
export function buildInitialScores(players, startScore) { const remaining = Number(startScore) || 301; return Object.fromEntries(players.map((p) => [p, { ...PLAYER_TEMPLATE, remaining }])); }
function checkoutDifficulty(combo) { const preferred = { D20: 0, D16: 1, D12: 2, D10: 3, D8: 4, D6: 5, D4: 6, D3: 7, D2: 8, D1: 9, Bull: 20 }; const typeWeight = { single: 0, double: 2, treble: 3, outer: 8, bull: 15 }; const last = combo[combo.length - 1]; const bullPenalty = combo.some((x) => x.type === "bull" || x.type === "outer") && combo.length > 1 ? 12 : 0; return combo.length * 100 + (preferred[last.label] ?? 12) * 4 + bullPenalty + combo.reduce((s, x) => s + typeWeight[x.type], 0); }
export function getCheckoutOptions(remaining, outRule = "Double out") { const target = Number(remaining); if (!Number.isFinite(target) || target <= 0 || target > 170) return []; if (outRule === "Double out" && target === 1) return []; const canFinish = (last) => outRule !== "Double out" || last.type === "double" || last.type === "bull"; const options = []; for (const a of CHECKOUT_THROWS) { if (a.value === target && canFinish(a)) options.push([a]); for (const b of CHECKOUT_THROWS) { if (a.value + b.value === target && canFinish(b)) options.push([a, b]); for (const c of CHECKOUT_THROWS) if (a.value + b.value + c.value === target && canFinish(c)) options.push([a, b, c]); } } const unique = new Map(); for (const combo of options) { const key = combo.map((x) => x.label).join(" "); if (!unique.has(key)) unique.set(key, combo); } return [...unique.values()].sort((a, b) => checkoutDifficulty(a) - checkoutDifficulty(b)).slice(0, 6).map((combo) => combo.map((x) => x.label).join("  ·  ")); }
export function isBust(remaining, roundTotal, outRule, lastThrow = null) { const next = remaining - roundTotal; if (next < 0) return true; if (outRule === "Double out") { if (next === 1) return true; if (next === 0 && !(lastThrow?.multiplier === "Double" || lastThrow?.multiplier === "Bull")) return true; } return false; }
export function isFinished(remaining, roundTotal, lastThrow, outRule) { const next = remaining - roundTotal; if (next !== 0) return false; return outRule !== "Double out" || lastThrow?.multiplier === "Double" || lastThrow?.multiplier === "Bull"; }
function placeNumber(place) { if (!place) return 999; const n = Number(String(place).replace(/[^0-9]/g, "")); return Number.isFinite(n) && n > 0 ? n : 999; }
export function buildGameResult(players, scores) { const podiumSize = players.length > 5 ? 3 : players.length >= 3 ? 2 : 1; return players.map((p) => { const s = scores[p] || {}; return { player: p, remaining: Number.isFinite(Number(s.remaining)) ? Number(s.remaining) : 999, finishedPlace: s.finishedPlace || null, placeNumber: placeNumber(s.finishedPlace) }; }).sort((a, b) => a.placeNumber - b.placeNumber || a.remaining - b.remaining).slice(0, podiumSize).map((item, idx) => { const place = idx + 1; const points = players.length === 2 ? (place === 1 ? 1 : 0) : place === 1 ? 2 : place === 2 ? 1 : 0; return { ...item, place, points }; }); }
export function buildScorecardRows(turnHistory, players) { const grouped = Object.fromEntries(players.map((p) => [p, []])); for (const turn of turnHistory) if (grouped[turn.player]) grouped[turn.player].push(turn); const rows = Math.max(0, ...Object.values(grouped).map((x) => x.length)); return Array.from({ length: rows }, (_, i) => ({ round: i + 1, cells: players.map((p) => grouped[p]?.[i] || null) })); }
function runSelfTests() { console.assert(getNextIndex(0, 3, [1]) === 2); console.assert(getThrowValue(20, "Treble") === 60); console.assert(getThrowLabel(8, "Single") === "Single"); console.assert(appendThrow(appendThrow(appendThrow([], createMissThrow()), createMissThrow()), createMissThrow()).length === 3); console.assert(buildInitialScores(["A"], "301").A.remaining === 301); console.assert(getCheckoutOptions(40, "Double out")[0] === "D20"); console.assert(isBust(13, 13, "Double out", { multiplier: "Single" })); console.assert(isFinished(40, 40, { multiplier: "Double" }, "Double out")); console.assert(buildGameResult(["A", "B"], { A: { remaining: 0, finishedPlace: "1st" }, B: { remaining: 20 } })[0].points === 1); console.assert(buildScorecardRows([{ player: "A" }, { player: "B" }, { player: "A" }], ["A", "B"]).length === 2); }
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
  const togglePlayer = (player) => setSelectedPlayers((current) => { const updated = current.includes(player) ? current.filter((x) => x !== player) : [...current, player]; setThrowOrder(updated); return updated; });
  const addGuest = () => { const name = guestName.trim(); if (!name || players.includes(name)) return; const updated = [...selectedPlayers, name]; setPlayers([...players, name]); setSelectedPlayers(updated); setThrowOrder(updated); setGuestName(""); setShowGuestInput(false); };
  const startGame = () => { if (selectedPlayers.length < 2) return; setThrowOrder(selectedPlayers); setScores(buildInitialScores(selectedPlayers, score)); resetTurnState(); setScreen("order"); };
  const movePlayer = (from, to) => { if (from === to || from < 0 || to < 0) return; setThrowOrder((cur) => { const next = [...cur]; const [removed] = next.splice(from, 1); next.splice(to, 0, removed); return next; }); };
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
    const nextScores = { ...scores, [currentPlayer]: { ...currentScore, remaining: remainingAfter, lastScore: bust ? "BUST" : total, dartsThrown: currentScore.dartsThrown + Math.max(darts.length, 1), totalScored: currentScore.totalScored + totalForStats, finishedPlace: finishedPlace || currentScore.finishedPlace } };
    const turn = { id: `${Date.now()}-${currentPlayer}`, turn: turnHistory.length + 1, player: currentPlayer, darts, total: totalForStats, attemptedTotal: total, result: finished ? finishedPlace : bust ? "BUST" : "OK", before: currentScore.remaining, after: remainingAfter };
    const finishedIndexes = throwOrder.map((p, i) => nextScores[p]?.finishedPlace ? i : null).filter((i) => i !== null);
    setTurnHistory((cur) => [...cur, turn]); setScores(nextScores); setRoundInput([]);
    if (finishedIndexes.length >= throwOrder.length) { setScreen("result"); return; }
    setCurrentIndex((i) => getNextIndex(i, throwOrder.length, finishedIndexes));
  };
  const shell = `mx-auto min-h-screen ${layout === "landscape" ? "max-w-5xl" : "max-w-md"} bg-gradient-to-b from-[#07130f] via-[#0d231a] to-[#07130f] px-5 pb-8 pt-6 shadow-2xl`;
  return <div className="min-h-screen bg-[#07130f] text-white"><div className={shell}>{screen === "modes" && <ModesScreen layout={layout} onLayout={setLayout} onMode={openMode} />}{screen === "setup" && <SetupScreen layout={layout} activeMode={activeMode} players={players} selectedPlayers={selectedPlayers} selectedMode={selectedMode} score={score} inRule={inRule} outRule={outRule} guestName={guestName} showGuestInput={showGuestInput} onBack={() => setScreen("modes")} onShowGuest={() => setShowGuestInput(true)} onGuestName={setGuestName} onAddGuest={addGuest} onTogglePlayer={togglePlayer} onScore={setScore} onInRule={setInRule} onOutRule={setOutRule} onStart={startGame} />}{screen === "order" && <OrderScreen throwOrder={throwOrder} onDragStart={setDraggedPlayer} onDrop={handleDrop} onBack={() => setScreen("setup")} onConfirm={confirmThrowOrder} />}{screen === "playing" && <PlayingScreen layout={layout} activeMode={activeMode} selectedMode={selectedMode} score={score} outRule={outRule} throwOrder={throwOrder} currentPlayer={currentPlayer} currentScore={currentScore} liveRemaining={liveRemaining} scores={scores} multiplier={multiplier} roundInput={roundInput} roundTotal={roundTotal} onBack={() => setScreen("order")} onAddThrow={addThrow} onSubmit={submitRound} onUndo={() => setRoundInput((cur) => cur.slice(0, -1))} onMiss={() => setRoundInput((cur) => appendThrow(cur, createMissThrow()))} onMultiplier={setMultiplier} onToggleLayout={() => setLayout((cur) => cur === "portrait" ? "landscape" : "portrait")} onOpenScorecard={() => setScreen("scorecard")} onEndGame={() => setScreen("result")} />}{screen === "scorecard" && <ScorecardScreen players={throwOrder} turnHistory={turnHistory} onBack={() => setScreen("playing")} />}{screen === "result" && <ResultScreen players={throwOrder} scores={scores} onBack={() => setScreen("playing")} onMainMenu={() => setScreen("modes")} />}</div></div>;
}
function Header({ title, onBack, right }) { return <header className="mb-6 flex items-center justify-between">{onBack ? <button onClick={onBack} className="rounded-xl p-2 text-white/90"><ArrowLeft size={31}/></button> : <div className="w-11"/>}<h1 className="text-center font-black uppercase tracking-tight" style={{fontSize:34,lineHeight:1}}>{title}</h1>{right || <div className="w-11"/>}</header>; }
function ModesScreen({ layout, onLayout, onMode }) { return <><Header title={TEXT.newGame}/><section className="mb-6 rounded-[24px] bg-[#0b1a14]/95 p-4 shadow-xl"><SettingGroup label={TEXT.orientation}><Segmented items={["portrait","landscape"]} labels={{portrait:TEXT.portrait,landscape:TEXT.landscape}} value={layout} onChange={onLayout}/></SettingGroup></section><motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="space-y-4">{MODES.map((m,i)=><motion.button key={m.id} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:i*.04}} onClick={()=>onMode(m.id)} className={cx("group flex w-full items-center justify-between rounded-[24px] px-7 py-6 text-left shadow-xl transition active:scale-[0.98]",m.id==="match"?"bg-blue-600 ring-4 ring-blue-400/60":"bg-[#0b1a14]/95 hover:bg-[#11261d]")}><div><div className="font-black uppercase tracking-tight" style={{fontSize:36,lineHeight:.9}}>{m.title}</div><div className="mt-2 text-sm font-medium text-white/60">{m.subtitle}</div></div><ArrowRight className="transition group-hover:translate-x-1" size={37} strokeWidth={2.4}/></motion.button>)}</motion.div></>; }
function SetupScreen(props) { const grid = props.layout === "landscape" ? "grid grid-cols-2 gap-5" : "space-y-4"; return <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><Header title={props.activeMode.title} onBack={props.onBack} right={<button onClick={props.onShowGuest} className="rounded-xl p-2 text-white/90"><UserRoundPlus size={27}/></button>}/><div className={grid}><PlayerPanel {...props}/><SettingsPanel {...props}/></div><Button onClick={props.onStart} disabled={props.selectedPlayers.length<2} className="mt-6 h-16 w-full rounded-[24px] bg-[#ff5439] text-xl font-black text-white hover:bg-[#ff6a52] disabled:bg-white/15 disabled:text-white/35">{TEXT.start}</Button></motion.div>; }
function PlayerPanel({ players, selectedPlayers, guestName, showGuestInput, onTogglePlayer, onShowGuest, onGuestName, onAddGuest }) { return <section className="rounded-[24px] bg-[#11271d]/95 p-5 shadow-xl"><div className="mb-5 flex items-center gap-3"><Users size={27}/><h2 className="font-black uppercase" style={{fontSize:32,lineHeight:1}}>{TEXT.players}</h2></div><div className="grid grid-cols-3 gap-4">{players.map((p)=>{const active=selectedPlayers.includes(p);return <button key={p} onClick={()=>onTogglePlayer(p)} className="text-center"><Avatar name={p} active={active} size="lg"/><div className={cx("text-sm font-black",active?"text-white":"text-white/40")}>{p}</div></button>})}<button onClick={onShowGuest} className="text-center"><div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-white/5 text-white/70"><Plus size={34}/></div><div className="text-sm font-black text-white/55">{TEXT.guest}</div></button></div>{showGuestInput&&<div className="mt-5 flex gap-2"><input value={guestName} onChange={(e)=>onGuestName(e.target.value)} placeholder="Guest name" className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3 font-bold text-black outline-none"/><Button onClick={onAddGuest} className="rounded-2xl bg-orange-400 px-5 font-black text-black hover:bg-orange-300">{TEXT.add}</Button></div>}</section>; }
function SettingsPanel({ selectedMode, activeMode, score, inRule, outRule, onScore, onInRule, onOutRule }) { return <section className="rounded-[24px] bg-[#0b1a14]/95 p-5 shadow-xl"><div className="mb-5 flex items-center gap-3"><Settings2 size={27}/><h2 className="font-black uppercase" style={{fontSize:32,lineHeight:1}}>{TEXT.settings}</h2></div>{selectedMode === "match" ? <><Segmented items={X01_SCORES} value={score} onChange={onScore}/><Segmented items={IN_RULES} value={inRule} onChange={onInRule} className="mt-5"/><Segmented items={OUT_RULES} value={outRule} onChange={onOutRule} className="mt-5"/></> : <div className="rounded-[18px] bg-[#203829] p-4"><p className="text-sm font-bold text-white/55">{TEXT.selectedMode}</p><p className="mt-1 text-2xl font-black">{activeMode.title}</p></div>}</section>; }
function OrderScreen({ throwOrder, onDragStart, onDrop, onBack, onConfirm }) { return <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><Header title={TEXT.orderTitle} onBack={onBack}/><section className="mb-5 rounded-[28px] bg-[#11271d]/95 p-5 shadow-xl"><p className="mb-4 text-center text-sm font-bold uppercase text-white/55">{TEXT.orderHelp}</p><div className="space-y-3">{throwOrder.map((p,i)=><PlayerOrderRow key={p} player={p} index={i} onDragStart={onDragStart} onDrop={onDrop}/>)}</div></section><section className="mb-5 rounded-[28px] bg-[#0b1a14]/95 p-5 text-center shadow-xl"><div className="mx-auto mb-3 flex h-28 w-28 items-center justify-center rounded-full border-[12px] border-orange-400 bg-[#d9f3ef] text-5xl font-black text-black">{throwOrder[0]?.charAt(0)}</div><h2 className="font-black uppercase" style={{fontSize:30,lineHeight:1}}>{throwOrder[0]} starts</h2></section><Button onClick={onConfirm} className="h-16 w-full rounded-[24px] bg-blue-600 text-xl font-black uppercase text-white hover:bg-blue-500">{TEXT.confirm}</Button></motion.div>; }
function PlayerOrderRow({ player, index, onDragStart, onDrop }) { return <div draggable onDragStart={()=>onDragStart(player)} onDragOver={(e)=>e.preventDefault()} onDrop={()=>onDrop(player)} className="flex cursor-grab items-center gap-4 rounded-[22px] bg-white p-4 text-black shadow-lg active:cursor-grabbing"><div className={cx("flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black text-white",index===0?"bg-orange-400":index===1?"bg-slate-400":index===2?"bg-amber-700":"bg-[#203829]")}>{index+1}</div><div className="flex-1"><p className="text-xl font-black uppercase">{player}</p><p className="text-sm font-semibold text-black/50">{index===0?"Throws first":`Throws #${index+1}`}</p></div><GripVertical className="text-black/40" size={26}/></div>; }
function PlayingScreen(props) { const avg=props.currentScore.dartsThrown?((props.currentScore.totalScored/props.currentScore.dartsThrown)*3).toFixed(2):"0.00"; const outs=getCheckoutOptions(props.liveRemaining,props.outRule); const land=props.layout==="landscape"; return <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><Header title={props.selectedMode==="match"?`${props.score} ${TEXT.game}`:props.activeMode.title} onBack={props.onBack} right={<PlayingHeaderActions {...props}/>}/><div className={land?"grid grid-cols-[1fr_1fr] gap-5":""}><div><PlayerScoreList {...props} avg={avg} checkoutOptions={outs}/><h2 className="mb-5 truncate whitespace-nowrap text-center text-[26px] font-black uppercase leading-none text-[#ff5a3a]">{props.currentPlayer}{TEXT.turn}</h2><RoundInputBar {...props}/></div><DartPad {...props}/></div></motion.div>; }
function PlayingHeaderActions({ layout, onToggleLayout, onOpenScorecard, onEndGame }) { return <div className="flex items-center gap-2"><button onClick={onToggleLayout} className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/10 text-white/90 ring-1 ring-white/15 hover:bg-white/15" title={layout==="portrait"?TEXT.landscape:TEXT.portrait}><LayoutIcon target={layout==="portrait"?"landscape":"portrait"}/></button><button onClick={onOpenScorecard} className="rounded-xl p-2 text-white/90"><TableProperties size={25}/></button><button onClick={onEndGame} className="rounded-xl px-2 py-1 text-sm font-black text-white/80">{TEXT.end}</button></div>; }
function PlayerScoreList({ throwOrder, scores, score, currentPlayer, liveRemaining, outRule, avg, checkoutOptions }) { return <section className="mb-5 overflow-hidden rounded-[28px] bg-[#ff9f23] p-3 shadow-xl"><div className="space-y-1">{throwOrder.map((p)=>{const s=scores[p]||{...PLAYER_TEMPLATE,remaining:Number(score)||301}; const active=p===currentPlayer; const remaining=active?liveRemaining:s.remaining; const outs=active?checkoutOptions:getCheckoutOptions(s.remaining,outRule); return <PlayerScoreRow key={p} player={p} score={s} active={active} remaining={remaining} avg={avg} outs={outs}/>})}</div></section>; }
function PlayerScoreRow({ player, score, active, remaining, avg, outs }) { return <div className={cx("rounded-[22px] transition",active?"bg-[#ff5a3a] p-4":"bg-[#ff9f23] px-4 py-1.5")}><div className={cx(active?"mb-3":"mb-0","flex items-center justify-between gap-3")}><div className="flex items-center gap-3"><Avatar name={player} active size={active?"sm":"xs"}/><span className={cx(active?"text-xl":"text-lg","font-black uppercase")}>{player}</span></div>{!active&&<div className="text-xl font-black text-white">{score.finishedPlace||score.remaining}</div>}</div>{active&&<ActivePlayerDetails score={score} remaining={remaining} avg={avg} outs={outs}/>}</div>; }
function ActivePlayerDetails({ score, remaining, avg, outs }) { return <div><div className="grid grid-cols-[0.9fr_1.1fr] gap-3"><div className="text-[70px] font-black leading-none text-white">{remaining}</div><div className="space-y-0 pt-1 text-sm font-bold leading-tight text-black"><Stat label={TEXT.avg} value={avg}/><Stat label={TEXT.last} value={score.lastScore??"-"}/><Stat label={TEXT.darts} value={score.dartsThrown}/></div></div><div className="mt-3 grid grid-cols-2 gap-2">{outs.length?outs.map((o)=><div key={o} className="whitespace-nowrap rounded-lg bg-[#10231b] px-3 py-2 text-center text-[12px] font-black tracking-tight text-white sm:text-sm">{o}</div>):<div className="col-span-2 rounded-lg bg-[#10231b] px-3 py-2 text-center text-sm font-black text-white">{TEXT.noOut}</div>}</div></div>; }
function RoundInputBar({ roundInput, roundTotal, onSubmit }) { return <section className="mb-5 overflow-hidden rounded-[28px] bg-white shadow-xl"><div className="grid grid-cols-[70px_1fr_150px] items-center"><div className="flex h-20 flex-col items-center justify-center border-r border-black/10 text-black"><span className="text-2xl font-black">#</span><span className="text-sm font-black">{roundTotal}</span></div><div className="grid h-20 grid-cols-3 text-center text-black">{[0,1,2].map((i)=><DartSlot key={i} dart={roundInput[i]}/>)}</div><button onClick={onSubmit} className="m-3 rounded-[22px] bg-emerald-400 px-4 py-5 text-2xl font-black text-black hover:bg-emerald-300">{TEXT.submit}</button></div></section>; }
function DartSlot({ dart }) { return <div className="flex flex-col items-center justify-center border-r border-black/10 last:border-r-0"><span className="text-3xl font-black">{dart?.value??""}</span><span className="text-sm font-bold">{dart?.label??""}</span></div>; }
function DartPad({ onAddThrow, onUndo, onMiss }) {
  return (
    <div>
      <section className="mb-5">
        <div className="grid grid-cols-5 gap-3 text-center">
          {Array.from({ length: 20 }, (_, index) => {
            const number = index + 1;

            return (
              <div
                key={number}
                className="overflow-hidden rounded-[18px] bg-[#10231b] text-white shadow-lg"
              >
                <button
                  onClick={() => onAddThrow(number, "Single")}
                  className="w-full px-2 py-4 text-[42px] font-black leading-none hover:bg-white/10"
                  title={`Single ${number}`}
                >
                  {number}
                </button>

                <div className="grid grid-cols-2 border-t border-white/10">
                  <button
                    onClick={() => onAddThrow(number, "Double")}
                    className="px-2 py-2 text-sm font-black text-white/75 hover:bg-[#ff5a3a] hover:text-white"
                    title={`Double ${number} = ${number * 2}`}
                  >
                    D
                    <span className="ml-1 hidden text-xs opacity-80 sm:inline">
                      {number * 2}
                    </span>
                  </button>

                  <button
                    onClick={() => onAddThrow(number, "Treble")}
                    className="border-l border-white/10 px-2 py-2 text-sm font-black text-white/75 hover:bg-[#ff5a3a] hover:text-white"
                    title={`Treble ${number} = ${number * 3}`}
                  >
                    T
                    <span className="ml-1 hidden text-xs opacity-80 sm:inline">
                      {number * 3}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-4 items-center gap-2 border-t border-white/10 pt-5 text-center">
        <button
          onClick={onUndo}
          className="rounded-2xl bg-white/5 py-4 text-4xl text-white/70"
        >
          ↩
        </button>

        <button
          onClick={onMiss}
          className="rounded-2xl bg-white/5 py-4 text-2xl font-black uppercase text-white"
        >
          {TEXT.miss}
        </button>

        <button
          onClick={() => onAddThrow(25, "Outer")}
          className="rounded-2xl bg-[#10231b] py-4 text-lg font-black text-white"
        >
          Outer
          <span className="block text-sm text-white/55">25</span>
        </button>

        <button
          onClick={() => onAddThrow(25, "Bull")}
          className="rounded-2xl bg-[#10231b] py-4 text-lg font-black text-white"
        >
          Bull
          <span className="block text-sm text-white/55">50</span>
        </button>
      </section>
    </div>
  );
}
function LayoutIcon({ target }) { return <span className={cx("block rounded-[6px] border-2 border-white",target==="landscape"?"h-4 w-7":"h-7 w-4")} aria-hidden="true"/>; }
function ScorecardScreen({ players, turnHistory, onBack }) { const rows=buildScorecardRows(turnHistory,players); return <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><Header title={TEXT.scorecard} onBack={onBack}/><section className="rounded-[24px] bg-[#11271d]/95 p-4 shadow-xl">{!turnHistory.length?<div className="rounded-2xl bg-white/10 p-5 text-center font-bold text-white/60">{TEXT.noTurns}</div>:<div className="overflow-x-auto"><div className="min-w-[760px]"><div className="grid gap-2" style={{gridTemplateColumns:`72px repeat(${players.length}, minmax(150px, 1fr))`}}><ScorecardHeaderCell>{TEXT.set}</ScorecardHeaderCell>{players.map((p)=><PlayerHeader key={p} player={p}/>)}{rows.map((r)=><ScorecardRow key={r.round} row={r} players={players}/>)}</div></div></div>}</section></motion.div>; }
function ScorecardRow({ row, players }) { return <React.Fragment><div className="flex items-center justify-center rounded-2xl bg-[#0b1a14] px-2 py-4 text-center text-white"><div><div className="text-xs font-bold uppercase text-white/55">{TEXT.set}</div><div className="text-2xl font-black leading-none">{row.round}</div></div></div>{row.cells.map((cell,i)=><ScorecardCell key={`${row.round}-${players[i]}`} cell={cell}/>)}</React.Fragment>; }
function ScorecardHeaderCell({ children }) { return <div className="flex items-center justify-center rounded-2xl bg-[#0b1a14] px-3 py-4 text-sm font-black uppercase text-white/70">{children}</div>; }
function PlayerHeader({ player }) { return <div className="rounded-2xl bg-[#0b1a14] px-3 py-4 text-center text-white"><div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#d9f3ef] text-base font-black text-black">{player.charAt(0)}</div><div className="text-sm font-black uppercase">{player}</div></div>; }
function ScorecardCell({ cell }) { if(!cell)return <div className="flex h-full min-h-[104px] items-center justify-center rounded-xl border border-dashed border-white/10 text-sm font-bold text-white/30">-</div>; return <div className="rounded-2xl bg-white p-3 text-black shadow-sm"><div className="mb-2 flex items-center justify-between gap-2"><div className="text-2xl font-black leading-none">{cell.total}</div><StatusBadge result={cell.result}/></div><div className="mb-2 grid grid-cols-3 gap-1.5">{[0,1,2].map((i)=><DartMini key={i} dart={cell.darts[i]}/>)}</div><div className="flex items-center justify-between text-[11px] font-bold text-black/55"><span>{cell.before} → {cell.after}</span><span>{cell.result==="BUST"?`${TEXT.try}: ${cell.attemptedTotal}`:`${TEXT.total}: ${cell.total}`}</span></div></div>; }
function DartMini({ dart }) { return <div className="rounded-xl bg-black/5 px-1 py-2 text-center"><div className="text-base font-black leading-none">{dart?.value??"-"}</div><div className="mt-1 text-[10px] font-bold uppercase text-black/50">{dart?.label??""}</div></div>; }
function StatusBadge({ result }) { const color=result==="BUST"?"bg-[#ff5a3a] text-white":result==="OK"?"bg-emerald-200 text-black":"bg-orange-300 text-black"; return <div className={`rounded-xl px-2 py-1 text-[11px] font-black ${color}`}>{result}</div>; }
function ResultScreen({ players, scores, onBack, onMainMenu }) { const podium=buildGameResult(players,scores); const order=podium.length===1?[podium[0]]:podium.length===2?[podium[1],podium[0]]:[podium[1],podium[0],podium[2]]; return <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><Header title={TEXT.result} onBack={onBack}/><section className="rounded-[28px] bg-[#11271d]/95 p-5 shadow-xl"><h2 className="mb-6 text-center font-black uppercase" style={{fontSize:34,lineHeight:1}}>{TEXT.podium}</h2><div className="mb-7 flex items-end justify-center gap-3">{order.map((item)=><PodiumColumn key={item.player} item={item}/>)}</div><div className="space-y-2">{players.map((p)=><ResultRow key={p} player={p} score={scores[p]} podium={podium}/>)}</div><Button onClick={onMainMenu} className="mt-6 h-14 w-full rounded-2xl bg-orange-400 text-lg font-black text-black hover:bg-orange-300">{TEXT.mainMenu}</Button></section></motion.div>; }
function PodiumColumn({ item }) { const height={1:"h-36",2:"h-28",3:"h-20"}[item.place]; const badge={1:"bg-orange-400 text-black",2:"bg-slate-200 text-black",3:"bg-amber-700 text-white"}[item.place]; const suffix=item.place===1?"st":item.place===2?"nd":"rd"; return <div className="flex min-w-0 flex-1 flex-col items-center"><div className={cx("mb-3 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#d9f3ef] text-2xl font-black text-black shadow-lg",item.place===1&&"scale-110")}>{item.player.charAt(0)}</div><div className="mb-2 max-w-full truncate text-center text-base font-black uppercase text-white">{item.player}</div><div className={cx("mb-2 rounded-full px-3 py-1 text-sm font-black",badge)}>{item.place}{suffix}</div><div className={cx("flex w-full flex-col items-center justify-center rounded-t-[22px] bg-[#ff9f23] px-2 text-center text-black",height)}><div className="text-4xl font-black">{item.points}</div><div className="text-xs font-black uppercase">{item.points===1?TEXT.point:TEXT.points}</div></div></div>; }
function ResultRow({ player, score={}, podium }) { const item=podium.find((x)=>x.player===player); return <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3"><div className="flex items-center gap-3"><Avatar name={player} active size="xs"/><span className="font-black uppercase">{player}</span></div><div className="text-right text-sm font-bold text-white/70"><div>{item?`${item.points} pts`:"0 pts"}</div><div>{score.finishedPlace||`${score.remaining??"-"} ${TEXT.left}`}</div></div></div>; }
function Avatar({ name, active=false, size="sm" }) { const sizeClass=size==="lg"?"mb-2 h-16 w-16 text-2xl":size==="xs"?"h-8 w-8 text-base":"h-10 w-10 text-lg"; const color=active?"border-orange-400 bg-[#d9f3ef] text-black":"border-white/20 bg-white/10 text-white/35"; return <div className={cx("mx-auto flex items-center justify-center rounded-full border-2 font-black",sizeClass,color)}>{name.charAt(0).toUpperCase()}</div>; }
function Stat({ label, value }) { return <div className="flex justify-between gap-2"><span>{label}</span><span className="font-black text-white">{value}</span></div>; }
function SettingGroup({ label, children }) { return <div><p className="mb-2 text-sm font-bold text-white/50">{label}</p>{children}</div>; }
function Segmented({ items, labels={}, value, onChange, className="" }) { return <div className={`rounded-[18px] bg-black/35 p-1 ${className}`} style={{display:"grid",gridTemplateColumns:`repeat(${items.length}, minmax(0, 1fr))`}}>{items.map((item)=><button key={item} onClick={()=>onChange(item)} className={cx("rounded-[16px] px-2 py-4 text-sm font-black transition",value===item?"bg-[#233d2e] text-white":"text-white/70")}>{labels[item]||item}</button>)}</div>; }
