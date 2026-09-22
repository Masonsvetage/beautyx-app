'use client'

// Pagina pubblica del tool "Listino intelligente" (4° pilastro dell'ecosistema
// beautyx, accanto a newsletter, Identikit strategico CURA e miniguida — vedi
// memory/generale.md, voce "Tool 'Listino intelligente' — 4° pilastro
// dell'ecosistema, architettura di lancio definitiva", 2026-09-19/20).
//
// Sorgente originale: C:\Users\luigi\progetti\beautyx-project\calcolatore-margine.html
// (HTML single-file self-contained, MVP v2.2/2.3, portato qui QUASI verbatim —
// CSS/HTML/JS del tool sono la stessa identica logica di calcolo, nessuna
// riscrittura del motore. Le uniche modifiche rispetto al sorgente:
//  1) il logo base64 embedded è sostituito con l'asset reale già in uso nel
//     resto del sito (/logo_beautyx-oro.png), per non portare un blob enorme
//     nel bundle e restare coerenti con /report, /newsletter ecc.;
//  2) i font Google (Fraunces, Figtree, Playfair Display) sono self-hosted via
//     next/font/google invece del <link> a fonts.googleapis.com del sorgente —
//     stessa regola già in vigore nel resto del progetto (vedi memory/davide.md,
//     sezione "Font — self-hosting via next/font/google", zero richieste esterne
//     a Google, GDPR);
//  3) è stato aggiunto il gating 90gg + versione lite/completa (vedi sotto),
//     l'obbligo di account (vedi sotto) e una CTA verso /newsletter dopo il
//     primo uso — tutto il resto (calcoli, tab, guida, salvataggio) è invariato.
//
// ACCOUNT OBBLIGATORIO (corretto il 20/09/2026, task #206 — sostituisce la
// versione "usabile senza account/senza wall" della prima stesura del
// 19-20/09/2026): un visitatore anonimo NON puo' piu' usare il tool. Usa lo
// STESSO canale di registrazione completo dell'Identikit strategico CURA
// (stesso /signup, account completo con dati centro) — non un accesso libero.
// Motivo di Mason: servono da subito i dati corretti e completi per il
// passaggio futuro all'abbonamento piattaforma, esattamente come per
// l'Identikit. Un anonimo che arriva qui vede un wall con CTA a
// /signup?risorsa=tool (vedi ListinoWall sotto), stesso principio già in uso
// su /report per indirizzare alla registrazione unificata.
//
// GATING lite/completo — decisione chiusa da Mason (19-20/09/2026), invariata:
// - Dentro i 90 giorni dal lancio (stessa finestra dell'Identikit CURA, stessa
//   fonte lib/report/freeWindow.js — NON una nuova data), per QUALUNQUE utente
//   con account: tutto sbloccato, nessuna differenza gratis/completo visibile.
// - Fuori dai 90gg: costo orario (tab "Il negozio") e banco prezzo di un
//   singolo servizio (tab "Prezzo giusto") restano SEMPRE gratis. Le funzioni
//   "complete" — listino intero multi-servizio, vetrina stampabile, salvataggio/
//   backup — richiedono la versione completa (29€ una tantum).
//
// NIENTE "credito abbonamento" in pubblico (corretto 20/09/2026): il copy non
// menziona più nessuno sconto/credito futuro sull'abbonamento piattaforma —
// resta un meccanismo predisposto solo internamente (vedi
// supabase/migrations/20260920_user_resource_access.sql e
// app/api/user/resource-access/route.js), MAI comunicato qui. Copy pubblico:
// "90 giorni gratis, poi 29€ una tantum", punto.
//
// ATTENZIONE (verificato sul codice reale, non solo sulla memoria): non esiste
// alcun endpoint di checkout Stripe per il report né per il tool — nessuna
// verifica di un "account con credito" che oggi non può esistere nel DB. Il
// CTA verso /newsletter dopo il primo uso resta l'unico percorso reale offerto
// oggi per chi vuole "il resto" dell'ecosistema.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Fraunces, Figtree } from 'next/font/google'
import { isWithinReportFreeWindow } from '@/lib/report/freeWindow'
import { useAuth } from '@/contexts/AuthContext'

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
})
const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

