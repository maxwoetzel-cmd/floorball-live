# Projekt-Übergabe: Floorball Live (USV Jena Herren)

> Diese Datei an Claude Code zeigen oder reinkopieren, damit er den Stand kennt.
> Ergänzend: `CLAUDE.md` (Projektregeln), `apps-script/ANLEITUNG.md` (Einrichtung des Backends).
> **Das Repository ist öffentlich.** Deshalb stehen hier keine Web-App-Adresse, keine Skript-ID und kein API-Schlüssel.
> Die Adresse der Web-App steht in der Testanleitung in Drive (Abschnitt 2).

---

## 1. Worum geht es

Eine App zur Live-Erfassung und Auswertung der Spiele der USV-Jena-Floorball-Herren (Schüsse, Zonen,
Bullys, Spielzeiten, Torhüter, Aufstellungen, Über-/Unterzahl). Zwei Betriebsarten, **eine** Code-Basis:

- **Web-App (Hauptweg):** Läuft als Google-Apps-Script-Web-App im Workspace (nur USV-Konten). Sie holt Spielplan,
  Kader und Strafen aus dem **Saisonmanager** und sichert den Spielstand automatisch in **Drive**.
  Bedienung am Android-Tablet im Querformat (eine Person erfasst alles). Verknüpfung auf dem Startbildschirm,
  keine echte App-Installation (nicht möglich unter `script.google.com`).
- **Lokale Datei (Rückfall):** `floorball_live_app_7.html` direkt im Browser öffnen. Läuft offline, hat aber weder
  Saisonmanager noch Drive. Die Teile für die Web-App sind dann unsichtbar bzw. inaktiv (`inWebApp()`).

Verantwortlich: Max Woetzel (Head-Coach Herren).

---

## 2. Architektur-Entscheidungen (wichtig, nicht umwerfen)

- **Die App bleibt EINE HTML-Datei** (`floorball_live_app_7.html`, CSS und JavaScript inline, keine externen
  Skripte, kein Framework, kein Build). Backend-Code liegt getrennt in `apps-script/`.
- **Web-App im Konto von Max:** Ausführen als Max, Zugriff „Jeder in USV Jena e.V.“. Das Backend (`apps-script/Code.gs`)
  lädt die App-Datei aus **GitHub** (`main`, raw, 5 Minuten Cache im Skript, Rückfall: gleichnamige Datei im Drive-Ordner).
  Ein App-Update ist daher nur ein **Push**, in der Web-App nach ca. 10 Minuten sichtbar.
- **Zugriff:** Die Web-App steht auf „Jeder in USV Jena e.V.“ und läuft im Namen von Max. Ohne weitere Einstellung darf **jedes** Konto der Domain
  (auch andere Abteilungen) die App und alle Server-Funktionen nutzen. Mit der **Skripteigenschaft `ALLOWED_USERS`** (E-Mail-Adressen, durch Komma,
  Semikolon, Leerzeichen oder Zeilenumbruch getrennt) lässt sich das auf eine **Freigabeliste** beschränken. Der Besitzer (Max) kommt immer hinein.
  Nicht freigegebene Konten sehen „Kein Zugriff“. Geprüft wird in `doGet` und am Anfang jeder öffentlichen Backend-Funktion (`assertAllowed_`).
  Die Adressen stehen nur in der Skripteigenschaft, nie im Repository.
- **Saisonmanager nur über das Backend:** `https://saisonmanager.de/api/v2` sendet keine CORS-Header und braucht einen
  API-Schlüssel (Header `X-Api-Key`). Der Schlüssel liegt als **Skripteigenschaft `SAISONMANAGER_KEY`** (nie im Code,
  Repo, Chat oder Dokument). Liga Herren VL Ost = **2502**, Team USV Jena = **9942** (Saison 2026/27).
- **Verwendete Saisonmanager-Endpunkte:** `leagues/:id/schedule` (Spielplan), `games/:id` (Felder `players` mit
  `trikot_number`, `player_firstname`, `player_name`, `goalkeeper`, und `events` mit Typ `goal`, `penalty`, `timeout`).
  `teams/:id` liefert Serverfehler 500, `teams/:id/stats` nur Torschützen. Strafen kommen live, wenn der Zeitnehmer sie einträgt.
