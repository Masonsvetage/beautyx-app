# Template email Supabase — Confirm signup & Reset Password

Testi pronti da incollare a mano in Supabase Dashboard → Authentication → Email
Templates. Sostituiscono i template di default (inglesi, anonimi). Contengono
`{{ .ConfirmationURL }}` come da vincolo tecnico Supabase — non toccare questa
variabile, non aggiungerne altre. Voce Beautyx: informale, calda, mai
burocratica (vedi `memory/voce-beautyx.md`).

Scritti da Federica, copywriter Beautyx — 2026-09-05. Non passati dal gate
riga-per-riga di Elena (urgenza operativa, email transazionali brevi e a
basso rischio di voce, come da indicazione di Mason).

---

## 1. Confirm signup

**Contesto:** l'utente si è appena registrato con un account completo
Beautyx — oggi è sempre chi ha chiesto il report, ma la stessa registrazione
serve anche a chi in futuro si iscriverà direttamente alla piattaforma
(stesso form/account condiviso, per design). Il template non nomina un
prodotto/livello specifico, così va bene in entrambi i casi. Aggiornato da
Federica il 2026-09-05 dopo osservazione di Mason.

### Oggetto

```
Beautyx — conferma la tua email: si comincia
```

### Corpo HTML

```html
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f5f5f7; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <div style="display:none; font-size:1px; color:#f5f5f7; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
    Un click e sei dentro. Quello che hai appena iniziato con noi ti aspetta.
  </div>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f7; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg, #ec4899 0%, #9333ea 100%); padding:32px 40px; text-align:center;">
              <span style="font-size:24px; font-weight:700; color:#ffffff; letter-spacing:0.5px;">Beautyx</span>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              <p style="font-size:16px; color:#374151; line-height:1.7; margin:0 0 20px 0;">
                Ciao,
              </p>
              <p style="font-size:22px; font-weight:700; color:#1f2937; line-height:1.35; margin:0 0 20px 0;">
                Ci siamo quasi.
              </p>
              <p style="font-size:16px; color:#374151; line-height:1.8; margin:0 0 32px 0;">
                Hai appena iniziato qualcosa con noi — per andare avanti ci manca solo un ultimo passo: confermare che questa email è davvero tua.
              </p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 32px auto;">
                <tr>
                  <td align="center" style="border-radius:50px; background:linear-gradient(135deg, #ec4899 0%, #9333ea 100%);">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block; padding:16px 36px; font-size:16px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:50px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
                      Conferma la mia email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:15px; color:#374151; line-height:1.7; margin:0 0 4px 0;">
                Fatto questo, il resto è già pronto per te.
              </p>
              <p style="font-size:15px; font-weight:600; color:#1f2937; margin:0;">
                A tra poco — Beautyx
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 40px 32px 40px; text-align:center; border-top:1px solid #f0f0f0;">
              <p style="font-size:12px; color:#b0b0b0; margin:0; line-height:1.6;">
                Hai ricevuto questa email perché qualcuno (probabilmente tu) ha usato questo indirizzo per registrarsi su Beautyx.<br/>
                Se non sei stata tu, ignora pure questo messaggio.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Reset Password

**Contesto:** l'utente ha chiesto di reimpostare la password. Chi non ha
richiesto il reset deve capire subito che può ignorare l'email in sicurezza.

### Oggetto

```
Beautyx — reimposta la tua password
```

### Corpo HTML

```html
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f5f5f7; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <div style="display:none; font-size:1px; color:#f5f5f7; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
    Ecco il link per scegliere una nuova password. Se non sei stata tu, ignora pure questa email.
  </div>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f7; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg, #ec4899 0%, #9333ea 100%); padding:32px 40px; text-align:center;">
              <span style="font-size:24px; font-weight:700; color:#ffffff; letter-spacing:0.5px;">Beautyx</span>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              <p style="font-size:16px; color:#374151; line-height:1.7; margin:0 0 20px 0;">
                Ciao,
              </p>
              <p style="font-size:22px; font-weight:700; color:#1f2937; line-height:1.35; margin:0 0 20px 0;">
                Vuoi una nuova password? Eccoti il link.
              </p>
              <p style="font-size:16px; color:#374151; line-height:1.8; margin:0 0 32px 0;">
                Hai chiesto di reimpostare la password del tuo account Beautyx. Clicca qui sotto e in un attimo ne scegli una nuova.
              </p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 32px auto;">
                <tr>
                  <td align="center" style="border-radius:50px; background:linear-gradient(135deg, #ec4899 0%, #9333ea 100%);">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block; padding:16px 36px; font-size:16px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:50px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
                      Reimposta la password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:15px; color:#374151; line-height:1.7; margin:0 0 4px 0;">
                Non hai chiesto tu questo cambio? Nessun problema: ignora questa email, la tua password resta quella di sempre.
              </p>
              <p style="font-size:15px; font-weight:600; color:#1f2937; margin:16px 0 0 0;">
                Beautyx
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 40px 32px 40px; text-align:center; border-top:1px solid #f0f0f0;">
              <p style="font-size:12px; color:#b0b0b0; margin:0; line-height:1.6;">
                Per la tua sicurezza, questo link scade dopo un tempo limitato. Se è già scaduto, richiedi semplicemente un nuovo reset dalla pagina di accesso.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```
