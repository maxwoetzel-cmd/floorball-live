/**
 * Floorball Live – Apps-Script-Backend (nur für USV-Jena-Konten)
 *
 * Aufgaben:
 *  1. App ausliefern (liest die neueste floorball_live_app_7.html aus dem Drive-Ordner)
 *  2. Saisonmanager abfragen – der API-Schlüssel bleibt hier geheim
 *  3. Dateien in den Drive-Ordner "Exporte" schreiben
 *  4. Gemeinsames Erfassen mit mehreren Geräten (syncExchange)
 *
 * WICHTIG: Der Saisonmanager-Schlüssel gehört NICHT in diesen Code, sondern in
 * Projekteinstellungen > Skripteigenschaften > SAISONMANAGER_KEY.
 *
 * Funktionen mit Unterstrich am Ende (z. B. apiGet_) sind privat und
 * können von der App nicht aufgerufen werden.
 *
 * Stand: nicht in einer echten Apps-Script-Umgebung getestet.
 */
var CONFIG = {
  API_BASE: 'https://saisonmanager.de/api/v2',
  LEAGUE_ID: 2502,                                   // Herren Verbandsliga Ost
  TEAM_ID: 9942,                                     // USV Jena (Team-ID im Saisonmanager, Saison 2026/27)
  APP_FOLDER_ID: '1QIm4VSOxaDvUDGHy8uF1gxaM1xoPKtNU',  // Drive-Ordner "Floorball Live"
  APP_FILE_NAME: 'floorball_live_app_7.html',          // Rückfall: Datei im Drive-Ordner
  APP_URL: 'https://raw.githubusercontent.com/maxwoetzel-cmd/floorball-live/main/floorball_live_app_7.html',
  EXPORT_FOLDER_ID: '1j7o0gGj_ks2m65UQ3Dyh2_F-nJyAoI3d', // Drive-Ordner "Exporte"
  MAX_CHARS: 5 * 1024 * 1024
};

/**
 * Liefert die App aus. Quelle: GitHub (Branch main, öffentliches Repository).
 * Ein Update der App ist also nur ein Push, Änderungen sind nach spätestens ca. 10 Minuten da
 * (5 Minuten Zwischenspeicher hier, dazu der von GitHub). Fällt GitHub aus oder liefert
 * Unsinn, kommt die neueste Datei aus dem Drive-Ordner "Floorball Live".
 * ACHTUNG: Wer das Repository ändern kann, bestimmt den Code der App. GitHub-Konto mit 2FA schützen.
 */