- **Speicherung:** `localStorage` (`floorball_live_state_v6`) plus **Drive-Autosave** (`spielstand_aktuell.json`, 15 Sekunden
  nach der letzten Änderung, nie mit leerem Stand). Im Apps-Script-Fenster bleibt `localStorage` nicht zuverlässig. Beim Öffnen
  fragt die App deshalb „In Drive liegt ein gesicherter Spielstand. Jetzt laden?“. Es gibt **einen** gemeinsamen Spielstand für alle Geräte.
- **Stammkader** liegt in Drive (`kader.json`, je Spieler Nummer für Blau und Weiß, Position D/O, Torwart, Kapitän).
  Er wird bei leerem Kader automatisch geladen. Trikotfarbe wird zu Beginn gewählt (Standard blau, nicht automatisch nach Heim/Auswärts).
- **Ablauf in Phasen** (`state.phase`): `prep` (drei Schritte: 1 Spiel+Kader+Anwesenheit, 2 Aufstellung, 3 Spielstart),
  `play`, `break` (Pause mit Auswertung), `end` (Gesamtauswertung). „⌂ Startseite“ führt zu Schritt 1, „Zurück zum Spiel“
  setzt fort (`state.resume`). Ein Drittel endet **fest bei Minute 20** (`closeOpenIntervals`).
- **Spielzeiten** entstehen aus `ein`/`aus`-Ereignissen je Spieler und Drittel (`computePlayerMinutes`). Beim Start eines Spiels
  mit Altdaten sichert die App erst den alten Stand und löscht dann (`beginGame`/`resetGameData`), damit sich Zeiten nicht überlagern.
- **Über-/Unterzahl kommt aus den Strafen** (`deriveSpecials`, jede Minute im laufenden Drittel, beim Drittel- und Spielende).
  Zwei-Minuten-Strafen enden beim Tor, gleichzeitige Strafen beider Teams ergeben keinen Abschnitt. Manuelle Eingabe nur als Notfall.
- **Formationen** (Überzahl, Unterzahl 1/2, eine gemeinsame Alternative Aufstellung) dienen **nur zum Ansagen**. Sie liegen getrennt
  von den Reihen und lösen keine Spielzeit aus. Name (Stift ✎), „Spieler aus Reihe“ und „Danach“ (1./2./3. Reihe oder Alternative) sind einstellbar.
- **Aufstellung bedienen:** Reihenname antippen → mögliche Spieler direkt darunter (antippen = freier Platz). Position antippen →
  Auswahlliste am Platz. Tor-Platz nur Torhüter, alle anderen Plätze nur Feldspieler, jeweils nach Trikotnummer sortiert.
- **Vornamen** werden überall angezeigt (bei gleichem Vornamen mit Initial des Nachnamens). **Kein Plus/Minus.**
- **Zonen** heißen Kurzdistanz, Halbfeld (linke Tasche, zentrales Halbfeld, rechte Tasche) und Langdistanz. Daten bleiben als `tornah/zentral/fern`.

---

## 3. Stand: Was fertig ist

- Schuss-Erfassung mit Minute (Tor/Aufs Tor/Daneben, Auswahl über dem Feld), Bully mit Minute und Zähler auf den Knöpfen,
  Empty Net (Torwart raus, 6. Feldspieler), Wechsel mit Spielzeit.
- Auswertung je Drittel (Pause) und Gesamtauswertung: Spielstand, Torhüter (Aufs Tor = gehalten, Tor = Gegentor), Schussbilder
  Offense/Defense mit Zonenzahlen, Spielzeiten je Drittel und gesamt, Bully je Drittel, Über-/Unterzahl.
