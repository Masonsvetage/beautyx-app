'use client'

// Porting a componente Next.js del concept `design/concept-quiz-profiling.html`
// (task #153, punto 8 del piano). Schermata "stile evento" per la parte a
// scelta forzata del questionario CARE: la titolare ordina le 5 reazioni dalla
// più alla meno propria (tap in sequenza, numerazione 1-5, ri-tap per
// correggere). Palette/font riusati 1:1 dal mockup (oro #c9a34a, Playfair
// Display/Inter via le variabili globali --font-playfair/--font-inter).
//
// Il componente NON mostra mai il tag elemento delle opzioni (resta interno):
// alla conferma costruisce l'ordinamento posizione→elemento e lo passa a
// `onConfirm`, che lo invia al tool server `salva_risposta_scenario` (il quale
// RICALCOLA sempre i punteggi server-side — mai fidarsi del client).
//
// Props:
//   scenario  = { scenario_code, ambito, testo, opzioni: [{lettera, testo, elemento}] }
//   progress? = { current, total, ambitoLabel, faseLabel }  (barra di avanzamento)
//   onConfirm(ordinamento, meta)  ordinamento = { "1": elemento, ... "5": elemento }
//   onExit?()                     link "Esci e continua dopo"

import { useMemo, useState } from 'react'

export default function QuizScenario({ scenario, progress, onConfirm, onExit }) {
  const opzioni = scenario?.opzioni || []
  const [order, setOrder] = useState([]) // array di `lettera` nell'ordine di tap
  const [justRanked, setJustRanked] = useState(null)

  const letterToElement = useMemo(() => {
    const map = {}
    for (const o of opzioni) map[o.lettera] = o.elemento
    return map
  }, [opzioni])

  const completo = order.length === opzioni.length && opzioni.length > 0

  function toggle(lettera) {
    setOrder((prev) => {
      const idx = prev.indexOf(lettera)
      if (idx !== -1) return prev.filter((l) => l !== lettera)
      if (prev.length >= opzioni.length) return prev
      setJustRanked(lettera)
      return [...prev, lettera]
    })
  }

  function conferma() {
    if (!completo) return
    // Costruisce l'ordinamento posizione(1..5) → elemento. Posizione 1 = più
    // vicino al proprio modo di agire (prima toccata).
    const ordinamento = {}
    order.forEach((lettera, i) => { ordinamento[String(i + 1)] = letterToElement[lettera] })
    onConfirm?.(ordinamento, { scenario_code: scenario?.scenario_code, ambito: scenario?.ambito })
  }

  const restanti = opzioni.length - order.length
  const hint = order.length === 0
    ? 'Tocca le risposte nell’ordine: dalla più tua alla meno tua.'
    : completo
      ? 'Ordine completo — controlla e conferma quando vuoi.'
      : `Ancora ${restanti} ${restanti === 1 ? 'tessera' : 'tessere'} da ordinare.`

  return (
    <div className="qz-root">
      <style>{QZ_CSS}</style>

      <div className="qz-topbar">
        <div className="qz-brand">
          <span className="qz-dot" />
          <div>Beautyx<small>Report di profiling</small></div>
        </div>
        {onExit && (
          <button type="button" className="qz-exit" onClick={onExit}>Esci e continua dopo</button>
        )}
      </div>

      {progress && (
        <div className="qz-tension">
          {progress.ambitoLabel && <span className="qz-ambito">Ambito · {progress.ambitoLabel}</span>}
          {progress.total > 0 && (
            <div className="qz-segments">
              {Array.from({ length: progress.total }).map((_, i) => (
                <div
                  key={i}
                  className={'qz-seg' + (i < progress.current - 1 ? ' done' : i === progress.current - 1 ? ' current' : '')}
                />
              ))}
            </div>
          )}
          <div className="qz-steplabel">
            <span>Scenario <b>{progress.current}</b>{progress.total ? ` di ${progress.total}` : ''}</span>
            {progress.faseLabel && <span>{progress.faseLabel}</span>}
          </div>
        </div>
      )}

      <div className="qz-stage">
        <div className="qz-spotlight" />
        <div className="qz-card">
          <div className="qz-kicker">Come reagiresti davvero</div>
          <p className="qz-question">{scenario?.testo}</p>
          <p className="qz-sub">Ordina le {opzioni.length} reazioni: dalla più vicina a come faresti tu, alla più lontana.</p>
        </div>
      </div>

      <div className="qz-tiles">
        {opzioni.map((o, i) => {
          const rankIdx = order.indexOf(o.lettera)
          const isWide = opzioni.length === 5 && i === 4
          const cls = ['qz-tile']
          if (isWide) cls.push('wide')
          if (rankIdx !== -1) cls.push('ranked')
          if (rankIdx === 0) cls.push('rank-1')
          if (justRanked === o.lettera) cls.push('just')
          return (
            <button
              type="button"
              key={o.lettera}
              className={cls.join(' ')}
              onClick={() => toggle(o.lettera)}
              onAnimationEnd={() => setJustRanked((j) => (j === o.lettera ? null : j))}
            >
              <span className="qz-rank">{rankIdx === -1 ? '—' : rankIdx + 1}</span>
              <span className="qz-tiletext">{o.testo}</span>
            </button>
          )
        })}
      </div>

      <div className="qz-hint">
        <span>{hint}</span>
        {order.length > 0 && (
          <button type="button" className="qz-reset" onClick={() => setOrder([])}>Ricomincia ordine</button>
        )}
      </div>

      <div className="qz-strip">
        {opzioni.map((_, i) => (
          <div key={i} className={'qz-chip' + (order[i] ? '' : ' empty')}>
            {order[i] ? (<><span className="qz-n">{i + 1}</span> {order[i]}</>) : `${i + 1}°`}
          </div>
        ))}
      </div>

      <div className="qz-ctawrap">
        <button type="button" className={'qz-confirm' + (completo ? ' ready' : '')} onClick={conferma} disabled={!completo}>
          Conferma e vai avanti →
        </button>
        <p className="qz-confirmnote">Nessuna risposta è giusta o sbagliata: conta solo quanto ti somiglia.</p>
      </div>
    </div>
  )
}