function doGet() {
  return HtmlService.createHtmlOutput(loadAppHtml_())
    .setTitle('Floorball Live')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Spielplan der Liga (Rohdaten des Saisonmanagers). */
function getSchedule() {
  return apiGet_('leagues/' + CONFIG.LEAGUE_ID + '/schedule');
}

/**
 * Nur die Spiele von USV Jena, kompakt (ohne Logos u. a.) für die App.
 * Feldnamen laut Saisonmanager-Antwort: game_id, date, time, arena_short, home_team_id ...
 */
function getGames() {
  var data = getSchedule();
  var games = Array.isArray(data) ? data : ((data && data.games) || []);
  return games
    .filter(function (g) { return g.home_team_id === CONFIG.TEAM_ID || g.guest_team_id === CONFIG.TEAM_ID; })
    .map(function (g) {
      var isHome = g.home_team_id === CONFIG.TEAM_ID;
      return {
        id: g.game_id, nr: g.game_number, day: g.game_day,
        date: g.date, time: g.time,
        arena: g.arena_short || g.arena_name || '', address: g.arena_address || '',
        home: g.home_team_name, guest: g.guest_team_name,
        isHome: isHome, opponent: isHome ? g.guest_team_name : g.home_team_name,
        started: !!g.started, ended: !!g.ended, result: g.result_string || ''
      };
    });
}

/**
 * Kader aus den Aufstellungen der letzten (bis zu 6) beendeten Spiele von USV Jena.
 * Pro Spieler: Saisonmanager-ID, Trikotnummer (aus dem jüngsten Einsatz), Vor-/Nachname, Torwart.
 */
function getRoster() {
  var data = getSchedule();
  var games = Array.isArray(data) ? data : ((data && data.games) || []);
  var mine = games
    .filter(function (g) { return g.ended && (g.home_team_id === CONFIG.TEAM_ID || g.guest_team_id === CONFIG.TEAM_ID); })
    .sort(function (a, b) { return (b.date + ' ' + b.time) < (a.date + ' ' + a.time) ? -1 : 1; }) // neueste zuerst
    .slice(0, 6);
  var byId = {};
  mine.forEach(function (g) {
    var side = g.home_team_id === CONFIG.TEAM_ID ? 'home' : 'guest';
    var detail = apiGet_('games/' + g.game_id);
    ((detail.players && detail.players[side]) || []).forEach(function (p) {
      if (!byId[p.player_id]) {   // erster Treffer = jüngstes Spiel = aktuelle Trikotnummer
        byId[p.player_id] = {
          id: p.player_id, nr: p.trikot_number,
          first: p.player_firstname || '', last: p.player_name || '',
          goalie: !!p.goalkeeper || p.position === 'Tor', youth: !!p.youth
        };
      }
    });
  });
  return Object.keys(byId).map(function (k) { return byId[k]; })
    .sort(function (a, b) { return (a.nr || 999) - (b.nr || 999); });
}

/**
 * Aufstellung (Kader) eines bestimmten Spiels von USV Jena aus dem Saisonmanager.
 * Die Liste ist leer, solange dort noch nichts eingetragen ist.
 */
function getGameLineup(gameId) {
  gameId = parseInt(gameId, 10);
  if (!gameId) throw new Error('Spiel-ID fehlt.');
  var d = apiGet_('games/' + gameId);
  var side = d.home_team_id === CONFIG.TEAM_ID ? 'home' : (d.guest_team_id === CONFIG.TEAM_ID ? 'guest' : '');
  if (!side) throw new Error('Das ist kein Spiel von USV Jena.');
  var players = ((d.players && d.players[side]) || []).map(function (p) {
    return {
      id: p.player_id, nr: p.trikot_number,
      first: p.player_firstname || '', last: p.player_name || '',
      goalie: !!p.goalkeeper || p.position === 'Tor', youth: !!p.youth
    };
  });
  return { status: d.game_status, players: players };
}

/**
 * Tore und Strafen (mit Zeit) eines Spiels von USV Jena aus dem Saisonmanager, für die automatische
 * Berechnung von Über-/Unterzahl. Leer, solange dort noch nichts eingetragen ist.
 */
function getGameEvents(gameId) {
  gameId = parseInt(gameId, 10);
  if (!gameId) throw new Error('Spiel-ID fehlt.');
  var d = apiGet_('games/' + gameId);
  var side = d.home_team_id === CONFIG.TEAM_ID ? 'home' : (d.guest_team_id === CONFIG.TEAM_ID ? 'guest' : '');
  if (!side) throw new Error('Das ist kein Spiel von USV Jena.');
  var events = (d.events || [])
    .filter(function (e) { return e.event_type === 'goal' || e.event_type === 'penalty'; })
    .map(function (e) {
      return {
        event_id: e.event_id, event_type: e.event_type, event_team: e.event_team,
        period: e.period, time: e.time,
        penalty_type: e.penalty_type || '', penalty_type_string: e.penalty_type_string || '',
        goal_type: e.goal_type || ''
      };
    });
  return { side: side, status: d.game_status, events: events };
}

/**
 * Schreibt eine Textdatei in den Ordner "Exporte".
 * overwrite=true: gleichnamige Datei wird aktualisiert (z. B. für den laufenden Spielstand).
 */
function saveFile(name, content, overwrite) {
  name = String(name || '').replace(/[^\w.\- äöüÄÖÜß]/g, '_').slice(0, 120);
  if (!name) throw new Error('Dateiname fehlt.');
  content = String(content || '');
  if (content.length > CONFIG.MAX_CHARS) throw new Error('Datei zu groß.');
  var isCsv = /\.csv$/i.test(name);
  // Excel braucht die BOM-Markierung für Umlaute (der Browser entfernt sie beim Übertragen)
  if (isCsv && content.charAt(0) !== '﻿') content = '﻿' + content;
  var folder = DriveApp.getFolderById(CONFIG.EXPORT_FOLDER_ID);
  if (overwrite) {
    var it = folder.getFilesByName(name);
    if (it.hasNext()) {
      var existing = it.next();
      existing.setContent(content);
      return { id: existing.getId(), name: name, updated: true };
    }
  }
  var file = folder.createFile(name, content, isCsv ? 'text/csv' : 'application/json');
  return { id: file.getId(), name: name, updated: false };
}

/** Liest eine Datei aus dem Ordner "Exporte" (neueste mit diesem Namen), sonst null. */
function readFile(name) {
  var it = DriveApp.getFolderById(CONFIG.EXPORT_FOLDER_ID).getFilesByName(String(name || ''));
  var newest = null;
  while (it.hasNext()) {
    var f = it.next();
    if (!newest || f.getLastUpdated() > newest.getLastUpdated()) newest = f;
  }
  return newest ? newest.getBlob().getDataAsString('UTF-8') : null;
}

/* ---------- Gemeinsam erfassen (mehrere Geräte) ----------
 * Ein gemeinsamer Spielstand mit Versionsnummer. Die Geräte führen Änderungen selbst zusammen
 * (Drei-Wege-Abgleich in der App); der Server nimmt einen Stand nur an, wenn das Gerät die
 * aktuelle Version kannte. Sonst bekommt es den neuesten Stand zurück und gleicht erneut ab.
 * Speicher: Versionsnummer in den Skripteigenschaften, Inhalt im Zwischenspeicher (schnell)
 * und in Drive "Exporte/sync_spiel.json" (dauerhaft).
 *
 * req = { dev, name, known (Version des Geräts), payload (Text oder null), force (true = neues Spiel) }
 * Antwort = { ok, version, data (nur wenn neuer als known), devices: [{dev, name}] }
 */
function syncExchange(req) {
  req = req || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var props = PropertiesService.getScriptProperties();
    var ver = parseInt(props.getProperty('SYNC_VERSION') || '0', 10);
    var res = { ok: false, version: ver, devices: syncTouchDevice_(req.dev, req.name) };
    if (req.payload != null && (req.force || req.known === ver)) {
      var txt = String(req.payload);
      if (txt.length > CONFIG.MAX_CHARS) throw new Error('Spielstand zu groß.');
      ver++;
      syncWrite_(txt, ver);
      props.setProperty('SYNC_VERSION', String(ver));
      res.ok = true; res.version = ver;
      return res;
    }
    if (req.known !== ver && ver > 0) res.data = syncRead_(ver);
    return res;
  } finally {
    lock.releaseLock();
  }
}