- Export (JSON, CSV) direkt nach Drive; Sicherung vor „Neues Spiel“ und vor Import. Gerätewechsel über den Autosave.
- Backend `Code.gs`: `doGet`, `getSchedule`, `getGames`, `getRoster`, `getGameLineup`, `getGameEvents`, `saveFile`, `readFile`, `syncExchange`, `listExports`, Freigabeprüfung (`assertAllowed_`, `testZugriff`), Testfunktionen. Stand: **Version 9** (08.11.2026, mit `syncExchange`, `listExports`, Freigabeliste und OAuth-Bereich `userinfo.email`).
- Testanleitung für andere Tester (Google-Dokument, Stand 08.11.2026, am selben Tag um Freigabe, Ereignisliste, Gemeinsam erfassen, Spielbericht, YouTube-Zeitmarken und Saisonauswertung ergänzt; Verweise auf Punkt 8 und 12 korrigiert).
- Design-Runde 08.11.2026 (Tablet in der Halle): höherer Kontrast für `--text-muted`, größere Kleinschrift, Spielstand 40 px,
  Empty-Net-Badge in Amber (`--accent`) statt Rot, Toast oben, Vibration plus Toast nach jedem erfassten Schuss.
  Schussmarker: Tor = Kreis gefüllt, Aufs Tor = Kreis halbtransparent, Daneben = Kreuz (`shotMarkerSvg`). Statistik-Tabellen: Zebra-Zeilen, Duell-Balken Wir/Gegner bei Tore/Schüsse/aufs Tor (`duelRowHtml`), Mini-Balken bei Quoten (`quoteCellHtml`). Offen: Vereinslogo (blau/weiß) als Inline-SVG/Base64.
- Spielfelder (08.11.2026): Feldfarbe = Vereinsblau `#002d5a` (CD-Richtlinie, RGB 0/45/90; Magenta bewusst nicht verwendet).
  Überzahl und Unterzahl 1/2 zeigen ein Feld mit Linien (`fieldBgSvg`, Maßstab 20 Einheiten je Meter:
  Torraum (Rechteck) mit Tor (Netz) oben und Schutzraum darunter, Proportionen nach Vorlage des Vereins; `LF_DIM` = Seitenverhältnis). Positionen in `FM_POS` liegen so, dass kein
  Slot auf einer Linie oder einem anderen Slot liegt. Überzahl: Tor oben, Unterzahl: Tor unten. Die Alternative Aufstellung ist wie Reihen 1–3 ein Raster ohne Feld.
  Schussfeld und Zusammenfassung nutzen dieselbe Torraum-Zeichnung (`goalAreaSvg`). Reihen 1–3 bleiben bewusst das Raster ohne Feld (Offense links/rechts vor dem Center, `.slot-grid-off`).

- Paket 1 (08.11.2026, Betriebssicherheit):
  - **Bildschirm wach** (`updateWakeLock`, Wake Lock API) während Drittel und Pause. Klappt das nicht, erscheint ein Hinweis (`#wake-status`), die Bildschirmsperre am Gerät zu verlängern.
  - **Drive-Autosave mit Wiederholung** (`runDriveSave`, `updateDriveStatus`): Bei Fehlern neuer Versuch nach 10/20/30 … max. 60 s, rote Warnung nach 2 Minuten ohne Sicherung, sofortige Sicherung beim Wechsel in den Hintergrund und bei wiederkehrender Verbindung.
  - **Ereignisliste** (`#sec-events`, `renderEvents`): Schüsse und Bullys, neueste oben, Minute und Ergebnis änderbar, Löschen mit Rückfrage. Im Drittel eingeklappt („korrigieren ▾“), Filter aktuelles Drittel/alle. Zone ist nicht änderbar (löschen und neu erfassen).
  - **Uhrzeit-Stempel** `ts` (ms) an Schüssen, Bullys und manuellen Specials sowie `state.periodStarts`/`state.periodEnds` je Drittel (Grundlage für Paket 2: YouTube-Zeitmarken). Schuss-CSV hat die Spalte „Uhrzeit“.
- Paket 2 (08.11.2026, **YouTube-Zeitmarken**, Abschnitt `#sec-video`, nur bei Spielende): Videozeit des Anpfiffs je Drittel eintragen (`state.videoOffsets`, Sekunden),
  Vorlauf einstellbar (`state.videoLead`, Standard 10 s). `videoMarks` erzeugt: „0:00 Vor dem Spiel“ (für YouTube-Kapitel), Drittelbeginn, Tore mit laufendem Spielstand,
  Gegentore, Über-/Unterzahl. Strafen aus dem Saisonmanager haben nur Spielzeit (`startSec`); ihre Uhrzeit schätzt `gameSecToTs` linear aus den erfassten
  Ereignissen des Drittels, Kennzeichnung „(ca.)“. Text kopieren (Zwischenablage, Rückfall: markieren) oder als .txt speichern (Web-App: Drive).
