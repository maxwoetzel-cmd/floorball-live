# Projekt-Übergabe: Floorball Live (USV Jena Herren)

> Diese Datei an Claude Code zeigen oder reinkopieren, damit er den Stand kennt.
> Ergänzend: `CLAUDE.md` (Projektregeln), `apps-script/ANLEITUNG.md` (Einrichtung des Backends).
> **Das Repository ist öffentlich.** Deshalb stehen hier keine Web-App-Adresse, keine Skript-ID und kein API-Schlüssel.
> Die Adresse der Web-App steht in der Testanleitung in Drive (Abschnitt 5).

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
- Backend `Code.gs`: `doGet`, `getSchedule`, `getGames`, `getRoster`, `getGameLineup`, `getGameEvents`, `saveFile`, `readFile`, Testfunktionen. Aktuell Bereitstellung Version 5.
- Testanleitung für andere Tester (Google-Dokument, Stand 08.11.2026).

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
