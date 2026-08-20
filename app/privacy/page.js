import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'

export const metadata = {
  title: 'Privacy Policy — Beautyx',
  description: 'Come Beautyx tratta i tuoi dati personali.',
}

// Stesso cookie di accesso usato da /guida (vedi app/guida/page.js, ACCESS_COOKIE).
// Il link "Rileggi la guida" nel footer compare SOLO se il cookie è presente — euristica
// economica di sola visualizzazione, mai usata per decidere cosa mostrare dentro /guida
// (quella validazione vera, contro Supabase, resta interamente in app/guida/page.js).
// Pagina Server Component: si può leggere il cookie direttamente con cookies(), senza
// bisogno del componente client GuidaFooterLink usato altrove ('use client' pages).
const ACCESS_COOKIE = 'guida_access_token'

export default async function PrivacyPage() {
  const cookieStore = await cookies()
  const hasGuidaAccess = !!cookieStore.get(ACCESS_COOKIE)?.value

  return (
    <>
      <style>{`
        
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div style={{ background: '#f5f1ea', minHeight: '100vh', fontFamily: "var(--font-inter), system-ui, sans-serif", color: '#1a1a0f' }}>

        {/* NAV */}
        <header style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1100px', margin: '0 auto' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <Image src="/logo_beautyx-oro.png" alt="Beautyx" width={26} height={28} style={{ borderRadius: '4px' }} />
            <span style={{ fontWeight: 700, color: '#1a1a0f', fontSize: '15px' }}>Beautyx</span>
          </Link>
        </header>

        {/* CONTENUTO */}
        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 32px 96px' }}>

          <h1 style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 900,
            lineHeight: 1.15,
            color: '#1a1a0f',
            marginBottom: '12px',
          }}>
            Privacy Policy
          </h1>

          <p style={{ fontSize: '13px', color: '#999', marginBottom: '48px' }}>
            Ultimo aggiornamento: luglio 2026
          </p>

          <Section titolo="1. Chi siamo">
            Il titolare del trattamento dei dati personali è <strong>Svetage S.r.l.</strong> — P.IVA/C.F. 01959270495 · Via Toscana 6/8, 57128 Livorno (LI), Italia · REA LI 216353 · Capitale sociale 10.000 € interamente versato, la società che sviluppa il progetto Beautyx. Il referente e fondatore di Beautyx è <strong>Luigi Perri</strong>.
            Per qualsiasi questione relativa alla privacy puoi scriverci a{' '}
            <a href="mailto:privacy@beautyx.it" style={{ color: '#EC4899', textDecoration: 'none' }}>privacy@beautyx.it</a>.
          </Section>

          <Section titolo="2. Che dati raccogliamo">
            Quando ti iscrivi alla newsletter o interagisci con Beautyx, raccogliamo:
            <ul style={{ marginTop: '16px', paddingLeft: '20px', lineHeight: 2 }}>
              <li><strong>Email</strong> — obbligatoria per ricevere la newsletter</li>
              <li><strong>Nome</strong> — se lo fornisci volontariamente</li>
              <li><strong>Comportamento sulla newsletter</strong> — aperture, click, disiscrizioni (dati tecnici forniti da Beehiiv)</li>
              <li><strong>Domande al consulente</strong> — il testo che invii attraverso il form mensile</li>
              <li><strong>Dati sul tuo centro estetico</strong> — informazioni che scegli di condividere spontaneamente</li>
            </ul>
            <p style={{ marginTop: '16px' }}>Non raccogliamo dati sensibili, documenti d&apos;identità né informazioni di pagamento.</p>
          </Section>

          <Section titolo="3. Perché li usiamo">
            Usiamo i tuoi dati esclusivamente per:
            <ul style={{ marginTop: '16px', paddingLeft: '20px', lineHeight: 2 }}>
              <li>Inviare la newsletter Beautyx</li>
              <li>Personalizzare i contenuti in base al tuo profilo e al tuo centro</li>
              <li>Gestire la domanda mensile al consulente</li>
              <li>Sviluppare attività e comunicazioni mirate alla tua realtà</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              La base giuridica del trattamento è il <strong>consenso</strong> espresso al momento dell&apos;iscrizione
              (art. 6, par. 1, lett. a del GDPR). Puoi revocarlo in qualsiasi momento disiscrivendoti.
            </p>
          </Section>

          <Section titolo="4. Con chi li condividiamo">
            <p>Non vendiamo i tuoi dati a terzi e non li cediamo per finalità commerciali esterne.
            Li condividiamo esclusivamente con le piattaforme tecniche necessarie al funzionamento del servizio:</p>

            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#1a1a0f', color: '#fff' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Fornitore</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Ruolo</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Paese</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Garanzia</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Beehiiv', 'Invio e gestione newsletter', 'USA', 'SCC'],
                    ['Supabase', 'Database', 'USA', 'SCC'],
                    ['Vercel', 'Hosting del sito', 'USA', 'SCC'],
                  ].map(([f, r, p, g], i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#faf7f2', borderBottom: '1px solid #e8e2d8' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{f}</td>
                      <td style={{ padding: '12px 16px', color: '#555' }}>{r}</td>
                      <td style={{ padding: '12px 16px', color: '#555' }}>{p}</td>
                      <td style={{ padding: '12px 16px', color: '#555' }}>{g}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ marginTop: '16px', fontSize: '13px', color: '#666' }}>
              SCC = Standard Contractual Clauses (Clausole Contrattuali Standard UE), che garantiscono la protezione
              dei dati anche per i trasferimenti verso paesi extra-UE.
            </p>
          </Section>

          <Section titolo="5. Quanto li conserviamo">
            Conserviamo i tuoi dati per tutta la durata dell&apos;iscrizione e per i 12 mesi successivi alla
            cancellazione, salvo obblighi di legge che richiedano una conservazione più lunga.
          </Section>

          <Section titolo="6. I tuoi diritti">
            <p>In base agli articoli 15–22 del GDPR, hai il diritto di:</p>
            <ul style={{ marginTop: '16px', paddingLeft: '20px', lineHeight: 2 }}>
              <li><strong>Accedere</strong> ai tuoi dati</li>
              <li><strong>Rettificare</strong> dati inesatti o incompleti</li>
              <li><strong>Cancellare</strong> i tuoi dati (&ldquo;diritto all&apos;oblio&rdquo;)</li>
              <li><strong>Opporti</strong> al trattamento</li>
              <li><strong>Portabilità</strong> — ricevere i tuoi dati in formato leggibile</li>
              <li><strong>Revocare il consenso</strong> in qualsiasi momento</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              Hai anche il diritto di presentare reclamo al Garante per la Protezione dei Dati Personali
              (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" style={{ color: '#EC4899', textDecoration: 'none' }}>garanteprivacy.it</a>).
            </p>
          </Section>

          <Section titolo="7. Come esercitare i tuoi diritti">
            Scrivi a{' '}
            <a href="mailto:privacy@beautyx.it" style={{ color: '#EC4899', textDecoration: 'none' }}>privacy@beautyx.it</a>{' '}
            con oggetto <em>&ldquo;Privacy – richiesta&rdquo;</em>. Risponderemo entro 30 giorni.
          </Section>

          <Section titolo="8. Cookie">
            Questo sito utilizza esclusivamente cookie tecnici necessari al funzionamento delle pagine.
            Non utilizziamo cookie di profilazione o di tracciamento a fini pubblicitari.
          </Section>

          <p style={{ marginTop: '48px', fontSize: '13px', color: '#999', borderTop: '1px solid #ddd', paddingTop: '24px' }}>
            Questa pagina può essere aggiornata. In caso di modifiche sostanziali, ti avviseremo via newsletter.
          </p>

        </main>

        {/* FOOTER */}
        <footer style={{ borderTop: '1px solid #e0dbd3', padding: '20px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#bbb' }}>
            © {new Date().getFullYear()} Beautyx ·{' '}
            <Link href="/newsletter" style={{ color: '#bbb', textDecoration: 'none' }}>Newsletter</Link>
            {hasGuidaAccess && (
              <>
                {' · '}
                <Link href="/guida" style={{ color: '#bbb', textDecoration: 'none' }}>Rileggi la guida →</Link>
              </>
            )}
          </p>
          <p style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
            Beautyx è un progetto di Svetage S.r.l. — P.IVA/C.F. 01959270495 · Via Toscana 6/8, 57128 Livorno (LI), Italia · REA LI 216353 · Capitale sociale 10.000 € interamente versato
          </p>
        </footer>

      </div>
    </>
  )
}

function Section({ titolo, children }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{
        fontFamily: "var(--font-playfair), Georgia, serif",
        fontSize: 'clamp(16px, 2.2vw, 20px)',
        fontWeight: 700,
        color: '#1a1a0f',
        marginBottom: '14px',
        lineHeight: 1.3,
      }}>
        {titolo}
      </h2>
      <div style={{ fontSize: 'clamp(14px, 1.6vw, 16px)', color: '#555', lineHeight: 1.85 }}>
        {children}
      </div>
    </div>
  )
}