- Paket 3 (08.11.2026, **Gemeinsam erfassen**, nur Web-App): Schalter in Schritt 1 (`#sec-sync`, `setSyncOn`), Statuszeile `#sync-status`.
  - Backend `syncExchange` (Versionsnummer `SYNC_VERSION` in den Skripteigenschaften, Inhalt im Script-Cache und in `Exporte/sync_spiel.json`, LockService). Der Server nimmt einen Stand nur an, wenn das Gerät die aktuelle Version kennt (`known`), sonst schickt er den neuesten zurück.
  - App: Drei-Wege-Abgleich (`merge3`: base = zuletzt abgeglichener Stand). Schüsse, Bullys, Specials und Kader je Eintrag (`id`), Löschungen setzen sich durch, bei gleichzeitiger Änderung desselben Eintrags gewinnt das eigene Gerät. Übrige Felder (Phase, Drittel, Minute, Aufstellung, Empty Net …) je Feld.
  - Gerätebezogen (`SYNC_LOCAL_KEYS`): Ansicht Wir/Gegner, halbfertiger Schuss, Vorbereitungsschritt, Startseiten-Ansicht (`resume`). Geht ein Gerät zur Startseite, bleibt das andere im Spiel.
  - IDs sind jetzt geräteübergreifend eindeutig (`newId()` = ms × 100 + Gerätezahl). Saisonmanager-Specials haben feste IDs (`sm-Drittel-Start-Typ`), damit beide Geräte dieselben erzeugen. „Rückgängig“ nimmt nur Einträge des eigenen Geräts zurück (`lastOwn`, Feld `dev`).
  - Spielsitzung `state.syncId`/`syncCreated`: Neues Spiel, Import und Spielstart mit Altdaten erzeugen eine neue Sitzung (`syncNewSession`), die neuere setzt sich auf allen Geräten durch. Beim ersten Zuschalten mit eigenen Spieldaten fragt die App und sichert vorher.
  - Rollen (`setRole`, nur Ansicht): „Schüsse und Bullys“ blendet im Spiel die Aufstellung aus, „Wechsel“ das Schussfeld (Aufstellung immer offen).
  - Abgleich alle 4 s und 0,8 s nach jeder Änderung. Warnung nach 20 s ohne Verbindung; Erfasstes bleibt lokal und wird nachgeschickt.
  - Getestet mit zwei App-Instanzen und simuliertem Backend (gleichzeitige Einträge, Löschen gegen Ändern, Wechsel, Offline-Phase, Startseite, Drittelende, Neues Spiel). **Nicht getestet:** echtes Apps Script (Laufzeit, Sperre, Quoten), zwei echte Geräte.
- Paket 4 (08.11.2026, **Spielbericht und Saisonauswertung**):
  - **Spielbericht** (Knopf bei Spielende, `shareGameReport`): eigenständige HTML-Seite mit Kopf (Ergebnis, Datum, Halle), Torfolge und der Gesamtauswertung (alle `<details>` geöffnet). CSS der App plus `REPORT_CSS` (helle Farben beim Drucken, „Drucken → Als PDF“).
  - **Teilen** (`shareHtml`): Teilen-Menü des Geräts (z. B. WhatsApp), falls erlaubt; in der Web-App zusätzlich Ablage in Drive „Exporte“. Ist das Teilen-Menü im Apps-Script-Fenster gesperrt, liegt die Datei in Drive und wird von dort geteilt.
  - **Saisonauswertung** (Schritt 1 und Spielende, `#sec-season`): Backend `listExports` liest alle `floorball_*.json` und `spielstand_aktuell.json` aus „Exporte“ (gekürzt). Rückfall: Exportdateien selbst wählen. Nur Spiele ab 1. August der laufenden Saison mit Daten. Doppelte Sicherungen eines Spiels (Schlüssel: Saisonmanager-Spiel-ID, sonst `syncId`, sonst Gegner+Datum) → beendeter bzw. vollständigster Stand. Spiele abwählbar (`fl_season_excl` im `localStorage`).
  - Inhalte: Überblick (Bilanz, Tore, Schüsse, Quoten, Bully, ÜZ/UZ), Balken Tore/Schüsse je Spiel, Spieltabelle mit erwarteten Toren, Spieler (Spiele, Minuten, Ø), Torhüter (Quote), Schussbilder der Saison, Torquote je Zone. Erwartete Tore = Saison-Torquote der Zone (beide Teams, zur Gesamtquote hin geglättet, Gewicht 5).
  - Spieler über Spiele hinweg: `smId`, sonst Vor- und Nachname (Trikotnummer wechselt mit der Trikotfarbe). Vorhandene Auswertungsfunktionen laufen für fremde Spiele über `withState`.
  - Getestet mit erfundenen Spielen im Browser (Zusammenfassen doppelter Sicherungen, Saisonfilter, Abwählen, erzeugte HTML-Seiten). **Nicht getestet:** `listExports` im echten Apps Script, Teilen-Menü auf dem Tablet.

