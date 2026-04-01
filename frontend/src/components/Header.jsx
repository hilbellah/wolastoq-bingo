import { useState, useEffect, useRef } from 'react';

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const STYLES = `
  @keyframes gold-sweep {
    0%   { background-position: -500px 0; }
    100% { background-position:  500px 0; }
  }
  @keyframes ball-drop {
    0%   { transform: translateY(-36px) scale(0.5); opacity:0; }
    65%  { transform: translateY(4px) scale(1.1); opacity:1; }
    100% { transform: translateY(0) scale(1); opacity:1; }
  }
  @keyframes cell-pop {
    0%   { transform: scale(1); }
    45%  { transform: scale(1.28); }
    80%  { transform: scale(0.96); }
    100% { transform: scale(1); }
  }
  @keyframes bingo-boom {
    0%   { transform: scale(0.3) rotate(-10deg); opacity:0; }
    55%  { transform: scale(1.22) rotate(3deg); opacity:1; }
    80%  { transform: scale(0.97) rotate(-1deg); }
    100% { transform: scale(1.04) rotate(1deg); opacity:1; }
  }
  @keyframes bingo-glow {
    0%,100% { text-shadow: 0 0 14px #FDD01Fcc, 0 0 36px #FDD01F55; }
    50%      { text-shadow: 0 0 32px #fff59a,   0 0 70px #FDD01Fcc;  }
  }
  @keyframes win-ring {
    0%,100% { box-shadow: 0 0 0 0 rgba(253,208,31,0); }
    50%      { box-shadow: 0 0 0 3px rgba(253,208,31,.8); }
  }

  /* ── 8 pre-defined fall paths — NO css vars in transforms ── */
  @keyframes cf1 { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1}  100%{transform:translateY(260px) translateX(-28px) rotate(400deg);opacity:0} }
  @keyframes cf2 { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1}  100%{transform:translateY(240px) translateX(32px)  rotate(-360deg);opacity:0} }
  @keyframes cf3 { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1}  100%{transform:translateY(290px) translateX(-48px) rotate(540deg);opacity:0} }
  @keyframes cf4 { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1}  100%{transform:translateY(220px) translateX(44px)  rotate(-480deg);opacity:0} }
  @keyframes cf5 { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1}  100%{transform:translateY(270px) translateX(12px)  rotate(300deg);opacity:0} }
  @keyframes cf6 { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1}  100%{transform:translateY(250px) translateX(-14px) rotate(-420deg);opacity:0} }
  @keyframes cf7 { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1}  100%{transform:translateY(200px) translateX(55px)  rotate(280deg);opacity:0} }
  @keyframes cf8 { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1}  100%{transform:translateY(310px) translateX(-60px) rotate(-520deg);opacity:0} }

  @keyframes ticker-go {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes live-blink {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:.3; transform:scale(.65); }
  }
  @keyframes float-bob {
    0%,100% { transform:translateY(0); }
    50%      { transform:translateY(-4px); }
  }
  @keyframes fade-in-up {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0); }
  }

  .gold-text {
    background: linear-gradient(90deg, #C45E08 0%, #ED710D 20%, #FDD01F 45%, #F59B17 65%, #ED710D 80%, #C45E08 100%);
    background-size: 500px 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gold-sweep 2.8s linear infinite;
  }
  .ball-drop-in { animation: ball-drop 0.42s cubic-bezier(.34,1.56,.64,1) both; }
  .cell-pop-in  { animation: cell-pop  0.36s cubic-bezier(.34,1.56,.64,1) both; }
  .bingo-appear {
    animation: bingo-boom 0.48s cubic-bezier(.34,1.56,.64,1) both,
               bingo-glow 0.85s ease-in-out 0.48s infinite;
  }
  .win-cell     { animation: win-ring .8s ease-in-out infinite; }
  .ticker-wrap  { overflow:hidden; white-space:nowrap; }
  .ticker-move  { display:inline-block; animation: ticker-go 28s linear infinite; }
  .live-dot     { animation: live-blink 1.4s ease-in-out infinite; }
  .logo-float   { animation: float-bob 3s ease-in-out infinite; }
  .fade-in-up   { animation: fade-in-up .45s ease-out both; }
`;