function syncWrite_(txt, ver) {
  var cache = CacheService.getScriptCache();
  if (txt.length < 90000) cache.put('sync_data', JSON.stringify({ v: ver, d: txt }), 21600);
  else cache.remove('sync_data');
  saveFile('sync_spiel.json', txt, true);
}

function syncRead_(ver) {
  var c = CacheService.getScriptCache().get('sync_data');
  if (c) {
    try { var o = JSON.parse(c); if (o.v === ver) return o.d; } catch (e) { /* Rückfall Drive */ }
  }
  return readFile('sync_spiel.json');
}

/** Merkt sich, welche Geräte in den letzten 30 Sekunden da waren. */
function syncTouchDevice_(dev, name) {
  var cache = CacheService.getScriptCache(), now = Date.now(), list = {};
  try { list = JSON.parse(cache.get('sync_devices') || '{}'); } catch (e) { list = {}; }
  if (dev) list[String(dev).slice(0, 40)] = { n: String(name || '').slice(0, 40), t: now };
  var out = [];
  Object.keys(list).forEach(function (k) {
    if (now - list[k].t > 30000) delete list[k];
    else out.push({ dev: k, name: list[k].n });
  });
  cache.put('sync_devices', JSON.stringify(list), 3600);
  return out;
}

/* ---------- privat ---------- */

