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
 * call has to carry the secret, and the secret is handed out exactly once.
 *
 * To cut off every widget using this script: choose resetSecret in the
 * toolbar and press Run. To remove it for good, delete this project.
 */

var SECRET = 'gmailConnectSecret';

function doPost(e) {
  var req = {};
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) {}
  var props = PropertiesService.getScriptProperties();

  // The first caller claims the secret; every later claim is refused. Right
  // after you deploy, that caller is you — nobody else knows this address.
  if (req.op === 'claim') {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (props.getProperty(SECRET)) return reply({ error: 'already_claimed' });
      var secret = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
      props.setProperty(SECRET, secret);
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
    return reply({ ok: true });
  }

  // A fresh access token for you, the owner, limited to the one permission
  // appsscript.json asks for (gmail.modify). Reported as half an hour so the
  // widget comes back well before Google's hour is up.
  return reply({ access_token: ScriptApp.getOAuthToken(), expires_in: 1800 });
}

function doGet() {
  return ContentService.createTextOutput(
    'This is your Gmail Connect sign-in script. Paste this page\'s address into the Gmail Connect sign-in page.');
}

/** Run this to disconnect every widget that uses this script. */
function resetSecret() {
  PropertiesService.getScriptProperties().deleteProperty(SECRET);
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