// CSS scoped sotto `.qz-root` — trascritto 1:1 dal concept validato (task #139),
// con classi rinominate `qz-*` per non collidere con gli stili globali.
const QZ_CSS = `
.qz-root{
  --gold:#c9a34a; --gold-light:#e8c874; --ink:#1a1a0f; --cream:#faf3df;
  --cream-2:#faf7ef; --border:#e3d9c2; --muted-2:#a97e1f; --muted-3:#a29c8a;
  --stage-1:#120f0a; --stage-2:#241d10; --stage-3:#2f2412;
  font-family:var(--font-inter,'Inter',system-ui,sans-serif); color:#4a4636;
  min-height:100vh; overflow-x:hidden;
  background:
    radial-gradient(ellipse 900px 500px at 50% -10%, rgba(201,163,74,0.20), transparent 60%),
    radial-gradient(ellipse 700px 500px at 85% 10%, rgba(201,163,74,0.08), transparent 55%),
    linear-gradient(180deg, var(--stage-1) 0%, var(--stage-2) 55%, var(--stage-1) 100%);
}
.qz-root *{ box-sizing:border-box; }
.qz-topbar{ position:sticky; top:0; z-index:50; display:flex; align-items:center; justify-content:space-between;
  padding:9px 20px; background:rgba(18,15,10,0.75); backdrop-filter:blur(6px); border-bottom:1px solid rgba(201,163,74,0.25); }
.qz-brand{ display:flex; align-items:center; gap:10px; font-family:var(--font-playfair,'Playfair Display',Georgia,serif);
  font-weight:900; font-style:italic; color:var(--gold-light); font-size:1.05rem; letter-spacing:0.02em; }
.qz-brand small{ display:block; font-family:var(--font-inter,'Inter',sans-serif); font-style:normal; font-weight:600;
  font-size:0.62rem; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted-3); margin-top:1px; }
.qz-dot{ width:7px; height:7px; border-radius:50%; background:var(--gold); box-shadow:0 0 10px 2px rgba(201,163,74,0.7); }
.qz-exit{ font-size:0.78rem; color:var(--muted-3); background:none; text-decoration:none; font-weight:500; cursor:pointer;
  border:1px solid rgba(201,163,74,0.25); padding:6px 12px; border-radius:999px; transition:all .15s; }
.qz-exit:hover{ color:var(--gold-light); border-color:var(--gold); }
.qz-tension{ max-width:640px; margin:12px auto 0; padding:0 20px; }
.qz-ambito{ display:inline-flex; align-items:center; gap:6px; font-size:0.68rem; font-weight:800; letter-spacing:0.14em;
  text-transform:uppercase; color:var(--stage-1); background:linear-gradient(135deg,var(--gold-light),var(--gold));
  padding:4px 12px; border-radius:999px; margin-bottom:8px; }
.qz-segments{ display:flex; gap:5px; margin-bottom:6px; }
.qz-seg{ height:6px; flex:1; border-radius:99px; background:rgba(255,255,255,0.08); position:relative; overflow:hidden; }
.qz-seg.done{ background:linear-gradient(90deg,var(--gold),var(--gold-light)); box-shadow:0 0 8px rgba(201,163,74,0.6); }
.qz-seg.current{ background:rgba(201,163,74,0.28); }
.qz-seg.current::after{ content:''; position:absolute; inset:0; width:40%;
  background:linear-gradient(90deg,transparent,rgba(232,200,116,0.9),transparent); animation:qz-sweep 1.6s ease-in-out infinite; }
@keyframes qz-sweep{ 0%{ transform:translateX(-120%);} 100%{ transform:translateX(340%);} }
.qz-steplabel{ display:flex; justify-content:space-between; align-items:baseline; font-size:0.72rem; color:var(--muted-3); font-weight:600; }
.qz-steplabel b{ color:var(--gold-light); font-weight:800; }
.qz-stage{ max-width:640px; margin:14px auto 0; padding:0 20px; position:relative; }
.qz-spotlight{ position:absolute; top:-40px; left:50%; transform:translateX(-50%); width:520px; height:260px; pointer-events:none;
  background:radial-gradient(ellipse at 50% 0%, rgba(232,200,116,0.22), transparent 70%); filter:blur(2px); }
.qz-card{ position:relative; background:linear-gradient(180deg,var(--stage-3),var(--stage-2)); border:1px solid rgba(201,163,74,0.35);
  border-radius:22px; padding:20px 24px 18px; text-align:center;
  box-shadow:0 0 0 1px rgba(0,0,0,0.4), 0 20px 60px -20px rgba(0,0,0,0.7), 0 0 40px -12px rgba(201,163,74,0.25); }
.qz-kicker{ font-size:0.7rem; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold); margin-bottom:8px; }
.qz-question{ font-family:var(--font-playfair,'Playfair Display',Georgia,serif); font-weight:700; font-style:italic; color:#fdf8ec;
  font-size:1.32rem; line-height:1.32; text-shadow:0 2px 24px rgba(201,163,74,0.15); margin:0 0 4px; }
.qz-sub{ font-size:0.78rem; color:var(--muted-3); margin-top:6px; font-style:italic; }
.qz-tiles{ max-width:640px; margin:14px auto 0; padding:0 20px; display:grid; grid-template-columns:1fr 1fr; gap:10px 12px; align-items:stretch; }
.qz-tile{ position:relative; display:flex; align-items:flex-start; gap:10px; background:var(--cream-2); border:2px solid var(--border);
  border-radius:14px; padding:11px 12px; text-align:left; cursor:pointer; user-select:none; font:inherit; width:100%;
  transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease; }
.qz-tile:hover{ border-color:rgba(201,163,74,0.6); transform:translateY(-2px); }
.qz-tile:active{ transform:translateY(0) scale(0.99); }
.qz-tile.wide{ grid-column:1 / -1; align-items:center; }
.qz-rank{ flex:0 0 auto; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  font-family:var(--font-playfair,'Playfair Display',Georgia,serif); font-weight:900; font-size:0.82rem; color:var(--muted-3);
  background:#fff; border:2px solid var(--border); transition:all .22s cubic-bezier(.34,1.56,.64,1); }
.qz-tiletext{ font-size:0.8rem; line-height:1.36; color:var(--ink); flex:1; }
.qz-tile.ranked{ border-color:var(--gold); background:var(--cream); box-shadow:0 6px 22px -8px rgba(201,163,74,0.45); }
.qz-tile.ranked .qz-rank{ background:linear-gradient(135deg,var(--gold-light),var(--gold)); color:var(--stage-1); border-color:var(--gold); transform:scale(1.08); }
.qz-tile.rank-1{ box-shadow:0 8px 26px -8px rgba(201,163,74,0.65), 0 0 0 1px rgba(201,163,74,0.4) inset; }
.qz-tile.just{ animation:qz-pop .38s ease; }
@keyframes qz-pop{ 0%{ transform:scale(1);} 35%{ transform:scale(1.035);} 100%{ transform:scale(1);} }
.qz-hint{ max-width:640px; margin:0 auto 0; padding:0 22px; display:flex; justify-content:space-between; align-items:center; }
.qz-hint span{ font-size:0.72rem; color:var(--muted-3); }
.qz-reset{ font-size:0.72rem; color:var(--muted-2); background:none; border:none; cursor:pointer; font-weight:700;
  text-decoration:underline; text-underline-offset:2px; padding:4px; }
.qz-strip{ max-width:640px; margin:10px auto 0; padding:0 20px; display:flex; gap:8px; align-items:center; justify-content:center; flex-wrap:wrap; }
.qz-chip{ display:flex; align-items:center; gap:6px; background:rgba(201,163,74,0.12); border:1px dashed rgba(201,163,74,0.4);
  border-radius:999px; padding:5px 10px 5px 5px; font-size:0.7rem; color:var(--gold-light); font-weight:600; min-width:36px; justify-content:center; transition:all .2s; }
.qz-chip.empty{ color:rgba(255,255,255,0.25); border-color:rgba(255,255,255,0.15); background:rgba(255,255,255,0.03); }
.qz-n{ width:16px; height:16px; border-radius:50%; background:var(--gold); color:var(--stage-1); display:flex; align-items:center;
  justify-content:center; font-size:0.64rem; font-weight:900; flex:0 0 auto; }
.qz-ctawrap{ max-width:640px; margin:12px auto 18px; padding:0 20px; text-align:center; }
.qz-confirm{ display:inline-flex; align-items:center; gap:10px; background:linear-gradient(135deg,var(--gold-light),var(--gold));
  color:var(--stage-1); font-weight:800; font-size:0.94rem; padding:11px 28px; border-radius:14px; border:none; cursor:pointer;
  opacity:0; transform:translateY(10px) scale(0.97); pointer-events:none; transition:all .3s cubic-bezier(.34,1.56,.64,1);
  box-shadow:0 10px 30px -8px rgba(201,163,74,0.6); }
.qz-confirm.ready{ opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }
.qz-confirm:hover{ filter:brightness(1.06); }
.qz-confirmnote{ margin-top:8px; font-size:0.7rem; color:var(--muted-3); }
@media (max-width:480px){
  .qz-question{ font-size:1.12rem; line-height:1.3; }
  .qz-card{ padding:16px 16px 14px; }
  .qz-tiles{ margin-top:10px; padding:0 14px; gap:8px 8px; }
  .qz-tile{ padding:9px 9px; gap:8px; }
  .qz-rank{ width:22px; height:22px; font-size:0.72rem; }
  .qz-tiletext{ font-size:0.72rem; line-height:1.3; }
  .qz-confirm{ padding:10px 24px; font-size:0.88rem; }
}
`