// ===================================================================
// CSS del tool — verbatim dal sorgente calcolatore-margine.html (righe
// 4-100), con le sole sostituzioni dei nomi font per next/font/google
// (var(--font-fraunces)/var(--font-figtree) al posto di "Fraunces"/"Figtree",
// var(--font-playfair) — già caricato globalmente in app/layout.js — al posto
// di "Playfair Display").
// ===================================================================
const TOOL_CSS = `
  #bx-listino-root,#bx-listino-root[data-theme="bosco"]{--bg:#F5F1E7;--card:#FFFDF8;--rowalt:#F1EDE0;--ink:#23302A;--muted:#6D7A70;--line:#E4DCC9;--chip:#EDE6D4;--field:#FFFFFF;--shadow:0 1px 2px rgba(20,50,35,.06);--plum:#1F6A4E;--copper:#9A7A22;--gold:#C6A03E;--green:#2E7D5B;--greenbg:#E4F1E9;--amber:#9A6A16;--amberbg:#F6ECD5;--red:#B0473E;--redbg:#F6E2DF;}
  #bx-listino-root[data-theme="cipria"]{--bg:#F7EFEA;--card:#FFFCFA;--rowalt:#F4E7E1;--ink:#3A2A2F;--muted:#8A7076;--line:#EBDBD5;--chip:#F1E2DC;--field:#FFFFFF;--shadow:0 1px 2px rgba(90,40,55,.06);--plum:#A8455F;--copper:#A9724E;--gold:#C99A5A;--green:#2E7D5B;--greenbg:#E7F0E9;--amber:#9A6A16;--amberbg:#F6ECD5;--red:#B0473E;--redbg:#F6E2DF;}
  #bx-listino-root[data-theme="lavanda"]{--bg:#F2F0F8;--card:#FFFFFF;--rowalt:#ECE8F5;--ink:#2E2A3A;--muted:#726E84;--line:#E1DCEE;--chip:#E9E4F4;--field:#FFFFFF;--shadow:0 1px 2px rgba(50,40,90,.06);--plum:#6A4E9C;--copper:#8A78AE;--gold:#B79A54;--green:#2E7D5B;--greenbg:#E7F0EA;--amber:#8A6A2A;--amberbg:#F1EAD9;--red:#B0473E;--redbg:#F6E2DF;}
  #bx-listino-root[data-theme="acqua"]{--bg:#ECF3F3;--card:#FFFFFF;--rowalt:#E3EFEF;--ink:#20302F;--muted:#5F7376;--line:#D5E4E3;--chip:#DFEDEC;--field:#FFFFFF;--shadow:0 1px 2px rgba(20,60,60,.06);--plum:#1E7A82;--copper:#3F8B94;--gold:#BF9F4E;--green:#2E7D5B;--greenbg:#E1F0EC;--amber:#8A6A2A;--amberbg:#EEE9D8;--red:#B0473E;--redbg:#F6E2DF;}
  #bx-listino-root[data-theme="notte"]{--bg:#12211C;--card:#1B2C24;--rowalt:#182821;--ink:#EAF1EA;--muted:#9CB0A4;--line:#2C3E34;--chip:#213329;--field:#152720;--shadow:0 1px 2px rgba(0,0,0,.32);--plum:#63C79A;--copper:#D9B25E;--gold:#E0BC6A;--green:#7FCBA4;--greenbg:#1E3A2E;--amber:#E0B36A;--amberbg:#33291A;--red:#E39189;--redbg:#3A211E;}
  @media (prefers-color-scheme:dark){#bx-listino-root:not([data-theme]){--bg:#12211C;--card:#1B2C24;--rowalt:#182821;--ink:#EAF1EA;--muted:#9CB0A4;--line:#2C3E34;--chip:#213329;--field:#152720;--shadow:0 1px 2px rgba(0,0,0,.32);--plum:#63C79A;--copper:#D9B25E;--gold:#E0BC6A;--green:#7FCBA4;--greenbg:#1E3A2E;--amber:#E0B36A;--amberbg:#33291A;--red:#E39189;--redbg:#3A211E;}}
  #bx-listino-root *{box-sizing:border-box}
  #bx-listino-root{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font-figtree),-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased}
  #bx-listino-root .wrap{max-width:820px;margin:0 auto;padding:0 16px 64px}
  #bx-listino-root h1{font-family:var(--font-fraunces),Georgia,serif;font-weight:600;font-size:22px;margin:0;letter-spacing:-.01em}
  #bx-listino-root .banner{display:flex;align-items:center;gap:15px;margin:20px 0 12px;position:relative}
  #bx-listino-root .banner .logo{height:62px;width:auto;flex:0 0 auto;filter:drop-shadow(0 1px 2px rgba(0,0,0,.20))}
  #bx-listino-root .banner h1{font-family:var(--font-playfair),Georgia,serif;font-weight:700;font-size:clamp(25px,5.5vw,34px);color:var(--plum);letter-spacing:.005em;line-height:1.02}
  #bx-listino-root .banner .bsub{font-size:12px;color:var(--copper);font-weight:600;margin-top:4px;letter-spacing:.06em;text-transform:uppercase}
  #bx-listino-root .banner .themes{margin-left:auto;align-self:flex-start;display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end;max-width:200px}
  #bx-listino-root .sw{width:22px;height:22px;border-radius:50%;border:1.5px solid rgba(0,0,0,.14);cursor:pointer;padding:0}
  #bx-listino-root .sw.on{outline:2px solid var(--plum);outline-offset:2px}
  #bx-listino-root .themecap{font-size:10.5px;color:var(--muted);width:100%;text-align:right;text-transform:uppercase;letter-spacing:.06em}
  #bx-listino-root tbody tr:nth-child(even) td{background:var(--rowalt)}
  @media (max-width:420px){#bx-listino-root .banner .logo{height:50px}#bx-listino-root .banner .themes{max-width:none}}
  #bx-listino-root .tabbar{position:sticky;top:0;background:var(--bg);display:flex;gap:4px;padding:6px 0;border-bottom:1px solid var(--line);z-index:5;flex-wrap:wrap;margin-bottom:16px}
  #bx-listino-root .tabbar button{background:none;border:none;font-family:inherit;font-size:14px;font-weight:600;color:var(--muted);padding:8px 13px;border-radius:9px;cursor:pointer}
  #bx-listino-root .tabbar button.on{background:var(--plum);color:#fff}
  #bx-listino-root .panel[hidden]{display:none}
  #bx-listino-root h2{font-family:var(--font-fraunces),serif;font-weight:600;font-size:17px;margin:22px 0 4px}
  #bx-listino-root h2:first-child{margin-top:0}
  #bx-listino-root .hint{color:var(--muted);font-size:12px;font-weight:400}
  #bx-listino-root .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;box-shadow:var(--shadow);margin:10px 0}
  #bx-listino-root label{display:block;font-weight:600;font-size:13px;margin-bottom:3px}
  #bx-listino-root input,#bx-listino-root select,#bx-listino-root textarea{font-family:inherit;color:var(--ink);background:var(--field);border:1.5px solid var(--line);border-radius:8px;outline:none;font-size:15px;padding:8px 10px}
  #bx-listino-root input:focus,#bx-listino-root select:focus,#bx-listino-root textarea:focus{border-color:var(--copper)}
  #bx-listino-root input[type=number]{-moz-appearance:textfield}
  #bx-listino-root input[type=number]::-webkit-outer-spin-button,#bx-listino-root input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  #bx-listino-root textarea{width:100%;font-family:ui-monospace,monospace;font-size:12px;resize:vertical}
  #bx-listino-root .cur{position:relative}#bx-listino-root .cur::before{content:"€";position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:13px;pointer-events:none}#bx-listino-root .cur input{padding-left:22px}
  #bx-listino-root .wxs{width:58px}#bx-listino-root .ws{width:74px}#bx-listino-root .wm{width:104px}
  #bx-listino-root .fieldrow{display:flex;flex-wrap:wrap;gap:14px}
  #bx-listino-root .fieldrow>div{flex:0 0 auto}
  #bx-listino-root .seg{display:inline-flex;border:1.5px solid var(--line);border-radius:9px;overflow:hidden}
  #bx-listino-root .seg button{background:var(--field);border:none;padding:8px 13px;font-size:13.5px;font-weight:600;cursor:pointer;color:var(--muted);font-family:inherit}
  #bx-listino-root .seg button.on{background:var(--plum);color:#fff}
  #bx-listino-root .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:7px}
  #bx-listino-root .row .nm{flex:1;min-width:100px}
  #bx-listino-root select.wper{width:96px}
  #bx-listino-root .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:10px 0}
  #bx-listino-root .tile{background:var(--chip);border-radius:11px;padding:11px 12px}
  #bx-listino-root .tile .k{font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.03em}
  #bx-listino-root .tile .v{font-family:var(--font-fraunces),serif;font-weight:600;font-size:21px;margin-top:2px;font-variant-numeric:tabular-nums}
  #bx-listino-root .verdict{font-family:var(--font-fraunces),serif;font-weight:600;font-size:19px;line-height:1.2;margin:2px 0 4px;text-wrap:balance}
  #bx-listino-root .msg{font-size:13.5px;margin:7px 0;padding-left:10px;border-left:3px solid var(--line)}
  #bx-listino-root .msg.g{border-color:var(--green)}#bx-listino-root .msg.a{border-color:var(--amber)}#bx-listino-root .msg.r{border-color:var(--red)}
  #bx-listino-root .btn{background:var(--field);border:1.5px solid var(--line);color:var(--ink);border-radius:9px;padding:8px 14px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit}
  #bx-listino-root .btn.p{background:var(--plum);color:#fff;border-color:var(--plum)}#bx-listino-root .btn:hover{border-color:var(--copper)}
  #bx-listino-root .btnrow{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  #bx-listino-root .tblwrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}
  #bx-listino-root table{width:100%;border-collapse:collapse;min-width:720px}
  #bx-listino-root th,#bx-listino-root td{padding:7px 6px;border-bottom:1px solid var(--line);text-align:center;font-size:12.5px}
  #bx-listino-root th{background:var(--chip);font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.02em;color:var(--muted)}
  #bx-listino-root td.nm{text-align:left}#bx-listino-root td input{text-align:center;padding:6px 6px}#bx-listino-root td.nm input{text-align:left;font-weight:600}
  #bx-listino-root .stato{display:inline-block;padding:3px 8px;border-radius:999px;font-size:10.5px;font-weight:700}
  #bx-listino-root .stato.g{background:var(--greenbg);color:var(--green)}#bx-listino-root .stato.a{background:var(--amberbg);color:var(--amber)}#bx-listino-root .stato.r{background:var(--redbg);color:var(--red)}
  #bx-listino-root .mval{font-family:var(--font-fraunces),serif;font-weight:600;font-variant-numeric:tabular-nums}
  #bx-listino-root .x{background:none;border:none;color:var(--muted);cursor:pointer;font-size:15px;padding:3px;line-height:1}#bx-listino-root .x:hover{color:var(--red)}
  #bx-listino-root .lk{background:none;border:none;cursor:pointer;font-size:13px;padding:2px}
  #bx-listino-root .foot{color:var(--muted);font-size:12px;margin-top:16px;text-align:center}
  #bx-listino-root details.g{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:0 15px;margin:8px 0;box-shadow:var(--shadow)}
  #bx-listino-root details.g>summary{cursor:pointer;font-weight:600;padding:13px 0;list-style:none;font-size:14.5px;color:var(--ink)}
  #bx-listino-root details.g>summary::-webkit-details-marker{display:none}
  #bx-listino-root details.g>summary::before{content:"＋";color:var(--plum);font-weight:700;margin-right:9px}
  #bx-listino-root details.g[open]>summary::before{content:"−"}
  #bx-listino-root details.g .gb{padding:0 0 16px;font-size:14px;line-height:1.72;color:var(--ink)}
  #bx-listino-root details.g .gb b{color:var(--plum)}
  #bx-listino-root details.g .gb p{margin:0 0 12px} #bx-listino-root details.g .gb p:last-child{margin-bottom:0}
  #bx-listino-root details.g .gb h4{margin:16px 0 6px;font-size:14px;color:var(--green);font-weight:700}
  #bx-listino-root details.g .gb ul{margin:6px 0 12px;padding-left:20px} #bx-listino-root details.g .gb li{margin:5px 0}
  #bx-listino-root .calc{background:var(--tint,#eef4f0);border:1px solid var(--line);border-left:3px solid var(--gold,#C6A03E);
    border-radius:0 8px 8px 0;padding:10px 14px;margin:10px 0;font-size:13.5px;line-height:1.85}
  #bx-listino-root .calc .r{display:flex;justify-content:space-between;gap:12px}
  #bx-listino-root .calc .r span:last-child{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
  #bx-listino-root .calc .tot{border-top:1px solid var(--line);margin-top:5px;padding-top:5px}
  #bx-listino-root .calc .bad span:last-child{color:#b3402f} #bx-listino-root .calc .good span:last-child{color:var(--green)}
  #bx-listino-root .aside{background:var(--card);border:1px dashed var(--line);border-radius:8px;padding:9px 13px;margin:10px 0;font-size:13px;color:var(--soft,#5c6b64)}
  #bx-listino-root .ttog{background:var(--card);border:1px solid var(--line);color:var(--ink);border-radius:999px;padding:5px 11px;font-size:13px;cursor:pointer}
  #bx-listino-root #vetrina-print{display:none}
  #bx-listino-root .vp-head{text-align:center;margin-bottom:6px}
  #bx-listino-root .vp-logo{height:74px;width:auto}
  #bx-listino-root .vp-title{font-family:var(--font-playfair),Georgia,serif;font-weight:700;font-size:30px;color:#1F6A4E;margin-top:8px}
  #bx-listino-root .vp-sub{color:#9A7A22;letter-spacing:.14em;text-transform:uppercase;font-size:11px;margin-top:3px}
  #bx-listino-root .vp-rule{height:2px;background:linear-gradient(90deg,rgba(198,160,62,0),#C6A03E,rgba(198,160,62,0));margin:14px auto 22px;max-width:620px}
  #bx-listino-root .vp-item{display:flex;justify-content:space-between;gap:16px;align-items:baseline;margin:0 auto 15px;max-width:620px;break-inside:avoid}
  #bx-listino-root .vp-l{flex:1}
  #bx-listino-root .vp-name{font-family:var(--font-playfair),Georgia,serif;font-weight:600;font-size:17px;color:#1F6A4E}
  #bx-listino-root .vp-desc{font-size:12px;color:#666;font-style:italic;margin-top:2px}
  #bx-listino-root .vp-price{font-family:var(--font-playfair),Georgia,serif;font-weight:700;font-size:18px;color:#9A7A22;white-space:nowrap}
  #bx-listino-root .vp-foot{max-width:620px;margin:26px auto 0;text-align:center;color:#a9a9a9;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase}
  @media print{@page{margin:16mm}#bx-listino-root{background:#fff}#bx-listino-root .banner,#bx-listino-root .tabbar,#bx-listino-root .panel,#bx-listino-root .foot,#bx-listino-root .ttog{display:none!important}#bx-listino-root #vetrina-print{display:block!important}}
  /* AGGIUNTA (21/09/2026, task #220): icona "?" con popup di spiegazione per i
     campi segnalati da Mason come poco comprensibili, e riga secondaria "IVA
     inclusa" sotto ai tre valori di spesa calcolati. */
  #bx-listino-root label{position:relative}
  #bx-listino-root .qtip{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:var(--chip);color:var(--muted);font-size:10.5px;font-weight:700;cursor:pointer;margin-left:5px;vertical-align:middle;border:1px solid var(--line);position:relative}
  #bx-listino-root .qtip:hover,#bx-listino-root .qtip.open{background:var(--plum);color:#fff;border-color:var(--plum)}
  #bx-listino-root .qtip-pop{display:none;position:absolute;z-index:30;left:0;top:22px;width:250px;background:var(--card);border:1px solid var(--line);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.18);padding:10px 12px;font-size:12.5px;font-weight:400;line-height:1.5;color:var(--ink);text-align:left;text-transform:none;letter-spacing:normal;cursor:default}
  #bx-listino-root .qtip:hover .qtip-pop,#bx-listino-root .qtip.open .qtip-pop,#bx-listino-root .qtip:focus .qtip-pop{display:block}
  #bx-listino-root h2 .qtip{margin-left:6px}
  #bx-listino-root .viva{font-size:10.5px;color:var(--muted);margin-top:3px;font-weight:500}
`