const CF_NAMES = ['cf1','cf2','cf3','cf4','cf5','cf6','cf7','cf8'];
const COLORS   = ['#e53e3e','#4299e1','#48bb78','#ED710D','#9f7aea','#FDD01F','#fff','#f472b6','#F59B17','#34d399'];
const CARD     = [
  [ 7, 17, 33, 47, 63],
  [ 3, 22, 39, 52, 71],
  [14, 28, null, 58, 66],
  [11, 20, 41, 49, 70],
  [ 6, 25, 38, 55, 62],
];
const COLS     = ['B','I','N','G','O'];
const COL_CLR  = ['#e53e3e','#4299e1','#48bb78','#ed8936','#9f7aea'];
const PATTERNS = [
  [[0,0],[0,1],[0,2],[0,3],[0,4]],  // top row
  [[0,0],[1,1],[2,2],[3,3],[4,4]],  // diagonal
  [[4,0],[4,1],[4,2],[4,3],[4,4]],  // bottom row
  [[2,0],[2,1],[2,2],[2,3],[2,4]],  // middle row
];

/* ── Bingo ball SVG ── */
function Ball({ col, label, size = 42 }) {
  const color  = COL_CLR[col] ?? '#FDD01F';
  const id     = `hb_${label}`;
  const letter = COLS[col] ?? '';
  const num    = label.replace(/[A-Za-z]/g, '');
  return (
    <svg viewBox="0 0 56 56" width={size} height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter:`drop-shadow(0 3px 10px ${color}99)` }}>
      <defs>
        <radialGradient id={id} cx="38%" cy="28%" r="62%">
          <stop offset="0%"   stopColor="#fff" stopOpacity=".6"/>
          <stop offset="100%" stopColor={color} stopOpacity="1"/>
        </radialGradient>
      </defs>
      <circle cx="28" cy="28" r="27" fill={`url(#${id})`}/>
      <ellipse cx="28" cy="28" rx="27" ry="10.5" fill="white" opacity=".9"/>
      <text x="28" y="32" textAnchor="middle" fontSize="11" fontWeight="900"
        fill={color} fontFamily="'Arial Black',Arial,sans-serif">
        {label === 'FREE' ? '★' : `${letter}${num}`}
      </text>
      <ellipse cx="19" cy="14" rx="9" ry="5.5" fill="white" opacity=".26"
        transform="rotate(-25,19,14)"/>
    </svg>
  );
}

/* ── Confetti — uses pre-defined keyframe names, NOT css vars ── */
function Confetti({ active }) {
  const [pieces, setPieces] = useState([]);
  const timerRef = useRef(null);
  const idRef    = useRef(0);

  const spawnWave = () => {
    const now = Date.now();
    const next = Array.from({ length: 20 }, (_, i) => {
      const seed = (now + i * 137) % 1000;
      return {
        id:    idRef.current++,
        color: COLORS[(seed + i) % COLORS.length],
        name:  CF_NAMES[(seed + i * 3) % CF_NAMES.length],
        x:     3 + (seed % 94),
        dur:   `${1.0 + (seed % 6) / 10}s`,
        // NO delay — delay causes pieces to freeze at start (looks stuck)
        w:     i % 3 === 2 ? 5 + (seed % 5) : 4 + (seed % 4),
        h:     i % 3 === 2 ? 5 + (seed % 5) : 11 + (seed % 9),
        round: i % 3 === 2 ? '50%' : '1px',
      };
    });
    setPieces(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPieces([]), 1800);
  };

  useEffect(() => {
    if (!active) { setPieces([]); return; }
    spawnWave();
    const id = setInterval(spawnWave, 700);
    return () => { clearInterval(id); clearTimeout(timerRef.current); };
  }, [active]);

  if (pieces.length === 0) return null;

  return (
    // Extend 300px below the card so falling pieces aren't clipped mid-fall
    <div style={{ position:'absolute', top:0, left:0, right:0, height:'calc(100% + 300px)', overflow:'visible', pointerEvents:'none', zIndex:30 }}>
      {pieces.map(p => (
        <div key={p.id}
          style={{
            position:'absolute',
            left:`${p.x}%`,
            top:'5%',
            width:  p.w,
            height: p.h,
            background: p.color,
            borderRadius: p.round,
            animationName: p.name,
            animationDuration: p.dur,
            animationTimingFunction: 'ease-in',
            animationFillMode: 'forwards', // 'both' freezes pieces at start during delay
          }}/>
      ))}
    </div>
  );
}