function loadAppHtml_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('app_html');
  if (cached) return cached;
  try {
    var res = UrlFetchApp.fetch(CONFIG.APP_URL, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      var text = res.getContentText('UTF-8');
      // Plausibilitätsprüfung: vollständige Seite und unsere App
      if (text.indexOf('<title>Floorball Live</title>') !== -1 && text.indexOf('</html>') !== -1) {
        try { cache.put('app_html', text, 300); } catch (e) { /* zu groß für den Zwischenspeicher: egal */ }
        return text;
      }
    }
  } catch (e) { /* Rückfall unten */ }
  return driveAppHtml_();
}

function driveAppHtml_() {
  var it = DriveApp.getFolderById(CONFIG.APP_FOLDER_ID).getFilesByName(CONFIG.APP_FILE_NAME);
  var newest = null;
  while (it.hasNext()) {
    var f = it.next();
    if (!newest || f.getLastUpdated() > newest.getLastUpdated()) newest = f;
  }
  return newest ? newest.getBlob().getDataAsString('UTF-8') : 'App nicht erreichbar (GitHub und Drive-Rückfall fehlgeschlagen).';
}

function apiGet_(path) {
  var key = PropertiesService.getScriptProperties().getProperty('SAISONMANAGER_KEY');
  if (!key) throw new Error('SAISONMANAGER_KEY fehlt (Projekteinstellungen > Skripteigenschaften).');
  var res = UrlFetchApp.fetch(CONFIG.API_BASE + '/' + path, {
    method: 'get',
    headers: { 'X-Api-Key': key, 'Accept': 'application/json' },
    muteHttpExceptions: true
  });
  var code = res.getResponseCode(), text = res.getContentText();
  if (code !== 200) throw new Error('Saisonmanager ' + code + ': ' + text.slice(0, 200));
  return JSON.parse(text);
}

/* ---------- Testfunktionen (im Editor ausführen, Ergebnis im Ausführungsprotokoll) ---------- */

/** Zeigt den Anfang der Spielplan-Antwort. Der Schlüssel steht nicht im Protokoll. */
function testSchedule() {
  Logger.log(JSON.stringify(getSchedule()).slice(0, 3000));
}

/**
 * Probiert einen beliebigen Endpunkt aus der Saisonmanager-Doku aus, z. B. Kader.
 * Pfad vorher als Skripteigenschaft PROBE_PATH setzen (ohne führenden Schrägstrich),
 * z. B. leagues/2502/teams
 */
function testPfad() {
  var path = PropertiesService.getScriptProperties().getProperty('PROBE_PATH');
  if (!path) throw new Error('Skripteigenschaft PROBE_PATH fehlt.');
  Logger.log(JSON.stringify(apiGet_(path)).slice(0, 3000));
}

/**
 * Prüft das Spiel-Detail des nächsten, noch nicht beendeten Spiels von USV Jena:
 * Ist die Aufstellung (players) schon vor dem Spiel gefüllt? Es werden nur Anzahlen und
 * Feldnamen protokolliert, keine Namen.
 */
function testKader() {
  try {
    // Beendetes Spiel (Beispiel-ID 57970): Welche Ereignisse (Tore, Strafen ...) liefert der Saisonmanager?
    var d = apiGet_('games/57970'), ev = d.events || [];
    Logger.log('Ereignisse gesamt: ' + ev.length);
    if (ev.length) Logger.log('Felder: ' + Object.keys(ev[0]).join(', '));
    var types = {};
    ev.forEach(function (e) {
      var k = e.event_type || e.type || e.kind || '?';
      (types[k] = types[k] || []).push(e);
    });
    Object.keys(types).forEach(function (k) {
      Logger.log('Typ ' + k + ': ' + types[k].length + ' | Beispiel: ' + JSON.stringify(types[k][0]).slice(0, 400));
    });
  } catch (e) { Logger.log('FEHLER ' + e.message); }
}

/** Schreibt eine Testdatei in "Exporte" (prüft die Drive-Rechte). */
function testDrive() {
  Logger.log(JSON.stringify(saveFile('floorball_test.json', '{"test":true}', true)));
}