// ===================================================================
// HTML del tool — verbatim dal sorgente (righe 103-330), con due sole
// modifiche: (1) il logo del banner punta a /logo_beautyx-oro.png invece del
// base64 embedded originale, (2) è stato aggiunto un pannello "locked" (nuovo,
// nascosto di default) mostrato dallo script quando una tab è gated.
// ===================================================================
const TOOL_HTML = `
<div class="wrap">
  <div class="banner">
    <img class="logo" src="/logo_beautyx-oro.png" alt="beautyx">
    <div><h1>Listino intelligente</h1><div class="bsub">Il listino che fa guadagnare il tuo centro · beautyx</div></div>
    <div class="themes" id="themes"></div>
  </div>
  <div class="tabbar">
    <button data-tab="negozio" onclick="showTab('negozio')">1 · Il negozio</button>
    <button data-tab="servizio" onclick="showTab('servizio')">2 · Prezzo giusto</button>
    <button data-tab="listino" onclick="showTab('listino')">3 · Il listino</button>
    <button data-tab="vetrina" onclick="showTab('vetrina')">4 · Vetrina</button>
    <button data-tab="guida" onclick="showTab('guida')">Guida</button>
    <button data-tab="salva" onclick="showTab('salva')">Salva</button>
  </div>

  <!-- ===== NEGOZIO ===== -->
  <section class="panel" data-tab="negozio">
    <h2>Spese del negozio <span class="hint">importi come li paghi (IVA inclusa)</span></h2>
    <div class="card">
      <div id="voci"></div>
      <div class="btnrow"><button class="btn" onclick="addVoce()">+ Voce di spesa</button></div>
    </div>

    <h2>Capacità <span class="hint">quanto puoi davvero lavorare</span></h2>
    <div class="card">
      <div class="fieldrow">
        <div><label>Ore apertura/sett</label><input class="ws" type="number" id="oresett" min="1"></div>
        <div><label>Riempimento %<span class="qtip" tabindex="0">?<span class="qtip-pop">Quanta parte delle ore aperte riesci davvero a riempire di clienti. Nessun centro lavora il 100% del tempo: buchi in agenda, disdette, tempi morti tra un appuntamento e l'altro. Un valore realistico è tra 70% e 85% — il tool lo usa per calcolare le ore che puoi vendere per davvero, non quelle di sola apertura.</span></span></label><input class="wxs" type="number" id="fill" min="10" max="100"></div>
        <div><label>Postazioni<span class="qtip" tabindex="0">?<span class="qtip-pop">Quante cabine/postazioni di lavoro hai davvero. Se apri 8 ore con 2 postazioni, in teoria vendi fino a 16 ore-cabina al giorno — ma contano anche le persone che le occupano (vedi Operatrici sotto): il tool prende sempre il valore più basso tra postazioni e personale, perché è quello che ti frena davvero.</span></span></label><input class="wxs" type="number" id="postazioni" min="1"></div>
        <div><label>Ferie/permessi %<span class="qtip" tabindex="0">?<span class="qtip-pop">La quota di ore l'anno in cui il personale NON è al lavoro (ferie, permessi, malattia media). Riduce le ore davvero vendibili: più alta questa percentuale, meno ore il tool considera disponibili per calcolare il costo orario reale del negozio.</span></span></label><input class="wxs" type="number" id="ferie" min="0" max="40"></div>
        <div><label>Giorni/mese<span class="qtip" tabindex="0">?<span class="qtip-pop">Quanti giorni al mese il centro resta aperto. Serve a trasformare la spesa mensile del negozio in una spesa al giorno — così capisci subito se l'incasso di una giornata copre almeno le spese fisse di quella giornata.</span></span></label><input class="wxs" type="number" id="giorni" min="1" max="31"></div>
      </div>
      <label style="margin-top:12px">Operatrici <span class="hint">nome + ore a settimana</span><span class="qtip" tabindex="0">?<span class="qtip-pop">Le persone che lavorano in cabina, con le ore settimanali di ciascuna (le "licenze"/ore di presenza del personale). Il tool somma le ore di tutto il personale — al netto di Ferie/permessi — e le confronta con le ore delle postazioni: chi dei due frena di più decide quante ore puoi davvero vendere in un mese.</span></span></label>
      <div id="operatori"></div>
      <div class="btnrow"><button class="btn" onclick="addOperatore()">+ Operatrice</button></div>
      <div class="msg" id="bottleneck" style="margin-top:10px"></div>
    </div>

    <h2>Fisco</h2>
    <div class="card">
      <div class="fieldrow" style="align-items:flex-end">
        <div><label>Regime</label><div class="seg" id="regtoggle"><button data-v="ord">Ordinario</button><button data-v="forf">Forfettario</button></div></div>
        <div id="ivabox"><label>IVA %</label><input class="wxs" type="number" id="iva" min="0" max="30"></div>
        <div><label>Margine obiettivo %</label><input class="wxs" type="number" id="obiettivo" min="1" max="95"></div>
      </div>
    </div>

    <h2>Quanto ti costa il negozio <span class="hint">valori al netto IVA</span></h2>
    <div class="verdict" id="costsentence" style="color:var(--plum)">—</div>
    <div class="tiles">
      <div class="tile"><div class="k">al mese</div><div class="v" id="totmese">—</div><div class="viva" id="totmese-iva"></div></div>
      <div class="tile"><div class="k">al giorno</div><div class="v" id="speseday">—</div><div class="viva" id="speseday-iva"></div></div>
      <div class="tile"><div class="k">all'ora</div><div class="v" id="hourly">—</div><div class="viva" id="hourly-iva"></div></div>
      <div class="tile"><div class="k">Ore prod. / mese</div><div class="v" id="oreprod">—</div></div>
    </div>
    <p class="hint" id="ivaNote" style="margin-top:8px"></p>
  </section>

  <!-- ===== SERVIZIO ===== -->
  <section class="panel" data-tab="servizio" hidden>
    <h2>Trova il prezzo giusto</h2>
    <p class="hint" style="margin:0 0 8px">Trova l'equilibrio tra costi e utile su un servizio: quanto ricavi da ogni prestazione e fin dove puoi scontare. Cambia prezzo o durata e guarda muoversi i numeri.</p>
    <div class="card">
      <div class="fieldrow">
        <div style="flex:1;min-width:150px"><label>Nome</label><input type="text" id="bNome" placeholder="es. Pulizia viso" style="width:100%"></div>
        <div><label>Prezzo</label><div class="cur"><input class="wm" type="number" id="bPrezzo" min="0"></div></div>
        <div><label>Durata (min)</label><input class="ws" type="number" id="bDurata" min="1"></div>
        <div><label>Clienti/mese</label><input class="ws" type="number" id="bClienti" min="0"></div>
      </div>
      <div id="bancoOut" style="margin-top:12px"></div>
      <div class="btnrow"><button class="btn p" onclick="addBancoToListino(event)">➕ Aggiungi al listino</button></div>
    </div>
  </section>

  <!-- ===== LISTINO ===== -->
  <section class="panel" data-tab="listino" hidden>
    <h2>Il listino</h2>
    <div class="fieldrow" style="align-items:flex-end;margin-bottom:8px">
      <div><label>Volumi</label><div class="seg" id="voltoggle"><button data-v="perc">A percentuali</button><button data-v="num">A numeri</button></div></div>
      <div id="fattbox"><label>Fatturato anno scorso <span class="hint">vuoto = nuova attività</span></label><div class="cur"><input class="wm" type="number" id="fatturato" min="0" step="1000"></div></div>
    </div>
    <p class="hint" id="volhint" style="margin:0 0 8px"></p>
    <div class="tblwrap"><table id="tbl">
      <thead><tr><th style="text-align:left">Servizio</th><th>Prezzo</th><th>Durata</th><th>Post.</th><th id="volhead">%</th><th>Promo%</th><th>Sedute/m</th><th>Utile/cli.</th><th>Stato</th><th></th></tr></thead>
      <tbody id="rows"></tbody>
    </table></div>
    <div class="hint" id="sharebar" style="margin-top:6px"></div>
    <div class="btnrow"><button class="btn p" onclick="addRow()">+ Servizio</button><button class="btn" onclick="sbloccaTutte()">🔓 Sblocca %</button><button class="btn" onclick="resetDemo()">↺ Esempio</button><button class="btn" onclick="copiaExcel(event)">📋 Copia per Excel</button><button class="btn" onclick="printList()">🖨 Stampa</button></div>

    <h2>Bilancio del mese</h2>
    <div class="card" id="summary"></div>
    <p class="foot">«Utile» = prima delle imposte sul reddito e dei prelievi personali. L'IVA è già scorporata. Stime gestionali, non consulenza fiscale.</p>
  </section>

  <!-- ===== VETRINA ===== -->
  <section class="panel" data-tab="vetrina" hidden>
    <h2>La vetrina — il listino da esporre</h2>
    <p class="hint" style="margin:0 0 10px">Il nome e la descrizione valgono quanto il prezzo. «Manicure» invita al confronto al ribasso; «Rituale Mani» no. Come lo chef col piatto: dai valore percepito e il prezzo si giustifica da sé.</p>
    <div class="card">
      <div class="fieldrow">
        <div style="flex:1;min-width:180px"><label>Nome del centro</label><input type="text" id="centroNome" style="width:100%" placeholder="Il Tuo Centro Estetico"></div>
        <div style="flex:1;min-width:180px"><label>Indirizzo / sottotitolo</label><input type="text" id="centroSub" style="width:100%" placeholder="Via… · Città"></div>
      </div>
    </div>
    <div id="vetrinaEdit"></div>
    <div class="btnrow"><button class="btn p" onclick="printVetrina()">🖨 Stampa il listino da esporre</button></div>
  </section>

  <!-- ===== GUIDA ===== -->
  <section class="panel" data-tab="guida" hidden>
    <h2>Guida — il listino come strategia</h2>
    <p class="hint" style="margin:0 0 10px">Questa non è una scheda di riepilogo: è una guida vera. Ogni voce spiega <b>perché</b> un numero è quello che è, e gli esempi sono svolti passo passo. Prenditi il tempo di leggerli — è lì che si capisce come si costruisce un listino che regge e che vende.</p>
    <div class="tiles" style="margin-bottom:10px">
      <div class="tile"><div class="k">Leva 1</div><div class="v" style="font-size:16px">Durata</div></div>
      <div class="tile"><div class="k">Leva 2</div><div class="v" style="font-size:16px">Costi</div></div>
      <div class="tile"><div class="k">Leva 3</div><div class="v" style="font-size:16px">Quantità</div></div>
      <div class="tile"><div class="k">Leva 4</div><div class="v" style="font-size:16px">Valore percepito</div></div>
    </div>
    <details class="g" open><summary>Prima di tutto: le due domande a cui risponde il tool</summary><div class="gb">
      <p>Ogni prezzo vive tra due confini, e il tuo lavoro è tenerlo dentro entrambi.</p>
      <p><b>Il pavimento — «mi copre i costi?»</b> Sotto una certa cifra, ogni cliente che entra ti fa perdere soldi anziché fartene guadagnare. Questo confine non è un'opinione: è aritmetica. Dipende da quanto ti costa tenere aperto e da quanti minuti quel servizio occupa. Il tool lo calcola per te nelle schede <b>Negozio</b> e <b>Prezzo giusto</b>.</p>
      <p><b>Il soffitto — «la cliente lo paga volentieri?»</b> Sopra una certa cifra la cliente non ti segue più… a meno che tu non le dia una ragione per farlo. E qui non comanda l'aritmetica, comanda la <b>percezione</b>: com'è fatto il servizio, come lo racconti, che esperienza è. Questo confine lo alzi tu, e lo lavori nella scheda <b>Vetrina</b>.</p>
      <p>Un centro in difficoltà quasi sempre sbaglia lo stesso movimento: quando un prezzo "non funziona" lo <b>abbassa</b>, cioè spinge verso il pavimento. Il tool serve a farti fare il movimento opposto — capire dov'è davvero il pavimento (spesso più in alto di quanto credi) e imparare ad alzare il soffitto invece di scavare sotto.</p>
    </div></details>

    <details class="g"><summary>Come funziona, scheda per scheda</summary><div class="gb">
      <p>Le quattro schede non sono quattro strumenti separati: sono quattro passi dello stesso ragionamento. Si leggono in ordine.</p>
      <h4>1 · Il negozio — quanto ti costa esistere</h4>
      <p>Qui inserisci <b>tutte</b> le spese fisse: affitto, utenze, stipendi, commercialista, software, materiali di consumo, la tua stessa remunerazione. Ogni voce con la sua periodicità (al mese o all'anno) e la sua IVA. Poi descrivi la <b>capacità reale</b>: quante postazioni/cabine hai, quante operatrici e con quante ore ciascuna, quanti giorni apri, quante settimane di ferie. Il tool combina le due cose e ti restituisce il numero più importante di tutti: <b>quanto ti costa un'ora di negozio</b>. È la soglia che ogni ora di lavoro deve superare per non essere in perdita. Se non parti da qui, tutto il resto sono numeri campati in aria.</p>
      <h4>2 · Prezzo giusto — un servizio alla lente</h4>
      <p>Prendi un singolo servizio e lo "provi al banco". Il tool ti dice quanto <b>ricavi davvero</b> da ogni cliente (prezzo meno i prodotti che consumi meno la fetta di costi del negozio che quel servizio si porta via col suo tempo), e fino a che sconto puoi arrivare restando comunque in utile — lo <b>sconto sicuro</b>. È lo strumento per rispondere alla domanda "questo prezzo regge?" prima ancora di metterlo a listino.</p>
      <h4>3 · Il listino — tutti insieme, il quadro vero</h4>
      <p>Qui metti in fila tutti i servizi con i loro volumi (a percentuale o a numeri reali, ancorati al tuo fatturato). Il tool ti mostra il quadro d'insieme: quali servizi <b>trainano</b> il centro e quali lo <b>frenano</b>, se col mix attuale il mese chiude in attivo, e <b>quante clienti servono</b> per arrivare al pareggio. È qui che ti accorgi che il servizio che ami fare magari è quello che ti sta costando, e che quello che sottovaluti è la tua gallina dalle uova d'oro.</p>
      <h4>4 · Vetrina — il listino da esporre</h4>
      <p>L'ultima scheda trasforma i numeri in un oggetto reale: dai a ogni servizio un <b>nome evocativo</b> e una <b>descrizione</b>, e stampi un listino elegante, senza numeri gestionali, pronto da appendere in negozio o mandare su WhatsApp. È lo strumento con cui lavori il "soffitto": il valore percepito.</p>
    </div></details>

    <details class="g"><summary>Il costo orario del negozio: il numero da cui parte tutto</summary><div class="gb">
      <p>È il concetto che quasi nessuno ha in testa, e per cui la maggior parte dei centri lavora tanto e guadagna poco. Vale la pena capirlo bene.</p>
      <p>Il tuo negozio ha un costo che <b>corre anche quando la cabina è vuota</b>: l'affitto si paga lo stesso, lo stipendio si paga lo stesso, il commercialista pure. Quindi la domanda giusta non è "quanto costa questo prodotto", ma <b>"quanto costa un'ora del mio negozio"</b>. Per saperlo servono due cose: quanto spendi in totale, e quante ore <b>fatturabili</b> hai davvero.</p>
      <p>E qui c'è la trappola. Le ore fatturabili non sono le ore in cui sei aperta. Sono il <b>minore</b> tra due tetti:</p>
      <ul>
        <li><b>le ore delle postazioni</b> — se apri 8 ore ma hai 2 cabine, in teoria vendi fino a 16 ore-cabina al giorno;</li>
        <li><b>le ore delle persone</b> — ma se hai una sola operatrice che fa 8 ore, di quelle 16 ore-cabina ne puoi davvero riempire solo 8, perché il lavoro lo fanno le persone, non i muri.</li>
      </ul>
      <p>Il tool prende sempre il <b>più basso</b> dei due, perché è quello che ti frena davvero. Ecco perché, se metti postazioni e personale allineati, ti dice "ti frena il personale": significa che aggiungere una cabina in più non ti serve a niente finché non aggiungi mani che la usino. Poi applica un tasso di <b>riempimento realistico</b> (nessun centro è pieno al 100% delle ore: ci sono i buchi, le disdette, i tempi morti) e le settimane di ferie. Il risultato sono le ore che puoi <b>davvero</b> vendere in un mese.</p>
      <div class="calc">
        <div class="r"><span>Costi fissi del negozio</span><span>4.600 €/mese</span></div>
        <div class="r"><span>Ore vendibili reali (non quelle di apertura)</span><span>≈ 177 h/mese</span></div>
        <div class="r tot"><span><b>Costo di un'ora di negozio</b></span><span><b>≈ 26 €/h</b></span></div>
      </div>
      <p>Ecco lo schiaffo che apre gli occhi: se credevi che un'ora ti costasse 15 €, e invece te ne costa 26, ogni servizio che vendi "a sensazione" può essere in perdita senza che tu lo sappia. Da questo numero — 26 €/h nell'esempio — discende tutto il resto della guida.</p>
    </div></details>

    <details class="g"><summary>Le 4 leve, e come si muovono insieme</summary><div class="gb">
      <p>Quando un prezzo non funziona hai quattro manopole, non una. La più ovvia — il prezzo — è quasi sempre quella sbagliata da girare per prima.</p>
      <h4>Durata</h4>
      <p>Quanti minuti occupa il servizio. È una leva potente e invisibile: se lo stesso risultato lo ottieni in 45 minuti invece che in 60, quella cabina in un giorno fa un servizio in più senza costarti un euro di più. La durata non tocca il prezzo, ma cambia <b>quanti clienti</b> ci stanno nelle tue ore — e quindi quanto quel servizio pesa o rende.</p>
      <h4>Costi</h4>
      <p>Due voci: i <b>prodotti</b> che consumi a ogni seduta, e la <b>fetta di costo del negozio</b> che il servizio si porta via col suo tempo (durata × costo orario). Sui prodotti puoi lavorare con i fornitori; sul costo orario lavori riempiendo meglio le ore. Ridurre i costi alza il margine a parità di prezzo.</p>
      <h4>Quantità</h4>
      <p>Quanti servizi puoi erogare <b>in contemporanea</b>: è il tetto postazioni × persone di cui sopra. È la leva che decide se un prezzo basso "sta in piedi grazie ai volumi" oppure è solo un sogno: un prezzo che richiede 70 clienti al mese è un problema se la tua capacità, o la tua realtà, è di 30.</p>
      <h4>Valore percepito</h4>
      <p>La leva che <b>sovrasta le altre tre</b>. Le prime tre lavorano sul pavimento (i costi); questa lavora sul soffitto (quanto la cliente è disposta a pagare). Un servizio strutturato, con un nome che evoca e un rituale riconoscibile, esce dal confronto sul prezzo: non è più "una manicure come le altre", quindi non lo confronti più con la manicure a 2 € in meno del centro accanto.</p>
      <p><b>Come si muovono insieme:</b> girare una manopola muove le altre. Accorci la durata → aumenti la quantità possibile e abbassi il costo-tempo del servizio. Alzi il valore percepito → puoi alzare il prezzo <b>e</b> permetterti una durata più lunga senza andare in perdita. La regola d'oro: se un prezzo "non regge", chiediti prima se il problema è davvero il prezzo, o se è la durata, la saturazione delle ore, o il modo in cui il servizio è raccontato.</p>
    </div></details>

    <details class="g"><summary>Esempio 1 — la manicure che non regge (svolto per intero)</summary><div class="gb">
      <p>Hai a listino una «Manicure» a <b>18 €</b>, dura <b>45 minuti</b>, e consumi circa <b>3 € di prodotti</b>. Il centro accanto la fa a 16 € e ti sembra di essere già cara. Portiamola al banco, col costo orario di 26 €/h della scheda precedente.</p>
      <p>45 minuti sono 0,75 di ora. La fetta di negozio che questo servizio si porta via è quindi 0,75 × 26 = <b>19,50 €</b> solo di costi fissi, a cui aggiungi i 3 € di prodotti.</p>
      <div class="calc">
        <div class="r"><span>Incasso</span><span>18,00 €</span></div>
        <div class="r"><span>− prodotti</span><span>−3,00 €</span></div>
        <div class="r"><span>− costo negozio (0,75 h × 26 €)</span><span>−19,50 €</span></div>
        <div class="r tot bad"><span><b>Risultato per ogni manicure</b></span><span><b>−4,50 €</b></span></div>
      </div>
      <p>Ogni manicure che fai ti <b>toglie</b> 4,50 €. Non è che guadagni poco: perdi. E l'istinto — "abbasso a 16 € per battere il centro accanto" — peggiora tutto: incasseresti 2 € in meno, quindi perderesti <b>6,50 €</b> a manicure. Stai correndo verso il pavimento e scavando sotto.</p>
      <h4>La mossa giusta: alzare il soffitto, non abbassare il pavimento</h4>
      <p>Non svendi: <b>ristrutturi il servizio e il racconto</b>. La «Manicure» diventa il «<b>Rituale Mani</b> — cura delle cuticole, <b>massaggio con oli nutrienti</b>, smalto a lunga tenuta». Aggiungi un po' di prodotto (oli: prodotti a 5 €) e qualche minuto di cura in più, diciamo 50 minuti (0,83 h). Lo porti a <b>28 €</b>.</p>
      <div class="calc">
        <div class="r"><span>Incasso</span><span>28,00 €</span></div>
        <div class="r"><span>− prodotti (con oli)</span><span>−5,00 €</span></div>
        <div class="r"><span>− costo negozio (0,83 h × 26 €)</span><span>−21,60 €</span></div>
        <div class="r tot good"><span><b>Risultato per ogni Rituale Mani</b></span><span><b>+1,40 €</b></span></div>
      </div>
      <p>Da −4,50 a +1,40. Ma il vero guadagno non è quell'euro e quaranta: è che il «Rituale Mani» <b>non è più confrontabile</b> con la manicure a 16 € del centro accanto. La cliente non sta comprando lo stesso servizio a un prezzo più alto — sta comprando un'altra cosa. Il valore percepito ha fatto il lavoro che lo sconto avrebbe distrutto.</p>
      <div class="aside">Nota: qui abbiamo mostrato solo la copertura dei costi. In realtà 1,40 € di margine è ancora sottile: il banco ti dirà che puoi spingere il prezzo o accorciare un filo la durata per portarlo a un utile sano. È esattamente il gioco delle leve.</div>
    </div></details>

    <details class="g"><summary>Esempio 2 — il servizio che non riesci a riempire (svolto per intero)</summary><div class="gb">
      <p>Hai un trattamento viso base a <b>35 €</b>, dura <b>1 ora</b>, prodotti <b>8 €</b>. Al banco margina bene su ogni cliente (35 − 8 − 26 = <b>+1 €</b>… anche qui appena sopra il pareggio), ma il problema è un altro: <b>non riesci a riempirlo</b>. Per far sì che questo servizio, da solo, ripaghi la sua fetta di negozio e ti lasci qualcosa, il tool ti dice che ti servirebbero circa <b>70 clienti al mese</b>. Realisticamente ne fai <b>30</b>. Che fai?</p>
      <p>L'errore classico è ancora una volta la manopola sbagliata: abbassare il prezzo per "attirarne di più". Ma a 35 € già margini quasi zero: abbassarlo significa lavorare in perdita su un servizio che <b>già</b> non riempi. Hai tre strade migliori, e il tool ti mostra l'effetto di ciascuna in tempo reale.</p>
      <h4>① Alza il valore (e con esso il prezzo)</h4>
      <p>Trasformi la singola seduta in un <b>percorso</b>: "Protocollo Luminosità — 4 sedute", con un prodotto da portare a casa e un ambiente curato. Lo vendi a 180 € invece di 4 × 35 = 140. Adesso ogni cliente vale molto di più, e per stare in piedi te ne servono <b>meno</b>. Il servizio esce dal confronto e attira chi cerca un risultato, non lo sconto.</p>
      <h4>② Accorcia la durata (se il risultato non cambia)</h4>
      <p>Se lo stesso trattamento lo fai bene in <b>45 minuti</b> invece di 60, quella cabina in un giorno regge un cliente in più, e la fetta di negozio per seduta scende da 26 € a circa 19,50 €. A parità di prezzo il margine passa da +1 € a <b>+7,50 €</b>: lo stesso servizio, di colpo, "regge" con molti meno clienti.</p>
      <div class="calc">
        <div class="r"><span>A 60 min: 35 − 8 − 26,00</span><span>+1,00 €</span></div>
        <div class="r good"><span>A 45 min: 35 − 8 − 19,50</span><span>+7,50 €</span></div>
      </div>
      <h4>③ Affiancalo a un servizio ad alto margine</h4>
      <p>Non tutti i servizi devono reggersi da soli. Se il viso base <b>porta clienti</b> che poi prenotano un trattamento corpo che margina bene, il suo compito è quello: essere la porta d'ingresso. Nel listino lo tieni, ma smetti di pretendere che sia lui a pagare l'affitto.</p>
      <p>Tre strade, nessuna delle quali è "abbasso il prezzo". Questo è il punto di tutto il tool.</p>
    </div></details>

    <details class="g"><summary>Il principio: come lo chef, come le Pringles</summary><div class="gb">
      <p>C'è una ragione per cui gli esempi finiscono sempre sul valore percepito: è la leva che cambia il gioco, ed è quella che gli estetisti usano di meno.</p>
      <p>Al ristorante, un'«<b>omelette contadina, uova di giornata ed erbe dell'orto</b>» si vende a 8 €. Lo stesso identico piatto, chiamato «<b>uovo con la cipolla</b>», ne vale 4. Gli ingredienti costano uguale, il lavoro è lo stesso: cambia solo il <b>racconto</b>, e il racconto vale il doppio del prezzo. Le Pringles costano molto più delle patatine sfuse a parità di patata, perché paghi la forma, il tubo, la promessa di un'esperienza precisa. Non è un trucco: è che il cliente non compra la patata, compra <b>ciò che quella patata significa per lui</b>.</p>
      <p>Nell'estetica funziona identico, e in più hai un vantaggio che il ristorante non ha: le tue clienti tornano, si fidano, raccontano. Un servizio con un nome che evoca un risultato e un'esperienza riconoscibile <b>esce dalla guerra dei prezzi</b>. Non lo confrontano più con quello del centro accanto, perché nella testa della cliente non è la stessa cosa.</p>
      <p><b>Ecco perché il listino è la vera arma del centro:</b> non è un elenco di prezzi, è il posto dove decidi contemporaneamente che <b>i conti tornano</b> (il pavimento, con le prime tre leve) e che <b>le clienti ti scelgono</b> (il soffitto, con la quarta). Questo tool ti fa trovare, servizio per servizio, il punto esatto in cui costi, prezzo e percezione stanno in equilibrio. È lì che smetti di lavorare tanto per guadagnare poco.</p>
    </div></details>
  </section>

  <!-- ===== SALVA ===== -->
  <section class="panel" data-tab="salva" hidden>
    <h2>Salva e riprendi</h2>
    <div class="card">
      <p class="hint" style="margin-top:0">Il lavoro resta su questo dispositivo. Per sicurezza o per cambiare computer, copia il codice e conservalo.</p>
      <label>Il tuo codice</label>
      <textarea id="expcode" readonly rows="3" onclick="this.select()"></textarea>
      <div class="btnrow"><button class="btn p" id="copybtn" onclick="copyCode()">Copia il codice</button></div>
      <label style="margin-top:12px">Incolla un codice per ricaricare</label>
      <textarea id="impcode" rows="3" placeholder="Incolla qui…"></textarea>
      <div class="btnrow"><button class="btn" onclick="restoreCode()">Ripristina</button> <span id="impmsg" class="hint" style="align-self:center"></span></div>
    </div>
  </section>

  <!-- ===== VERSIONE COMPLETA (nuovo — gating, mostrato dallo script al posto
       delle sezioni sopra quando la tab richiesta è fuori dai 90gg gratuiti) ===== -->
  <section class="panel" id="bx-locked-panel" hidden>
    <div class="card" style="text-align:center;padding:30px 20px">
      <div style="font-size:30px;margin-bottom:8px" aria-hidden="true">🔒</div>
      <h2 id="bx-lock-title" style="margin:0 0 10px">Funzione della versione completa</h2>
      <p class="hint" id="bx-lock-desc" style="max-width:460px;margin:0 auto 18px;font-size:13.5px;line-height:1.6"></p>
      <div class="btnrow" style="justify-content:center">
        <a class="btn p" href="/newsletter" style="text-decoration:none;display:inline-flex;align-items:center">Scopri l'ecosistema beautyx →</a>
      </div>
      <p class="foot" style="margin-top:16px">Il costo orario del negozio e il prezzo giusto di un singolo servizio restano gratuiti per sempre.</p>
    </div>
  </section>

  <p class="foot" style="margin-top:26px">Un progetto <b>beautyx</b> · Svetage S.r.l. · <span style="opacity:.7">versione 2.3 — set. 2026</span></p>
  <div id="vetrina-print" aria-hidden="true"></div>
</div>
`