/* ── Live bingo card ── */
function LiveBingoCard() {
  const [called,  setCalled]  = useState(() => new Set());
  const [wins,    setWins]    = useState(() => new Set());
  const [ball,    setBall]    = useState(null);
  const [ballKey, setBallKey] = useState(0);
  const [bingo,   setBingo]   = useState(false);
  const [confOn,  setConfOn]  = useState(false);

  const stepRef   = useRef(0);
  const patRef    = useRef(0);
  const phaseRef  = useRef('calling');
  const tidRef    = useRef(null);

  useEffect(() => {
    const go = () => {
      const pat = PATTERNS[patRef.current % PATTERNS.length];
      if (phaseRef.current === 'calling') {
        const s = stepRef.current;
        if (s < pat.length) {
          const [r, c] = pat[s];
          const num   = CARD[r][c];
          const label = num == null ? 'FREE' : `${COLS[c]}${num}`;
          setBall({ label, col: c });
          setBallKey(k => k + 1);
          setCalled(prev => new Set([...prev, `${r},${c}`]));
          stepRef.current++;
          if (stepRef.current === pat.length) {
            setWins(new Set(pat.map(([r,c]) => `${r},${c}`)));
            setBingo(true);
            setConfOn(true);
            phaseRef.current = 'bingo';
            tidRef.current = setTimeout(go, 2800);
          } else {
            tidRef.current = setTimeout(go, 1050);
          }
        }
      } else {
        setCalled(new Set()); setWins(new Set());
        setBall(null); setBingo(false); setConfOn(false);
        stepRef.current = 0; patRef.current++;
        phaseRef.current = 'calling';
        tidRef.current = setTimeout(go, 700);
      }
    };
    tidRef.current = setTimeout(go, 900);
    return () => clearTimeout(tidRef.current);
  }, []);

  return (
    <div style={{ position:'relative', width:204, flexShrink:0 }}>
      <Confetti active={confOn} />

      {/* Ball display — fixed height so card doesn't shift */}
      <div style={{ height:52, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4 }}>
        {ball ? (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', color:'rgba(255,255,255,.35)', textTransform:'uppercase' }}>Calling</span>
            <div key={ballKey} className="ball-drop-in"><Ball col={ball.col} label={ball.label} size={40}/></div>
          </div>
        ) : (
          <div style={{ width:36, height:36, borderRadius:'50%', border:'2px dashed rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color:'rgba(255,255,255,.2)', fontSize:18 }}>?</span>
          </div>
        )}
      </div>

      {/* BINGO flash */}
      {bingo && (
        <div style={{ position:'absolute', top:52, left:0, right:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, pointerEvents:'none' }}>
          <div className="bingo-appear" style={{ fontWeight:900, fontSize:38, letterSpacing:'0.12em', color:'#FDD01F', WebkitTextStroke:'1px rgba(253,208,31,.3)' }}>
            BINGO!
          </div>
        </div>
      )}

      {/* Card */}
      <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,.1)', boxShadow:'0 6px 24px rgba(0,0,0,.55)' }}>
        {/* B I N G O headers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)' }}>
          {COLS.map((col, c) => (
            <div key={col} style={{ background:COL_CLR[c], color:'#fff', textAlign:'center', fontWeight:900, fontSize:13, padding:'5px 0' }}>{col}</div>
          ))}
        </div>
        {/* Cells */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:1, background:'rgba(255,255,255,.06)' }}>
          {CARD.map((row, r) => row.map((num, c) => {
            const k      = `${r},${c}`;
            const hit    = called.has(k);
            const win    = wins.has(k);
            const isFree = num == null;
            const bg     = win ? `${COL_CLR[c]}ee` : hit ? `${COL_CLR[c]}55` : isFree ? 'rgba(253,208,31,.2)' : 'rgba(0,14,45,.72)';
            return (
              <div key={k}
                className={`${hit && !win ? 'cell-pop-in' : ''} ${win ? 'win-cell' : ''}`}
                style={{
                  height:28, display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:700,
                  background: bg,
                  color: (hit||isFree) ? '#fff' : 'rgba(255,255,255,.32)',
                  textShadow: win ? `0 0 10px #fff,0 0 18px ${COL_CLR[c]}` : hit ? `0 0 6px ${COL_CLR[c]}` : 'none',
                  transition:'background .22s',
                }}>
                {isFree ? <span style={{ fontSize:9, fontWeight:900, color:'#FDD01F' }}>FREE</span> : num}
              </div>
            );
          }))}
        </div>
      </div>
    </div>
  );
}

