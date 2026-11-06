# Floorball Live — Projektkontext für Claude Code

## Was ist das?
"Floorball Live" ist eine eigenständige Web-App zur Live-Erfassung und Analyse
der Spiele der USV-Jena-Floorball-Herren. Sie läuft komplett offline im Browser —
kein Server, kein Build-Schritt, keine externen Abhängigkeiten.

## Wichtigste Projektregel
Die App MUSS eine einzige, in sich geschlossene HTML-Datei bleiben
(HTML + CSS + JavaScript inline in `floorball_live_app_7.html`).
Grund: Sie wird als lokale Datei direkt im Browser geöffnet (bzw. am Handy zum
Startbildschirm hinzugefügt) und muss ohne Internet funktionieren.
Also: keine externen Skripte/Stylesheets, keine npm-Pakete, keine CDN-Links,
kein Framework. Neue Funktionen immer inline ergänzen.

## Technik
- Reines HTML/CSS/Vanilla-JavaScript, eine Datei.
- Dunkles, mobil-optimiertes UI; Farben über CSS-Variablen in `:root`
  (`--wir`, `--gegner`, …).
- Spielstand/Status wird im Browser via `localStorage` gespeichert
  (Funktionen `save()` / `load()`), überlebt also einen Reload.
  Achtung: localStorage hängt am Browser/Gerät — zum Sichern/Übertragen den
  JSON-Export der App nutzen.

## Geräte und Verteilung
- Ziel-Geräte: Android-Tablet (Hauptgerät am Spieltag) und Smartphones;
  iPad/iPhone nur gelegentlich. Verteilung bisher als lokale Datei über den
  Drive-Ordner "Floorball Live" (USV-Workspace). GitHub Pages / Service Worker
  wurden geprüft und verworfen (Seite wäre öffentlich).
- In Arbeit ("Weg A"): Workspace-interne Web-App über Google Apps Script
  (Ordner `apps-script/`, Anleitung dort). Sie liefert dieselbe HTML-Datei aus,
  hält den Saisonmanager-API-Schlüssel geheim (Skripteigenschaft, NIE im Code/Repo)
  und speichert nach Drive ("Exporte"). Die App-Datei selbst bleibt EINE HTML-Datei;
  `apps-script/` ist nur Backend. Der Saisonmanager (`saisonmanager.de/api/v2`) sendet
  keine CORS-Header und braucht einen Schlüssel, daher kein direkter Abruf aus dem
  Browser. Liga Herren VL Ost = ID 2502, Team USV Jena = ID 9942. Offline ist in diesem Weg nicht möglich.
  Web-App-Modus der App (erkennbar an `inWebApp()`): Spielplan laden und Spiel wählen
  (`loadGames`, `pickGame`), Spielstand-Autosave nach Drive (`scheduleDriveSave`),
  Exporte direkt nach Drive (`saveFile`). Als lokale Datei sind diese Teile inaktiv.
  Kader-Import aus dem Saisonmanager: noch offen (Endpunkt unbekannt).
- Auf iOS laufen Export und CSV über das Teilen-Menü (`saveFile`), weil der
  normale Download dort unzuverlässig ist. Auf Android/Laptop normaler Download.
- Vor "Neues Spiel" und "Importieren" wird der alte Stand automatisch gesichert;
  bricht die Sicherung ab, bleibt alles unverändert.
- Nach jedem Spiel JSON-Export in den Drive-Unterordner "Exporte" legen.
  Der Browserspeicher (`localStorage`) ist keine Sicherung.

## Funktionsumfang (Stand Version 7)
- Schuss-Erfassung über ein Spielfeld mit antippbaren Zonen
  (`renderField`, `onZoneClick`, `confirmShot`), getrennt nach "wir"/Gegner.
- Bullys (`addBully`), Special Situations / Über-/Unterzahl (`addSpecial`).
- Kaderverwaltung: Spieler anlegen/bearbeiten, Nummern, Positionen,
  Anwesenheit; Massen-Import (`loadBulkRoster`, `addPlayer`, `togglePresent`).
- Aufstellung: Reihen/Slots per Klick und Drag&Drop (`renderLineup`, `slotDrop`),
  Eiszeiten (`computePlayerMinutes`) und Plus-Minus (`computePlusMinus`).
- Torwart-Statistik (`renderGoalieStats`).
- Statistik-Ansichten (`renderStats`, `renderPlaytimes`).
- Export: CSV (Schüsse, Specials, Kader) und vollständiger JSON-Export/Import
  (`exportData`, `importData`) zum Sichern/Übertragen zwischen Geräten.
- Neues Spiel zurücksetzen (`newGame`).

## Entwicklung
- Testen: Datei im Browser öffnen (Doppelklick). Kein Build nötig.
- Änderungen committen; größere Features in eigenem Commit, damit die Historie
  nachvollziehbar bleibt.
- Oberflächensprache: Deutsch. Code-Kommentare gern Deutsch.
- Dateiname aktuell `floorball_live_app_7.html` (die "7" ist eine gewachsene
  Versionsnummer; nicht mehr bei jeder Änderung hochzählen — dafür gibt es
  jetzt Git).

## Kontext
USV Jena e.V., Abteilung Floorball. Verantwortlich: Max Woetzel (Head-Coach Herren).