// ===================================================================
// JS del tool — verbatim dal sorgente (righe 333-448: tutta la logica di
// calcolo, rendering, salvataggio/import è invariata), con due sole aggiunte
// (segnalate inline con commenti "AGGIUNTA gating"): la funzione showTab()
// ora controlla il gate lite/completo prima di mostrare le tab "listino",
// "vetrina", "salva"; e in coda allo script un piccolo blocco marca i pulsanti
// delle tab gated con un lucchetto e avvisa il componente React (CTA verso
// /newsletter) al primo cambio di tab da parte dell'utente.
// ===================================================================
function buildToolScript(isFree) {
  return `
(function(){
  // ---- AGGIUNTA gating: stato calcolato lato React da isWithinReportFreeWindow()
  // (stessa finestra/stessa fonte dell'Identikit CURA, lib/report/freeWindow.js —
  // nessuna nuova data di lancio inventata qui).
  var __BX_GATE_FULL = ${isFree ? 'false' : 'true'};
  var __BX_GATED_TABS = ['listino','vetrina','salva'];
  var __BX_LOCK_INFO = {
    listino: { title: "Il listino intero è nella versione completa", desc: "Il costo orario e il prezzo giusto di un singolo servizio restano gratuiti per sempre. Per vedere tutti i servizi insieme, il bilancio del mese e quante clienti servono per il pareggio, serve la versione completa: 29€ una tantum." },
    vetrina: { title: "La vetrina stampabile è nella versione completa", desc: "Il listino elegante da stampare ed esporre in negozio fa parte della versione completa (29€ una tantum)." },
    salva: { title: "Salvataggio e backup sono nella versione completa", desc: "Salvare il tuo lavoro e riprenderlo su un altro dispositivo fa parte della versione completa (29€ una tantum)." }
  };

  const r=document.getElementById("bx-listino-root")||document.documentElement,dk="bx_listino_v8";
  const THEMES=[{id:"bosco",n:"Bosco",p:"equilibrio",a:"#1F6A4E",b:"#C6A03E"},{id:"cipria",n:"Cipria",p:"calore",a:"#A8455F",b:"#E7C9C0"},{id:"lavanda",n:"Lavanda",p:"quiete",a:"#6A4E9C",b:"#D9CFEC"},{id:"acqua",n:"Acqua",p:"serenità",a:"#1E7A82",b:"#BFE0DF"},{id:"notte",n:"Notte",p:"eleganza",a:"#63C79A",b:"#17271F"}];
  function renderThemes(){const g=document.getElementById("themes");if(!g)return;g.innerHTML=THEMES.map(t=>'<button class="sw" data-t="'+t.id+'" title="'+t.n+' · '+t.p+'" onclick="setTheme(\\''+t.id+'\\')" style="background:linear-gradient(135deg,'+t.a+' 0 52%,'+t.b+' 52% 100%)"></button>').join("")+'<span class="themecap" id="themecap"></span>';}
  function setTheme(id){r.setAttribute("data-theme",id);try{localStorage.setItem("bx_theme",id);}catch(e){}document.querySelectorAll("#themes .sw").forEach(b=>b.classList.toggle("on",b.dataset.t===id));const t=THEMES.find(x=>x.id===id),cap=document.getElementById("themecap");if(cap&&t)cap.textContent=t.n+" · "+t.p;}

  // ---- AGGIUNTA gating: showTab() originale conservava solo lo switch dei
  // pannelli; qui, prima di farlo, controlla se la tab richiesta è gated e
  // fuori dai 90gg, e in quel caso mostra il pannello #bx-locked-panel al
  // posto del contenuto reale.
  function showTab(n){
    if (__BX_GATE_FULL && __BX_GATED_TABS.indexOf(n) !== -1) {
      document.querySelectorAll('.panel').forEach(function(p){ if(p.id!=='bx-locked-panel') p.hidden = true; });
      document.querySelectorAll('.tabbar button').forEach(function(b){ b.classList.toggle('on', b.dataset.tab===n); });
      var info = __BX_LOCK_INFO[n] || {};
      var lp = document.getElementById('bx-locked-panel');
      if (lp) {
        lp.hidden = false;
        var t = document.getElementById('bx-lock-title'); if (t) t.textContent = info.title || 'Funzione della versione completa';
        var d = document.getElementById('bx-lock-desc'); if (d) d.textContent = info.desc || '';
      }
      try{localStorage.setItem('bx_tab',n);}catch(e){}
      return;
    }
    var lp2 = document.getElementById('bx-locked-panel'); if (lp2) lp2.hidden = true;
    document.querySelectorAll('.panel').forEach(p=>{ if(p.id!=='bx-locked-panel') p.hidden=p.dataset.tab!==n; });
    document.querySelectorAll('.tabbar button').forEach(b=>b.classList.toggle('on',b.dataset.tab===n));
    if(n==='vetrina')renderVetrina();
    try{localStorage.setItem('bx_tab',n);}catch(e){}
  }

  const eur=n=>"€ "+(Math.round(n*100)/100).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
  const eur0=n=>"€ "+Math.round(n).toLocaleString("it-IT");const WK=4.33;
  const esc=t=>String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const VOCI_DEF=[["Affitto / locale",1200,"mese",0],["Utenze",350,"mese",22],["Personale (stipendi+contributi)",2500,"mese",0],["Compenso titolare",1500,"mese",0],["Materiali e pulizia",150,"mese",22],["Commercialista",1800,"anno",22],["Assicurazioni",600,"anno",0],["Software / abbonamenti",80,"mese",22],["Marketing",150,"mese",22],["Macchinari (manut.+ammort.)",3600,"anno",22],["Telefono / internet",50,"mese",22],["Imposte e tributi (TARI…)",1440,"anno",0],["Prodotti (acquisto annuo)",24000,"anno",22],["Altro",100,"mese",0]];
  const DEMO=[{n:"Ricostruzione unghie",p:45,d:90,ab:"",share:35,volte:0,promo:0,descr:"Ricostruzione in gel, cuticole curate, massaggio mani con oli nutrienti e finish lucido a lunga tenuta."},{n:"Ceretta gambe",p:30,d:30,ab:"",share:20,volte:0,promo:0,descr:"Depilazione completa con cera delicata e olio lenitivo post-trattamento."},{n:"Pulizia viso",p:60,d:60,ab:"",share:15,volte:0,promo:0,descr:"Detersione profonda, estrazione, maschera su misura e massaggio finale rilassante."},{n:"Massaggio 60'",p:65,d:60,ab:"",share:12,volte:0,promo:0,descr:"Massaggio total body con oli caldi aromatici, su misura del tuo bisogno."},{n:"Epilazione laser",p:80,d:40,ab:1,share:10,volte:0,promo:0,descr:"Epilazione progressiva con tecnologia laser, seduta mirata per zona."},{n:"Corpo 90'",p:90,d:90,ab:"",share:8,volte:0,promo:0,descr:"Rituale corpo modellante: scrub, fango caldo e massaggio drenante."}];
  let voci=VOCI_DEF.map(v=>({l:v[0],v:v[1],per:v[2],iva:v[3]})), services=DEMO.map(x=>({...x}));
  let operatori=[{n:"Titolare",h:40},{n:"Part-time",h:24}];
  let state={oresett:40,fill:80,postazioni:3,ferie:12,giorni:24,obiettivo:55,fatturato:240000,regime:"ord",iva:22,volmode:"perc",bNome:"",bPrezzo:50,bDurata:60,bClienti:40,centroNome:"",centroSub:""};
  try{const d=JSON.parse(localStorage.getItem(dk)||"null");if(d){voci=d.voci||voci;services=d.services||services;state=Object.assign(state,d.state||{});if(d.operatori)operatori=d.operatori;else if(d.state&&(d.state.monteore||d.state.operatrici))operatori=[{n:"Personale",h:(+d.state.monteore||((+d.state.operatrici||1)*(+d.state.oreop||36)))}];}}catch(e){}

  const vMonthly=v=>((+v.v||0)/(v.per==="anno"?12:1));
  const vNetMonthly=v=>{const g=vMonthly(v);return state.regime==="ord"?g/(1+(+v.iva||0)/100):g;};
  function fixedMese(){return voci.reduce((a,v)=>a+vMonthly(v),0);}
  function fixedNetMese(){return voci.reduce((a,v)=>a+vNetMonthly(v),0);}
  function ivaCreditoMese(){if(state.regime!=="ord")return 0;return voci.reduce((a,v)=>a+(vMonthly(v)-vNetMonthly(v)),0);}
  function fattNetMese(){const g=(+state.fatturato||0)/12;return state.regime==="ord"?g/ivaF():g;}
  function cap(){const O=+state.oresett||0,fill=(+state.fill||80)/100,P=+state.postazioni||0,leave=(+state.ferie||0)/100;const N=operatori.filter(o=>(+o.h||0)>0).length,M=operatori.reduce((a,o)=>a+(+o.h||0),0);const laborEff=M*(1-leave),stationWk=P*O,parallel=Math.min(P,N||0);const bindingWk=Math.min(stationWk,laborEff),billMo=bindingWk*fill*WK;const perStationProdHmo=O*fill*WK;let bottle="equilibrato";if(laborEff<stationWk)bottle="personale";else if(stationWk<laborEff)bottle="postazioni";return {O,fill,P,N,M,laborEff,parallel,billMo,perStationProdHmo,bottle,stationWk};}
  function breakEvenHour(){const c=cap();return c.billMo>0?fixedNetMese()/c.billMo:0;}
  const ivaF=()=>state.regime==="ord"?(1+(+state.iva||0)/100):1;
  function kFactor(){if(state.volmode!=="perc")return 0;const fatt=fattNetMese();if(fatt>0){const den=services.reduce((a,s)=>{if(+s.p<=0)return a;return a+(+s.share||0)*metrics(s).netPromo;},0);return den>0?fatt/den:0;}const c=cap();const den=services.reduce((a,s)=>{if(+s.p<=0||+s.d<=0)return a;return a+(+s.share||0)*((+s.d)/60);},0);return den>0?c.billMo/den:0;}
  function isProiezione(){return state.volmode==="perc"&&fattNetMese()<=0;}
  function count(s){if(state.volmode==="num")return +s.volte||0;if(+s.p<=0)return 0;return kFactor()*(+s.share||0);}
  function metrics(s){const beh=breakEvenHour();const obj=(+state.obiettivo||55)/100;const net=(+s.p||0)/ivaF();const netPromo=net*(1-(+s.promo||0)/100);const dur=+s.d||0;const quotaFissa=beh*(dur/60);const utileSeduta=netPromo-quotaFissa;const margPct=netPromo>0?utileSeduta/netPromo*100:-999;let st;if(margPct<0)st="r";else if(margPct<obj*100)st="a";else st="g";const consNet=(1-obj)>0?quotaFissa/(1-obj):0;const consGrossPieno=consNet*ivaF()/ (1-(+s.promo||0)/100||1);return {net,netPromo,utileSeduta,margPct,st,quotaFissa,beh,consGrossPieno,obj};}
  function ceilingMo(s){const c=cap();const ab=(+s.ab>0)?Math.min(+s.ab,c.parallel):c.parallel;const d=+s.d||0;return d>0?ab*c.perStationProdHmo*60/d:0;}

  function rebalance(){const locked=services.filter(s=>s.lock),unlocked=services.filter(s=>!s.lock);let sumLocked=locked.reduce((a,s)=>a+(+s.share||0),0);if(unlocked.length===0)return;let rem=100-sumLocked;if(rem<0)rem=0;const sumUn=unlocked.reduce((a,s)=>a+(+s.share||0),0);if(sumUn>0)unlocked.forEach(s=>s.share=(+s.share||0)*rem/sumUn);else unlocked.forEach(s=>s.share=rem/unlocked.length);}
  function redistribute(idx,val){services[idx].share=Math.max(0,Math.min(100,val));services[idx].lock=true;rebalance();}
  function toggleLock(idx){services[idx].lock=!services[idx].lock;rebalance();renderRows();recompute();}
  function sbloccaTutte(){services.forEach(s=>s.lock=false);rebalance();renderRows();recompute();}

  function renderVoci(){const g=document.getElementById("voci");g.innerHTML="";const ord=state.regime==="ord";voci.forEach((v,i)=>{const d=document.createElement("div");d.className="row";const ivaSel=ord?'<select class="ws" data-i="'+i+'" data-k="iva" title="IVA">'+[0,4,10,22].map(a=>'<option value="'+a+'"'+((+v.iva||0)===a?" selected":"")+'>'+a+'%</option>').join("")+'</select>':'';d.innerHTML='<input class="nm" type="text" value="'+(v.l||"").replace(/"/g,'&quot;')+'" data-i="'+i+'" data-k="l"><div class="cur"><input class="wm" type="number" min="0" value="'+v.v+'" data-i="'+i+'" data-k="v"></div><select class="wper" data-i="'+i+'" data-k="per"><option value="mese"'+(v.per==="mese"?" selected":"")+'>mese</option><option value="anno"'+(v.per==="anno"?" selected":"")+'>anno</option></select>'+ivaSel+'<button class="x" data-del="'+i+'">✕</button>';g.appendChild(d);});g.querySelectorAll("input,select").forEach(el=>el.addEventListener("input",e=>{voci[+e.target.dataset.i][e.target.dataset.k]=e.target.value;recompute();}));g.querySelectorAll("button[data-del]").forEach(b=>b.addEventListener("click",e=>delVoce(+e.currentTarget.dataset.del)));}

  function renderOperatori(){const g=document.getElementById("operatori");if(!g)return;g.innerHTML="";operatori.forEach((o,i)=>{const d=document.createElement("div");d.className="row";d.innerHTML='<input class="nm" type="text" value="'+(o.n||"").replace(/"/g,'&quot;')+'" placeholder="Nome" data-i="'+i+'" data-k="n"><input class="ws" type="number" min="0" value="'+(o.h||0)+'" data-i="'+i+'" data-k="h"><span class="hint">h/sett</span><button class="x" data-del="'+i+'">✕</button>';g.appendChild(d);});g.querySelectorAll("input").forEach(el=>el.addEventListener("input",e=>{operatori[+e.target.dataset.i][e.target.dataset.k]=e.target.value;recompute();}));g.querySelectorAll("button[data-del]").forEach(b=>b.addEventListener("click",e=>delOperatore(+e.currentTarget.dataset.del)));}

  function renderRows(){const perc=state.volmode==="perc";const tb=document.getElementById("rows");tb.innerHTML="";services.forEach((s,i)=>{const volCell=perc?'<input class="wxs" type="number" min="0" max="100" value="'+(Math.round((+s.share||0)*10)/10)+'" data-i="'+i+'" data-k="share"><button class="lk" data-lock="'+i+'" title="Blocca">'+(s.lock?"🔒":"🔓")+'</button>':'<input class="wxs" type="number" min="0" value="'+(s.volte||0)+'" data-i="'+i+'" data-k="volte">';const tr=document.createElement("tr");tr.innerHTML='<td class="nm"><input type="text" style="width:180px" value="'+(s.n||"").replace(/"/g,'&quot;')+'" data-i="'+i+'" data-k="n"></td>'+'<td><input class="wxs" type="number" min="0" value="'+s.p+'" data-i="'+i+'" data-k="p"></td>'+'<td><input class="wxs" type="number" min="0" value="'+s.d+'" data-i="'+i+'" data-k="d"></td>'+'<td><input class="wxs" type="number" min="0" placeholder="tutte" value="'+(s.ab||"")+'" data-i="'+i+'" data-k="ab"></td>'+'<td>'+volCell+'</td>'+'<td><input class="wxs" type="number" min="0" max="90" value="'+(s.promo||0)+'" data-i="'+i+'" data-k="promo"></td>'+'<td class="mval" id="q'+i+'" style="color:var(--muted)">—</td><td class="mval" id="u'+i+'">—</td><td id="s'+i+'">—</td>'+'<td><button class="x" onclick="delRow('+i+')">✕</button></td>';tb.appendChild(tr);});
    tb.querySelectorAll("input").forEach(inp=>{const k=inp.dataset.k;if(k==="share"){inp.addEventListener("change",e=>{redistribute(+e.target.dataset.i,+e.target.value||0);renderRows();recompute();});}else{inp.addEventListener("input",e=>{services[+e.target.dataset.i][k]=e.target.value;recompute();});}});
    tb.querySelectorAll("button[data-lock]").forEach(b=>b.addEventListener("click",e=>toggleLock(+e.currentTarget.dataset.lock)));}

  // AGGIUNTA (21/09/2026, task #220): testo del tooltip "?" sulla tile
  // "Margine/mese" del banco Prezzo giusto — riusato qui perché tile() è
  // condivisa anche da recompute()/computeBanco(), non solo dalle label statiche.
  const QTIP_MARGINE='<span class="qtip" tabindex="0">?<span class="qtip-pop">Quanto ti resterebbe in un mese da questo servizio, ai clienti/mese che hai indicato sopra, al netto dei costi del negozio che quel servizio si porta via col suo tempo. È una proiezione basata sui numeri di oggi, non un incasso già garantito.</span></span>';
  function tile(k,v,col){return '<div class="tile"><div class="k">'+k+'</div><div class="v"'+(col?' style="color:'+col+'"':'')+'>'+v+'</div></div>';}
  function syncToggles(){document.querySelectorAll("#regtoggle button").forEach(b=>b.classList.toggle("on",b.dataset.v===state.regime));document.querySelectorAll("#voltoggle button").forEach(b=>b.classList.toggle("on",b.dataset.v===state.volmode));document.getElementById("ivabox").style.display=state.regime==="ord"?"":"none";document.getElementById("volhead").textContent=state.volmode==="perc"?"%":"Volte/m";const fb=document.getElementById("fattbox");if(fb)fb.style.display=state.volmode==="perc"?"":"none";document.getElementById("volhint").textContent=state.volmode==="perc"?"Quanto pesa ogni servizio sul totale (sempre 100%). Il fatturato viene diviso tra i servizi.":"Quante volte al mese fai ogni servizio (0 se non lo sai).";}

  function recompute(){
    syncToggles();const c=cap();const beh=breakEvenHour();const gg=+state.giorni||24;
    // FIX (21/09/2026, task #220): prima qui si mostrava fixedMese() (il
    // totale LORDO delle spese, IVA inclusa — le voci si inseriscono "come
    // le paghi", quindi già IVA inclusa) SENZA dirlo, mentre tutto il resto
    // del tool (breakEvenHour(), quindi ogni verdetto "regge/frena" nelle
    // schede Prezzo giusto e Listino) usa fixedNetMese() — il NETTO. Il
    // risultato era che il numero mostrato qui in negozio e il numero che
    // decide davvero se un servizio è in perdita erano due cifre diverse,
    // mai spiegate, mai riconciliate: esattamente la confusione lordo/netto
    // segnalata da Mason. Ora la cifra PRINCIPALE è il netto (coerente con
    // tutto il resto del tool), con l'equivalente IVA inclusa mostrato
    // accanto, più piccolo — così una titolare non pensa "ho incassato 600€
    // lordi oggi, coprono le mie spese nette di 600€/giorno" quando in
    // realtà una fetta di quei 600€ è IVA da versare, non margine.
    const costOraNet=c.billMo>0?fixedNetMese()/c.billMo:0;
    const costOraGross=c.billMo>0?fixedMese()/c.billMo:0;
    const totMeseNet=fixedNetMese(),totMeseGross=fixedMese();
    const speseDayNet=totMeseNet/gg,speseDayGross=totMeseGross/gg;
    const ordConIva=state.regime==="ord";
    document.getElementById("hourly").textContent=eur0(costOraNet);
    document.getElementById("totmese").textContent=eur0(totMeseNet);
    document.getElementById("speseday").textContent=eur0(speseDayNet);
    document.getElementById("oreprod").textContent=Math.round(c.billMo)+" h";
    {const el=document.getElementById("totmese-iva");if(el)el.textContent=ordConIva?("IVA inclusa: "+eur0(totMeseGross)):"";}
    {const el=document.getElementById("speseday-iva");if(el)el.textContent=ordConIva?("IVA inclusa: "+eur0(speseDayGross)):"";}
    {const el=document.getElementById("hourly-iva");if(el)el.textContent=ordConIva?("IVA inclusa: "+eur0(costOraGross)):"";}
    {const el=document.getElementById("ivaNote");if(el)el.textContent=ordConIva?"I valori grandi sono al netto IVA (quello che ti resta davvero, la base su cui il tool calcola se un servizio regge). Sotto, più piccolo, trovi il corrispondente importo con IVA inclusa — è più alto perché include l'IVA che devi comunque versare, non è margine in più.":"";}
    {const cs=document.getElementById("costsentence");if(cs)cs.innerHTML="Il tuo negozio ti costa <b>"+eur0(totMeseNet)+"/mese</b> · <b>"+eur0(speseDayNet)+"/giorno</b> · <b>"+eur0(costOraNet)+"/ora</b> <span style='font-weight:400;font-size:12px;color:var(--muted)'>(al netto IVA)</span>";}
    const bn=document.getElementById("bottleneck");const sh=Math.round(c.stationWk),lh=Math.round(c.laborEff);
    if(c.parallel<=0){bn.className="msg a";bn.innerHTML="Aggiungi postazioni e operatrici.";}
    else{const diff=Math.abs(sh-lh)/Math.max(sh,lh,1);
      if(diff<0.08){bn.className="msg g";bn.innerHTML="In equilibrio: postazioni <b>"+sh+" h/sett</b>, personale <b>"+lh+" h/sett</b> (ferie tolte).";}
      else if(lh<sh){bn.className="msg a";bn.innerHTML="Conta il <b>personale</b>: <b>"+lh+" h/sett</b> effettive (ferie tolte) contro <b>"+sh+" h/sett</b> di postazioni. Più ore di lavoro alzano la capacità, altre postazioni no.";}
      else{bn.className="msg a";bn.innerHTML="Contano le <b>postazioni</b>: <b>"+sh+" h/sett</b> contro <b>"+lh+" h/sett</b> di personale. Servono più postazioni.";}}

    if(state.volmode==="perc")rebalance();
    let totNetRev=0,totGrossRev=0,usedH=0;const problems=[];
    services.forEach((s,i)=>{const m=metrics(s),n=count(s);const qc=document.getElementById("q"+i),uc=document.getElementById("u"+i),sc=document.getElementById("s"+i);if(qc)qc.textContent=(+s.p>0)?Math.round(n):"—";if(uc){uc.textContent=(+s.p>0)?eur(m.utileSeduta):"—";uc.style.color=m.utileSeduta<0?"var(--red)":"var(--green)";}if(sc){const lbl=({g:"Traina",a:"Regge",r:"Frena"})[m.st];sc.innerHTML='<span class="stato '+m.st+'">'+lbl+'</span>';}totNetRev+=m.netPromo*n;totGrossRev+=((+s.p||0)*(1-(+s.promo||0)/100))*n;usedH+=(+s.d||0)/60*n;if(m.st!=="g"&&+s.p>0)problems.push({s,m,n});});
    const tot=services.filter(s=>+s.p>0).length;const F=fixedNetMese();const realProfit=totNetRev-F;const usec=c.billMo>0?Math.round(usedH/c.billMo*100):0;
    const ivaDeb=state.regime==="ord"?(totGrossRev-totNetRev):0,ivaCred=ivaCreditoMese(),ivaNetta=ivaDeb-ivaCred;
    const sb=document.getElementById("sharebar");if(sb)sb.innerHTML=state.volmode==="perc"?("Totale: <b>"+Math.round(services.reduce((a,x)=>a+(+x.share||0),0))+"%</b>"):"";
    const proj=isProiezione();let verdict,vc="";
    if(!tot)verdict="Aggiungi qualche servizio.";
    else if(realProfit<0){verdict=(proj?"Proiezione: chiuderebbe in perdita di ":"Chiude in perdita di ")+eur0(-realProfit);vc="r";}
    else{verdict=(proj?"Proiezione: attivo di ":"Chiude in attivo di ")+eur0(realProfit);vc="g";}
    let html='<div class="verdict" style="color:'+(vc==="g"?"var(--green)":vc==="r"?"var(--red)":"inherit")+'">'+verdict+'</div>';
    html+='<div class="tiles">'+tile("Bilancio/mese",eur0(realProfit),realProfit<0?"var(--red)":"var(--green)")+tile("Incassi netti/mese",eur0(totNetRev))+tile("Costi netti/mese",eur0(F))+tile("Capacità usata",usec+"%",usec>100?"var(--red)":"")+'</div>';
    if(tot){const cur=services.reduce((a,s)=>a+(+s.p>0?count(s):0),0);if(totNetRev>0){const beC=Math.round(cur*F/totNetRev);if(totNetRev<F)html+='<div class="msg a">👥 Per coprire i costi servono ~<b>'+beC+' clienti al mese</b> (~'+Math.round(beC/gg)+' al giorno). Adesso ne '+(proj?"prevedi":"fai")+' ~'+Math.round(cur)+': ne mancano ~'+(beC-Math.round(cur))+'.</div>';else html+='<div class="msg g">👥 Copri i costi già a ~<b>'+beC+' clienti al mese</b>. Tu ne '+(proj?"prevedi":"fai")+' ~'+Math.round(cur)+': un margine di sicurezza di ~'+(Math.round(cur)-beC)+' clienti.</div>';}}
    if(tot&&!proj&&usec>100){const accorcia=Math.round((1-c.billMo/usedH)*100),alzaP=Math.round((usedH/c.billMo-1)*100);html+='<div class="msg r">⚠️ Ti servono ~<b>'+Math.round(usedH)+' ore di lavoro al mese</b>, ma ne hai ~'+Math.round(c.billMo)+'. Per starci puoi: aggiungere personale, oppure accorciare le durate del '+accorcia+'%, oppure alzare i prezzi del '+alzaP+'%.</div>';}
    if(state.regime==="ord"&&tot)html+='<div class="msg" style="color:var(--muted)">IVA da versare ~<b>'+eur0(ivaNetta)+'</b>/mese (già compensata nel bilancio).</div>';
    if(problems.length){problems.sort((a,b)=>a.m.utileSeduta-b.m.utileSeduta);const worst=problems.slice(0,3).map(pr=>{const s=pr.s,m=pr.m;if(m.utileSeduta<0)return '<b>'+(s.n||"?")+'</b> perde '+eur(-m.utileSeduta)+'/cli. (min. '+eur0(m.consGrossPieno)+')';return '<b>'+(s.n||"?")+'</b> '+eur(m.utileSeduta)+'/cli.';}).join(" · ");html+='<div class="msg a">Da rivedere: '+worst+'.</div>';}
    document.getElementById("summary").innerHTML=html;computeBanco();renderVetrinaPrint();persist();
  }

  function computeBanco(){const out=document.getElementById("bancoOut");if(!out)return;const nome=(state.bNome||"").trim(),p=+state.bPrezzo||0,d=+state.bDurata||0,R=+state.bClienti||0;const beh=breakEvenHour(),c=cap(),gg=+state.giorni||24;const net=p/ivaF();const quota=beh*(d/60);const utileCli=net-quota;const pMin=quota*ivaF();const M=d>0?Math.floor(c.billMo/(d/60)):0;
    if(p<=0||d<=0){out.innerHTML='<div class="msg">Inserisci prezzo e durata.</div>';return;}
    const obj=(+state.obiettivo||55)/100;const margPct=net>0?Math.round(utileCli/net*100):0;
    const scontoSafe=(net>0&&(1-obj)>0)?Math.max(0,Math.floor((1-quota/((1-obj)*net))*100)):0;
    const scontoLoss=net>0?Math.max(0,Math.floor((1-quota/net)*100)):0;
    let h='<div class="tiles">'+tile("Utile / cliente",eur(utileCli),utileCli<0?"var(--red)":"var(--green)")+tile("Sconto sicuro",scontoSafe+"%")+tile("Capacità max/mese",M)+(R>0?tile("Margine/mese ("+R+")"+QTIP_MARGINE,eur0(utileCli*R),utileCli<0?"var(--red)":"var(--green)"):"")+'</div>';
    if(utileCli<0){const dMax=beh>0?Math.floor(net/beh*60):0;h+='<div class="msg r">A <b>'+eur0(p)+'</b> ci perdi <b>'+eur(-utileCli)+'</b> a cliente: sei sotto costo, nessuno sconto è possibile. Sali ad almeno <b>'+eur0(pMin)+'</b> o accorcia a ~<b>'+dMax+' min</b>.</div>';}
    else{h+='<div class="msg g">Da ogni prestazione ricavi un utile di <b>'+eur(utileCli)+'</b> (margine '+margPct+'%). Puoi scontare <b>fino al '+scontoSafe+'%</b> restando sul tuo obiettivo; oltre intacchi il margine, sopra il <b>'+scontoLoss+'%</b> ci perdi. '+(R>0?('A '+R+' clienti/mese: <b>+'+eur0(utileCli*R)+'</b>'+(R>M?' — ⚠️ oltre la capacità ('+M+')':'')+'.'):'')+'</div>';}
    out.innerHTML=h;}

  function renderVetrina(){const g=document.getElementById("vetrinaEdit");if(!g)return;g.innerHTML="";if(!services.length){g.innerHTML='<p class="hint">Aggiungi servizi nel Listino, poi torna qui per dar loro nome e descrizione.</p>';return;}services.forEach((s,i)=>{const d=document.createElement("div");d.className="card";d.style.margin="8px 0";d.innerHTML='<div class="row"><input class="nm" type="text" value="'+esc(s.n).replace(/"/g,"&quot;")+'" placeholder="Nome evocativo" data-i="'+i+'" data-k="n"><div class="cur"><input class="wm" type="number" min="0" value="'+(s.p||0)+'" data-i="'+i+'" data-k="p"></div></div><textarea data-i="'+i+'" data-k="descr" placeholder="Descrizione: cosa rende speciale questo servizio (massaggio, oli, rituale…)" style="font-family:inherit;font-size:13px;line-height:1.45;margin-top:7px;min-height:54px">'+esc(s.descr)+'</textarea>';g.appendChild(d);});g.querySelectorAll("input,textarea").forEach(el=>el.addEventListener("input",e=>{const k=e.target.dataset.k;services[+e.target.dataset.i][k]=e.target.value;renderVetrinaPrint();if(k==="descr")persist();else recompute();}));}
  function renderVetrinaPrint(){const el=document.getElementById("vetrina-print");if(!el)return;const lg=document.querySelector(".banner .logo");const logo=lg?lg.src:"";const nome=(state.centroNome||"").trim()||"Il tuo Centro Estetico";const sub=(state.centroSub||"").trim();let h='<div class="vp-head">'+(logo?'<img class="vp-logo" src="'+logo+'">':'')+'<div class="vp-title">'+esc(nome)+'</div>'+(sub?'<div class="vp-sub">'+esc(sub)+'</div>':'')+'</div><div class="vp-rule"></div>';services.forEach(s=>{if(+s.p<=0||!String(s.n||"").trim())return;h+='<div class="vp-item"><div class="vp-l"><div class="vp-name">'+esc(s.n)+'</div>'+(String(s.descr||"").trim()?'<div class="vp-desc">'+esc(s.descr)+'</div>':'')+'</div><div class="vp-price">'+eur0(+s.p)+'</div></div>';});h+='<div class="vp-foot">Un progetto beautyx · Svetage S.r.l.</div>';el.innerHTML=h;}
  function printVetrina(){renderVetrinaPrint();window.print();}

  function addBancoToListino(evt){const nome=(state.bNome||"").trim()||"Nuovo servizio";services.push({n:nome,p:+state.bPrezzo||0,d:+state.bDurata||30,ab:"",share:0,volte:+state.bClienti||0,promo:0,descr:""});if(state.volmode==="perc")rebalance();renderRows();recompute();const b=evt&&evt.target;if(b){const old=b.textContent;b.textContent="✓ Aggiunto";setTimeout(()=>b.textContent=old,1600);}}
  function persist(){try{localStorage.setItem(dk,JSON.stringify({voci,services,state,operatori}));}catch(e){}genCode();}
  function addVoce(){voci.push({l:"Nuova voce",v:0,per:"mese",iva:22});renderVoci();recompute();}
  function delVoce(i){voci.splice(i,1);renderVoci();recompute();}
  function addOperatore(){operatori.push({n:"",h:0});renderOperatori();recompute();}
  function delOperatore(i){operatori.splice(i,1);renderOperatori();recompute();}
  function addRow(){services.push({n:"",p:0,d:30,ab:"",share:0,volte:0,promo:0,descr:""});if(state.volmode==="perc")rebalance();renderRows();recompute();}
  function delRow(i){services.splice(i,1);if(state.volmode==="perc")rebalance();renderRows();recompute();}
  function resetDemo(){services=DEMO.map(x=>({...x}));renderRows();recompute();}
  function printList(){window.print();}
  function copiaExcel(evt){const eu=n=>(Math.round(n*100)/100).toFixed(2).replace(".",",");const H=["Servizio","Prezzo","Durata (min)","Post. abilitate",(state.volmode==="perc"?"% attività":"Volte/mese"),"Promo %","Sedute/mese","Utile/cliente €","Stato"];const rows=[H];services.forEach(s=>{const m=metrics(s),n=count(s);const st=({g:"Traina",a:"Regge",r:"Frena"})[m.st];rows.push([(s.n||""),(+s.p||0),(+s.d||0),(s.ab||"tutte"),(state.volmode==="perc"?Math.round(+s.share||0)+"%":(+s.volte||0)),(+s.promo||0),Math.round(n),(+s.p>0?eu(m.utileSeduta):""),st]);});const F=fixedNetMese();let totNet=0;services.forEach(s=>{totNet+=metrics(s).netPromo*count(s);});rows.push([]);rows.push(["Incassi netti/mese",Math.round(totNet)]);rows.push(["Costi netti/mese",Math.round(F)]);rows.push(["Bilancio/mese",Math.round(totNet-F)]);const tsv=rows.map(r=>r.join("\\t")).join("\\n");const ta=document.createElement("textarea");ta.value=tsv;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.focus();ta.select();let ok=false;try{ok=document.execCommand("copy");}catch(e){}try{if(navigator.clipboard)navigator.clipboard.writeText(tsv);}catch(e){}document.body.removeChild(ta);const b=evt&&evt.target;if(b){const old=b.textContent;b.textContent="✓ Copiato — incolla in Excel";setTimeout(()=>b.textContent=old,2200);}}
  function genCode(){let code="";try{code=btoa(unescape(encodeURIComponent(JSON.stringify({voci,services,state,operatori}))));}catch(e){}const t=document.getElementById("expcode");if(t&&document.activeElement!==t)t.value=code;return code;}
  function copyCode(){const t=document.getElementById("expcode");genCode();t.focus();t.select();try{t.setSelectionRange(0,t.value.length);}catch(e){}let ok=false;try{ok=document.execCommand("copy");}catch(e){}const b=document.getElementById("copybtn");const done=g=>{if(!b)return;b.textContent=g?"Copiato ✓":"Selezionato — Ctrl/Cmd+C";setTimeout(()=>b.textContent="Copia il codice",2600);};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t.value).then(()=>done(true)).catch(()=>done(ok));}else done(ok);}
  function restoreCode(){const el=document.getElementById("impcode"),msg=document.getElementById("impmsg");const v=(el.value||"").trim();if(!v){msg.textContent="Incolla un codice.";return;}try{const o=JSON.parse(decodeURIComponent(escape(atob(v))));if(o&&o.voci&&o.services&&o.state){voci=o.voci;voci.forEach(v=>{if(v.iva===undefined)v.iva=0;});if(o.state.prodannua&&!voci.some(v=>/prodotti/i.test(v.l||"")))voci.push({l:"Prodotti (acquisto annuo)",v:+o.state.prodannua,per:"anno",iva:22});services=o.services;state=Object.assign(state,o.state);if(o.operatori)operatori=o.operatori;renderVoci();renderOperatori();renderRows();["oresett","fill","postazioni","ferie","giorni","obiettivo","fatturato","iva","bNome","bPrezzo","bDurata","bClienti","centroNome","centroSub"].forEach(id=>{const e=document.getElementById(id);if(e)e.value=state[id];});recompute();msg.textContent="Ripristinati ✓ — "+voci.length+" voci, "+services.length+" servizi.";msg.style.color="var(--green)";}else{msg.textContent="Codice non valido.";msg.style.color="var(--red)";}}catch(e){msg.textContent="Codice incompleto o danneggiato.";msg.style.color="var(--red)";}}

  ["oresett","fill","postazioni","ferie","giorni","obiettivo","fatturato","iva","bNome","bPrezzo","bDurata","bClienti","centroNome","centroSub"].forEach(id=>{const e=document.getElementById(id);if(e){e.value=state[id];e.addEventListener("input",ev=>{state[id]=ev.target.value;recompute();});}});
  document.querySelectorAll("#regtoggle button").forEach(b=>b.addEventListener("click",()=>{state.regime=b.dataset.v;renderVoci();recompute();}));
  document.querySelectorAll("#voltoggle button").forEach(b=>b.addEventListener("click",()=>{state.volmode=b.dataset.v;if(state.volmode==="perc")rebalance();renderRows();recompute();}));
  let t0="negozio";try{t0=localStorage.getItem('bx_tab')||"negozio";}catch(e){}
  renderVoci();renderOperatori();renderRows();recompute();showTab(t0);
  renderThemes();let _th="bosco";try{_th=localStorage.getItem("bx_theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"notte":"bosco");}catch(e){}setTheme(_th);

  // Espone le funzioni globali richiamate dagli attributi onclick="" nel markup
  // (il markup arriva via dangerouslySetInnerHTML: senza questo, i browser
  // moderni comunque risolvono onclick="funzione()" cercando "funzione" in
  // window, ma le function declaration qui sopra sono già scope-locali allo
  // script — le riesponiamo esplicitamente su window per sicurezza).
  window.showTab=showTab;window.setTheme=setTheme;window.addVoce=addVoce;window.delVoce=delVoce;
  window.addOperatore=addOperatore;window.delOperatore=delOperatore;window.addRow=addRow;window.delRow=delRow;
  window.toggleLock=toggleLock;window.sbloccaTutte=sbloccaTutte;window.resetDemo=resetDemo;window.printList=printList;
  window.copiaExcel=copiaExcel;window.printVetrina=printVetrina;window.addBancoToListino=addBancoToListino;
  window.copyCode=copyCode;window.restoreCode=restoreCode;

  // AGGIUNTA (21/09/2026, task #220): tap/click su un'icona "?" apre/chiude
  // il suo popup di spiegazione (necessario sui touch screen, dove :hover
  // non esiste) — un click altrove chiude tutti i popup aperti.
  document.querySelectorAll('#bx-listino-root .qtip').forEach(function(q){
    q.addEventListener('click', function(e){
      e.stopPropagation();
      const wasOpen = q.classList.contains('open');
      document.querySelectorAll('#bx-listino-root .qtip.open').forEach(function(o){ o.classList.remove('open'); });
      if (!wasOpen) q.classList.add('open');
    });
  });
  document.addEventListener('click', function(){
    document.querySelectorAll('#bx-listino-root .qtip.open').forEach(function(o){ o.classList.remove('open'); });
  });

  // ---- AGGIUNTA gating: lucchetto visivo sulle tab gated + segnale a React
  // per il CTA "dopo il primo uso" verso /newsletter (si accende al primo
  // click reale su una tab, non sullo showTab('negozio') programmato all'avvio).
  if (__BX_GATE_FULL) {
    __BX_GATED_TABS.forEach(function(tab){
      var btn = document.querySelector('.tabbar button[data-tab="'+tab+'"]');
      if (btn && !btn.dataset.bxLocked) { btn.textContent = btn.textContent + ' 🔒'; btn.dataset.bxLocked = '1'; }
    });
  }
  document.querySelectorAll('.tabbar button').forEach(function(b){
    b.addEventListener('click', function(){
      if (window.__bxShowNewsletterCta) window.__bxShowNewsletterCta();
    });
  });
})();
`
}