**Getestet** wurde mit simulierten Daten im Browser und mit Node (Syntax, Rechenlogik). **Nicht getestet:** echtes Spiel, echtes Tablet,
Aufstellung eines kommenden Spiels aus dem Saisonmanager (Format als gleich wie bei beendeten Spielen angenommen), Strafen live.

## 4. Stand: Was noch offen ist

1. Test auf dem Android-Tablet und an einem echten Spiel (Bildschirmplatz im Querformat, Größe der Knöpfe, Auswertung in der Pause).
2. Rückmeldungen der Tester auswerten (Testanleitung, Punkt 12).
3. Auswechselbank unten in der Aufstellung: bleibt vorerst, kann entfallen, wenn sie nicht gebraucht wird.
4. Nur **eine** Alternative Aufstellung für alle Formationen. Brauchen Überzahl und Unterzahl verschiedene, erweitern.
5. Kader: Schlunk (79) und Zeipelt (45) sind eingetragen. Gibt es weitere Spieler im Stammkader, in `kader.json` ergänzen.
6. Optional: Spielzeit je Drittel mit eingestellter Minute statt fest 20 (bewusst abgelehnt, bleibt bei 20).
7. Optional: Zusammenfassung als Datei (PDF/HTML) in Drive ablegen.
8. GitHub-Konto mit Zwei-Faktor-Anmeldung absichern (siehe Fallstricke).
9. Prüfen, ob die Wake Lock API in der Apps-Script-Web-App (eingebettetes Fenster) auf dem Tablet erlaubt ist. Im Testbrowser wurde sie abgelehnt, dann greift nur der Hinweis.
10. YouTube-Zeitmarken am ersten echten Spiel prüfen (Genauigkeit der Tore, Schätzung „(ca.)“ bei Strafen, Kopieren in der Web-App). Video: CapCut, Upload YouTube, Aufnahme pro Spiel, Drittelpausen teils geschnitten.
11. Paket 3 ist bereitgestellt (Backend 08.11.2026). Offen: Test mit zwei echten Geräten (Schuss auf Gerät 1, Wechsel auf Gerät 2, Offline-Phase, Neues Spiel).
12. Paket 4 ist bereitgestellt (`listExports` in Version 9). Offen: Saison aus Drive laden und prüfen, ob doppelte Sicherungen richtig zusammengefasst werden und das Teilen-Menü in der Web-App aufgeht.
13. Geparkt: Reihe pro Schuss (Reihenwechsel alle 40–60 s, aktuell kein Bedarf).
14. **Freigabeliste** (08.11.2026): **bereitgestellt (Version 9) und aktiv.** `ALLOWED_USERS` enthält floorball-tablet@, max.woetzel@, paulina.jacob@ und
    anja.moldenhauer@usvjena.de (Besitzer Max kommt immer hinein). Voraussetzung ist der OAuth-Bereich `userinfo.email` im Manifest; ohne ihn ist die
    Adresse nicht lesbar und eine gefüllte Liste sperrt alle aus. Geprüft: `testZugriff` zeigt Konto max.woetzel@ und freigegeben, Web-App öffnet für Max
    mit aktiver Liste und Drive verbunden. Tablet-Konto kommt rein, ein nicht freigegebenes Konto wird abgewiesen (von Max geprüft).
    **Offen:** Anmeldung von Paulina und Anja (Schreibweise der Adressen).