/* ── Stat chip ── */
function Stat({ icon, value, label, color, delay = 0 }) {
  return (
    <div className="fade-in-up" style={{
      animationDelay:`${delay}s`,
      background:'rgba(255,255,255,.06)',
      border:`1px solid ${color}44`,
      boxShadow:`0 0 12px ${color}16`,
      borderRadius:12, padding:'7px 12px', textAlign:'center', flexShrink:0,
    }}>
      <div style={{ fontSize:15, lineHeight:1, marginBottom:2 }}>{icon}</div>
      <div style={{ fontSize:15, fontWeight:900, color, lineHeight:1.1 }}>{value}</div>
      <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>{label}</div>
    </div>
  );
}

/* ── Header ── */
export default function Header() {
  // Use ID guard instead of ref — survives React Strict Mode double-fire
  useEffect(() => {
    if (document.getElementById('bingo-hdr-css')) return;
    const el = document.createElement('style');
    el.id = 'bingo-hdr-css';
    el.textContent = STYLES;
    document.head.appendChild(el);
    // No cleanup: styles must stay for child components (Confetti) to animate
  }, []);

  const txt = '🎱 BONANZA JACKPOT $50,000  ·  💰 NIGHTLY JACKPOTS $5,000  ·  🎉 BINGO 6 NIGHTS A WEEK  ·  🏆 ATLANTIC CANADA\'S LARGEST BINGO HALL  ·  🕓 DOORS 3:00 PM · ADMISSIONS 4:30 PM  ·  📍 185 GABRIEL DRIVE, FREDERICTON NB  ·  🔒 BOOK NOW  ·  ';

  return (
    <header style={{
      background:'linear-gradient(160deg,#0d0f12 0%,#1a1e23 50%,#0d0f12 100%)',
      position:'relative', overflow:'hidden',
    }}>
      {/* Glow overlays */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:'radial-gradient(ellipse 55% 90% at 72% 50%,rgba(237,113,13,.08) 0%,transparent 65%),radial-gradient(ellipse 38% 65% at 20% 50%,rgba(253,208,31,.06) 0%,transparent 55%)' }}/>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', backgroundImage:'linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px)', backgroundSize:'40px 40px' }}/>

      {/* ── TOP BAR — yellow brand strip matching stmec.com ── */}
      <div style={{ background:'#FDD01F', position:'relative', zIndex:10 }}>
        <div style={{ maxWidth:1400, margin:'0 auto', padding:'6px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span className="live-dot" style={{ width:7, height:7, borderRadius:'50%', background:'#16a34a', display:'inline-block', boxShadow:'0 0 5px #16a34a88', flexShrink:0 }}/>
            <span style={{ fontSize:10.5, fontWeight:800, color:'#1E2226', textTransform:'uppercase', letterSpacing:'0.1em' }}>Wolastoq Casino · Live Booking</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ fontSize:10.5, fontWeight:700, color:'#32373C' }}>🎱 Bingo 6 Nights a Week</span>
            <span style={{ fontSize:10.5, fontWeight:600, color:'#32373C' }}>📍 Fredericton, NB</span>
          </div>
        </div>
      </div>

      {/* ── HERO — 3 columns: St. Mary's | Book Your Bingo | Bingo card ── */}
      <div style={{ position:'relative', zIndex:10, maxWidth:1400, margin:'0 auto', padding:'14px 24px 16px', display:'flex', alignItems:'center', gap:0 }}>

        {/* ── LEFT: St. Mary's identity ── */}
        <div style={{ flex:'1 1 0', minWidth:0, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', paddingRight:24, borderRight:'1px solid rgba(253,208,31,.18)' }}>
          <div className="logo-float" style={{ width:68, height:68, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'radial-gradient(circle at 35% 30%,rgba(253,208,31,.5),rgba(10,12,16,.95))', border:'2.5px solid rgba(253,208,31,.65)', boxShadow:'0 0 28px rgba(237,113,13,.45),0 0 60px rgba(253,208,31,.12)', marginBottom:10 }}>
            <svg viewBox="0 0 40 40" width="38" height="38" xmlns="http://www.w3.org/2000/svg">
              <polygon points="20,2 24,14 38,14 27,22 31,34 20,26 9,34 13,22 2,14 16,14" fill="#FDD01F"/>
              <circle cx="20" cy="20" r="7" fill="#0d0f12"/>
              <text x="20" y="24" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#FDD01F" fontFamily="'Arial Black',Arial,sans-serif">WC</text>
            </svg>
          </div>
          <h1 style={{ fontSize:19, fontWeight:900, color:'#fff', lineHeight:1.2, margin:'0 0 3px', textShadow:'0 2px 12px rgba(0,0,0,.9)' }}>
            St. Mary's<br/>
            <span style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.65)', letterSpacing:'0.04em' }}>Entertainment Centre</span>
          </h1>
          <p className="gold-text" style={{ fontSize:8.5, fontWeight:700, letterSpacing:'0.2em', margin:'6px 0 8px' }}>✦ YOUR WINNING DESTINATION ✦</p>
          <div style={{ display:'flex', alignItems:'center', gap:5, borderRadius:999, padding:'5px 12px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(253,208,31,.28)', marginBottom:8 }}>
            <span className="live-dot" style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', display:'inline-block', boxShadow:'0 0 5px #4ade80' }}/>
            <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.65)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Wolastoq Casino</span>
          </div>
          <p style={{ fontSize:9.5, color:'rgba(255,255,255,.3)', margin:0 }}>📍 185 Gabriel Drive, Fredericton NB</p>
        </div>

        {/* ── MIDDLE: Book Your Bingo Seat ── */}
        <div style={{ flex:'1 1 0', minWidth:0, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'0 24px' }}>
          <h2 style={{ fontSize:23, fontWeight:900, lineHeight:1.25, margin:'0 0 6px' }}>
            <span className="gold-text">Book Your Bingo Seat</span><br/>
            <span style={{ color:'#fff', fontSize:15, fontWeight:700 }}>Online — Pick Your Exact Table</span>
          </h2>
          <p style={{ color:'rgba(255,255,255,.42)', fontSize:11.5, lineHeight:1.55, margin:'0 0 12px', maxWidth:320 }}>
            Reserve your seat & choose your package before you arrive.{' '}
            <span style={{ color:'#FDD01F' }}>Largest bingo hall in Atlantic Canada.</span>
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:7, marginBottom:10 }}>
            <Stat icon="💰" value="$5,000"  label="Nightly Jackpot" color="#ED710D" delay={0}  />
            <Stat icon="🏆" value="$50,000" label="Bonanza Jackpot" color="#FDD01F" delay={.1} />
            <Stat icon="🕓" value="4:30 PM" label="Doors Open"      color="#4299e1" delay={.2} />
            <Stat icon="🎱" value="6:00 PM" label="Games Start"     color="#48bb78" delay={.3} />
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:5 }}>
            {[['🔒','30-min hold'],['📍','Pick your table'],['💳','Pay online'],['🎉','Instant confirm']].map(([ic,tx]) => (
              <span key={tx} style={{ display:'inline-flex', alignItems:'center', gap:4, borderRadius:999, padding:'4px 10px', fontSize:10, fontWeight:600, background:'rgba(253,208,31,.1)', border:'1px solid rgba(253,208,31,.25)', color:'rgba(255,255,255,.6)' }}>
                {ic} {tx}
              </span>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Live bingo card ── */}
        <div className="md-bingo-show" style={{ flexShrink:0, display:'none', paddingLeft:24, borderLeft:'1px solid rgba(253,208,31,.18)' }}>
          <LiveBingoCard/>
        </div>
      </div>

      {/* ── TICKER ── */}
      <div className="ticker-wrap" style={{ position:'relative', zIndex:10, padding:'5px 0', background:'rgba(0,0,0,.5)', borderTop:'1px solid rgba(253,208,31,.2)', borderBottom:'1px solid rgba(253,208,31,.2)' }}>
        <div className="ticker-move" style={{ color:'rgba(253,208,31,.85)', fontSize:11, fontWeight:700, letterSpacing:'0.14em', paddingRight:60 }}>
          {txt}{txt}
        </div>
      </div>

      {/* md breakpoint for bingo card */}
      <style>{`@media(min-width:768px){.md-bingo-show{display:block!important}}`}</style>
    </header>
  );
}
