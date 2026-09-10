# Gmailfy — sign-in page

The Connect page for **Gmailfy**, a Gmail widget for the Corsair XENEON EDGE.

The widget on the EDGE draws a QR code. Scanning it opens this page with a one-time
pairing secret in the URL fragment. After you approve with Google, this page encrypts
the resulting key under a value derived from that secret and posts the ciphertext to a
short-lived record, which the widget then claims and decrypts.

The secret travels only in the URL fragment, which browsers never send to a server, so
nothing in between — including whatever hosts that record — can read the key.

**There are no credentials in this repository.** The OAuth client id is served by, and
its secret never leaves, a Supabase Edge Function that performs the token exchange and
the hourly renewals on the page's behalf.

| Page | |
| :-- | :-- |
| [`index.html`](index.html) | the Connect page (also the OAuth redirect URI) |
| [`about.html`](about.html) | what Gmailfy is |
| [`privacy.html`](privacy.html) | privacy policy |
| [`terms.html`](terms.html) | terms of service |

Served at <https://qaemalmanasif.github.io/gmail-widget/>.