// Il tool vero e proprio — montato SOLO per un utente autenticato (vedi
// ListinoPage sotto, che fa da gate). Invariato rispetto a prima salvo il
// rename da ListinoPage a ListinoTool.
function ListinoTool() {
  const containerRef = useRef(null)
  const scriptElRef = useRef(null)
  const [showNewsletterCta, setShowNewsletterCta] = useState(false)

  // Stessa finestra dei 90gg dell'Identikit CURA (lib/report/freeWindow.js,
  // env var NEXT_PUBLIC_REPORT_LAUNCH_DATE) — nessuna nuova data di lancio.
  const isFree = isWithinReportFreeWindow()

  useEffect(() => {
    window.__bxShowNewsletterCta = () => setShowNewsletterCta(true)
    return () => {
      if (window.__bxShowNewsletterCta) delete window.__bxShowNewsletterCta
    }
  }, [])

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.text = buildToolScript(isFree)
    document.body.appendChild(script)
    scriptElRef.current = script
    return () => {
      if (scriptElRef.current && scriptElRef.current.parentNode) {
        scriptElRef.current.parentNode.removeChild(scriptElRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFree])

  return (
    <div id="bx-listino-root" className={`${fraunces.variable} ${figtree.variable}`}>
      <style>{TOOL_CSS}</style>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: TOOL_HTML }} />

      {showNewsletterCta && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            background: 'linear-gradient(90deg, #FFE44D 0%, #EC4899 100%)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            flexWrap: 'wrap',
            boxShadow: '0 -4px 14px rgba(0,0,0,0.15)',
          }}
          role="note"
        >
          <span style={{ fontWeight: 800, color: '#1a1a0f', fontSize: 14, textAlign: 'center' }}>
            Il Listino intelligente è uno dei 4 strumenti gratuiti di beautyx.
          </span>
          <Link
            href="/newsletter"
            style={{
              background: '#1a1a0f',
              color: '#FFE44D',
              fontWeight: 800,
              padding: '9px 18px',
              borderRadius: 999,
              textDecoration: 'none',
              fontSize: 14,
              whiteSpace: 'nowrap',
            }}
          >
            Scopri beautyx →
          </Link>
          <button
            onClick={() => setShowNewsletterCta(false)}
            aria-label="Chiudi"
            style={{ background: 'none', border: 'none', color: '#1a1a0f', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 4 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ===================================================================
// WALL per visitatori anonimi (nuovo, 20/09/2026 — task #206): stesso
// principio già in uso su /report per indirizzare alla registrazione
// unificata — nessun accesso libero al tool. Stile coerente col resto
// dell'ecosistema (sfondo #f5f1ea, Playfair per i titoli), non il tema
// del tool stesso (che si vede solo dopo il login).
// ===================================================================
function ListinoWall() {
  return (
    <div style={{
      background: '#f5f1ea',
      minHeight: '100vh',
      fontFamily: "var(--font-inter), system-ui, sans-serif",
      color: '#1a1a0f',
    }}>
      <header style={{ paddingTop: '28px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
        <Image src="/logo_beautyx-oro.png" alt="Beautyx" width={26} height={28} style={{ borderRadius: '4px' }} />
        <span style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a0f', letterSpacing: '0.01em' }}>Beautyx</span>
      </header>

      <section style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px 0', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: '#0F6E56', color: '#fff', fontWeight: 700, fontSize: '11px',
          letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 14px',
          borderRadius: '100px', marginBottom: '28px',
        }}>
          Listino intelligente · 90 giorni gratis
        </div>

        <h1 style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 900, lineHeight: 1.15, marginBottom: '20px',
        }}>
          Margini e costo orario, a colpo d&apos;occhio.
        </h1>

        <p style={{ fontSize: 'clamp(15px, 3vw, 17px)', color: '#444', lineHeight: 1.7, marginBottom: '32px' }}>
          Per usare il Listino intelligente serve un account gratuito — lo
          stesso che usi per l&apos;Identikit strategico CURA, con i dati del
          tuo centro. Bastano due minuti: 90 giorni gratis, poi 29€ una tantum.
        </p>

        <div style={{ marginBottom: '14px' }}>
          <Link
            href="/signup?risorsa=tool"
            style={{
              display: 'inline-block', padding: '18px 36px', background: '#0F6E56', color: '#fff',
              fontWeight: 700, fontSize: '16px', borderRadius: '12px', textDecoration: 'none',
            }}
          >
            Crea il tuo account gratuito →
          </Link>
        </div>

        <p style={{ fontSize: '13px', color: '#888', marginBottom: '40px' }}>
          Hai già un account?{' '}
          <Link href="/login" style={{ color: '#0F6E56', fontWeight: 600, textDecoration: 'none' }}>
            Accedi
          </Link>
        </p>
      </section>

      <footer style={{ borderTop: '1px solid #e0dbd3', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#bbb' }}>
          © {new Date().getFullYear()} Beautyx ·{' '}
          <Link href="/privacy" style={{ color: '#bbb', textDecoration: 'none' }}>Privacy</Link>
        </p>
      </footer>
    </div>
  )
}

// Gate di accesso (nuovo, 20/09/2026): un visitatore anonimo vede il wall
// sopra, non il tool — stesso principio già in uso su /report per
// indirizzare alla registrazione unificata (non un accesso libero, corretto
// rispetto alla prima stesura del 19-20/09/2026 che lo rendeva utilizzabile
// senza account, vedi task #206 in memory/generale.md).
export default function ListinoPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f1ea' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #0F6E56', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    )
  }

  if (!user) {
    return <ListinoWall />
  }

  return <ListinoTool />
}
