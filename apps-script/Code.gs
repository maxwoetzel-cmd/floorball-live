/**
 * Floorball Live – Apps-Script-Backend (nur für USV-Jena-Konten)
 *
 * Aufgaben:
 *  1. App ausliefern (liest die neueste floorball_live_app_7.html aus dem Drive-Ordner)
 *  2. Saisonmanager abfragen – der API-Schlüssel bleibt hier geheim
 *  3. Dateien in den Drive-Ordner "Exporte" schreiben
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
  APP_FILE_NAME: 'floorball_live_app_7.html',
  EXPORT_FOLDER_ID: '1j7o0gGj_ks2m65UQ3Dyh2_F-nJyAoI3d', // Drive-Ordner "Exporte"
  MAX_CHARS: 5 * 1024 * 1024
};

/** Liefert die App aus: nimmt die neueste Datei mit dem App-Namen im App-Ordner. */
function doGet() {
  var it = DriveApp.getFolderById(CONFIG.APP_FOLDER_ID).getFilesByName(CONFIG.APP_FILE_NAME);
  var newest = null;
  while (it.hasNext()) {
    var f = it.next();
    if (!newest || f.getLastUpdated() > newest.getLastUpdated()) newest = f;
  }
  if (!newest) return HtmlService.createHtmlOutput('App-Datei nicht gefunden: ' + CONFIG.APP_FILE_NAME);
  return HtmlService.createHtmlOutput(newest.getBlob().getDataAsString('UTF-8'))
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

/* ---------- privat ---------- */

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
 * Kader-Suche: Spiel-Detail eines beendeten Spiels (Beispiel-ID 57970). Zeigt die Feldnamen
 * und die Aufstellungen (players) mit Trikotnummern, soweit der Schlüssel das darf.
 */
function testKader() {
  try {
    var game = apiGet_('games/57970');
    Logger.log('Felder: ' + Object.keys(game).join(', '));
    Logger.log('players => ' + JSON.stringify(game.players).slice(0, 2500));
  } catch (e) { Logger.log('FEHLER ' + e.message); }
}

/** Schreibt eine Testdatei in "Exporte" (prüft die Drive-Rechte). */
function testDrive() {
  Logger.log(JSON.stringify(saveFile('floorball_test.json', '{"test":true}', true)));
}