---

## 5. Wichtige Orte (keine Geheimnisse)

| Was | Wert |
|---|---|
| Repository | `github.com/maxwoetzel-cmd/floorball-live` (öffentlich, Branch `main`) |
| App-Datei | `floorball_live_app_7.html` (Dateiname bleibt trotz Version) |
| Backend-Code | `apps-script/Code.gs`, `apps-script/appsscript.json`, Anleitung `apps-script/ANLEITUNG.md` |
| Apps-Script-Projekt | „Floorball Live“ in Max' Konto (script.google.com, Projektliste). ID bewusst nicht im Repo. |
| Web-App-Adresse | steht in der Testanleitung in Drive |
| Geteiltes Laufwerk | „Floorball - Coaches“, Ordner „Floorball Live“ (ID `1QIm4VSOxaDvUDGHy8uF1gxaM1xoPKtNU`) |
| Ordner „Exporte“ | ID `1j7o0gGj_ks2m65UQ3Dyh2_F-nJyAoI3d` (`spielstand_aktuell.json`, `kader.json`, Exporte, CSV) |
| Testanleitung | Google-Dokument „Floorball Live – Testanleitung (Stand 08.11.2026)“ im Ordner „Floorball Live“ (ID `1LOIYNweWbilR36QgWEKlZpNidp589cHbd44oK0EAaT0`) |
| Saisonmanager | Liga 2502, Team 9942, Schlüssel nur in der Skripteigenschaft `SAISONMANAGER_KEY` |

---

## 6. Fallstricke (teuer gelernt – unbedingt beachten)

- **Backend-Update: „Neue Bereitstellung“ ändert die Adresse.** Richtig: Bereitstellen → Bereitstellungen verwalten → Stift → Version „Neue Version“ → Bereitstellen.
  Vorher speichern (Strg+S), sonst läuft der alte Stand. Neue Version nur auf ausdrücklichen Wunsch des Nutzers.
- **Cache:** Die Web-App zeigt App-Änderungen erst nach bis zu ca. 10 Minuten (5 Minuten Skript-Cache plus GitHub-raw).
- **Sicherheit:** Wer das öffentliche Repository ändern kann, bestimmt den Code, der in der Web-App im Namen von Max läuft
  (auch Zugriff auf `saveFile`, `readFile`, Spielplan). GitHub-Konto mit 2FA schützen. Der Schlüssel ist aus der App nicht lesbar.
- **Funktionen mit `_` am Ende** (`apiGet_`, `loadAppHtml_`) sind in Apps Script privat und aus der App nicht aufrufbar.
- **Drive-Werkzeug:** Dateiinhalte lassen sich nicht überschreiben, nur neu anlegen oder umbenennen. `saveFile` mit `overwrite` nimmt die erste Datei
  dieses Namens. Darum nie zwei aktive Dateien `kader.json` oder `spielstand_aktuell.json`. Das Löschen blockiert die Berechtigungsprüfung teils, dann von Hand.
- **Apps-Script-Editor:** Code per Zwischenablage ist nicht möglich, bei Claude ging es über `monaco.editor.getModels()[…].setValue(…)`. Danach Funktionsanzahl und Länge
  mit `Code.gs` im Repo vergleichen (einmal gab es doppelte Funktionen). Beim Auswählen der Funktion zum Ausführen erst das Menü öffnen, dann die Zeile klicken und prüfen. Ausführen nutzt den zuletzt gespeicherten Stand.
- **`confirm()`-Fenster in der Web-App** blockieren automatische Bildschirmfotos (Claude in Chrome). Mit Escape oder Return schließen.
- **Tests im Browser:** `localStorage` nur durch einen Ersatzspeicher im Arbeitsspeicher ersetzen, **nie** `localStorage.clear()` im echten Browser. Änderungen an der App per Node-Skript mit Treffer-Prüfung
  einspielen (Treffer ≠ 1 → Abbruch), danach Syntaxprüfung der Script-Tags.
