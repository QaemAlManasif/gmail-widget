/**
 * Gmail Connect — your own sign-in script.
 *
 * This lives in YOUR Google account and does exactly one thing: when your
 * Gmail Connect widget shows it the secret it was given, it hands back a
 * one-hour key to your mailbox, so the widget can talk to Gmail directly.
 * It never reads, sends, stores or forwards any mail itself.
 *
 * Deploy it as a web app that runs as you and that anyone can reach
 * (appsscript.json already says so). "Anyone" is safe only because every
 * call has to carry the secret, and the secret is handed out once.
 *
 * Two things you can run from the toolbar (pick one next to Run):
 *   allowGmail   asks Google for the Gmail permission, if it is missing
 *   resetSecret  disconnects every widget using this script
 */

var SECRET = 'gmailConnectSecret';
var CONFIRMED = 'gmailConnectConfirmed';
var GMAIL = 'https://www.googleapis.com/auth/gmail.modify';

// First in the file on purpose: it is what the Run button runs by default.
function allowGmail() {
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  console.log('Gmail permission is on. Go back to the Gmail Connect page.');
}

function resetSecret() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(SECRET);
  props.deleteProperty(CONFIRMED);
  console.log('Done. Widgets using this script are disconnected. You can connect it again from the Gmail Connect page.');
}

function doPost(e) {
  var req = {};
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) {}
  var props = PropertiesService.getScriptProperties();

  // The secret is handed out once. Until a widget has actually used it, a
  // new claim replaces it, so a setup that went wrong can simply be tried
  // again; after that, every claim is refused. Either way, only you know
  // this script's address at that point.
  if (req.op === 'claim') {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (props.getProperty(SECRET) && props.getProperty(CONFIRMED)) return reply({ error: 'already_claimed' });
      var secret = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
      props.setProperty(SECRET, secret);
      props.deleteProperty(CONFIRMED);
      return reply({ key: secret });
    } finally {
      lock.releaseLock();
    }
  }

  var stored = props.getProperty(SECRET);
  if (!stored) return reply({ error: 'not_claimed' });
  if (!sameString(String(req.k || ''), stored)) return reply({ error: 'bad_key' });

  // The widget's Disconnect: forget the secret, so this connection is dead
  // everywhere it was ever copied.
  if (req.op === 'forget') {
    props.deleteProperty(SECRET);
    props.deleteProperty(CONFIRMED);
    return reply({ ok: true });
  }

  var missing = gmailPermission();
  if (missing) return reply({ error: missing });

  // A fresh access token for you, the owner, limited to the one permission
  // appsscript.json asks for. Reported as half an hour so the widget comes
  // back well before Google's hour is up.
  var token = ScriptApp.getOAuthToken();
  if (!token) return reply({ error: 'no_gmail_scope' });
  props.setProperty(CONFIRMED, '1');
  return reply({ access_token: token, expires_in: 1800 });
}

function doGet() {
  return ContentService.createTextOutput(
    'This is your Gmail Connect sign-in script. Paste this page\'s address into the Gmail Connect sign-in page.');
}

// '' when Gmail is allowed. Otherwise, which setup step went wrong: the
// settings file never asked for Gmail (no_gmail_scope), or Google's
// permission screen was left with the Gmail box unticked (needs_permission).
function gmailPermission() {
  try {
    var REQUIRED = ScriptApp.AuthorizationStatus.REQUIRED;
    var gmail = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL, [GMAIL]).getAuthorizationStatus();
    if (gmail !== REQUIRED) return '';
    var all = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL).getAuthorizationStatus();
    return all === REQUIRED ? 'needs_permission' : 'no_gmail_scope';
  } catch (err) {
    return '';   // no way to ask here: let the token itself be the test
  }
}

// Compares every character, so the time taken says nothing about how much
// of a guessed secret was right.
function sameString(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