- **Datenvermischung:** Wird ein Spiel mehrfach im selben Stand durchgespielt, überlagern sich die Zeiten. Dagegen sichert `beginGame` und löscht Altdaten. „Neues Spiel“ setzt ebenfalls zurück.
- **Saisonmanager:** `401` ohne Schlüssel, kein CORS. Spielernamen sind personenbezogen (es gibt ein Feld `hide_public_last_name`). Daten nur für den Vereinsgebrauch.
- **Drittelende ist fest Minute 20.** Beendet man ein Drittel im Test früher, zeigt die Auswertung trotzdem 20 Minuten.
- **Browser-Pane von Claude Code** öffnet lokale Dateien nur als Standbild. Zum Testen eine Kopie mit Ersatzspeicher über einen kleinen lokalen Server ausliefern (`.claude/launch.json`, lokal von Git ausgeschlossen). Wake Lock wird dort abgelehnt, das ist kein Fehler der App.
- **Gemeinsam erfassen:** Vorbereitung (Kader laden, Aufstellung) auf einem Gerät, das zweite erst danach zuschalten. Lädt jedes Gerät den Stammkader selbst, entstehen verschiedene Spieler-IDs und damit doppelte Spieler.
  Der Schalter steht im `localStorage`; im Apps-Script-Fenster kann er nach einem Neuladen aus sein. Dann erneut einschalten.
  Neue Felder im Spielstand sind automatisch geteilt. Gerätebezogene Felder in `SYNC_LOCAL_KEYS` eintragen.
- **Test zweier Geräte ohne Apps Script:** Eine Testseite mit zwei iframes laden; in jede App-Kopie vor dem Skript einen Ersatz-`localStorage` und ein `window.google` einsetzen, dessen `script.run` an eine Nachbildung von `syncExchange` in der Elternseite geht (mit Verzögerung).
- **Freigabeliste und Aussperren:** `ALLOWED_USERS` gefüllt = nur diese Konten plus Besitzer. Fehlt das Tablet-Konto, ist am Spieltag niemand am Tablet drin.
  Liest Google die Adresse eines Kontos nicht (Konto außerhalb der Domain), wird es bei gefüllter Liste abgewiesen. Notausgang: Eigenschaft löschen (Max kommt immer hinein).
  `Session.getActiveUser()` liefert die Adresse nur bei Konten derselben Domain wie der Besitzer.
- **Git** meldet auf Windows „LF will be replaced by CRLF“. Das ist harmlos.

---

## 7. Arbeitsweise in Claude Code

```
# Syntaxprüfung der App (Script-Tag)
node -e "const h=require('fs').readFileSync('floorball_live_app_7.html','utf8');new Function(h.match(/<script>([\s\S]*)<\/script>/)[1]);console.log('OK')"

git add -A && git commit -m "..." && git push      # App-Update, in der Web-App nach ca. 10 Minuten
```

- Änderung an der App: Datei bearbeiten, Syntax prüfen, im Browser mit Testdaten prüfen, committen, pushen.
- Änderung am Backend: `apps-script/Code.gs` ändern, im Skript-Editor einfügen und speichern, **neue Version der bestehenden Bereitstellung** (nur auf Wunsch), Datei im Repo mitcommitten.
- OAuth-/Zustimmungsfenster klickt der Nutzer selbst durch. Den Schlüssel trägt der Nutzer selbst ein.

---

## 8. Rahmen / Stil (vom Verein vorgegeben)

- Antworten auf Deutsch, formelles Du, knapp, aktiv, kein Füll-Text.
- Bei fehlenden Infos nicht raten, sondern 3–5 nummerierte Rückfragen stellen.
- **Diese Übergabedatei aktuell halten:** Nach jeder inhaltlichen Änderung (neue Funktion, neue Abhängigkeit, neue Version, neue Falle)
  die Abschnitte 3, 4 und 6 mit anpassen und die Datei im selben Commit mitnehmen.
- Keine Geheimnisse und keine Web-App-Adresse in dieses Repository schreiben (es ist öffentlich).
