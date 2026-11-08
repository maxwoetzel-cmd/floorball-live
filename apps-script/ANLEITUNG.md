# Apps-Script-Backend einrichten (einmalig, ca. 10 Minuten)

Dieses Backend liefert die App aus, fragt den Saisonmanager ab (Schlüssel geheim)
und speichert in Drive. Es läuft im Konto von Max, Zugriff nur für USV-Jena-Konten.

## 1. Projekt anlegen
1. https://script.google.com öffnen (mit dem USV-Konto) und **Neues Projekt** wählen.
2. Projekt umbenennen in **Floorball Live**.
3. Den Inhalt von `Code.gs` aus diesem Ordner in die Datei `Code.gs` im Editor einfügen
   (alles Vorhandene ersetzen).
4. Links auf das Zahnrad **Projekteinstellungen** gehen und
   **"appsscript.json"-Manifestdatei im Editor anzeigen** anhaken. Danach im Editor die Datei
   `appsscript.json` öffnen und mit dem Inhalt aus diesem Ordner ersetzen.

## 2. Saisonmanager-Schlüssel hinterlegen
1. Projekteinstellungen, unten **Skripteigenschaften**, **Skripteigenschaft hinzufügen**.
2. Name: `SAISONMANAGER_KEY`, Wert: dein Schlüssel. Speichern.
3. Den Schlüssel nirgends sonst eintragen (nicht in Code, Chat oder Repository).

## 3. Testen
1. Im Editor oben die Funktion `testDrive` wählen und **Ausführen**. Berechtigungen bestätigen
   (Drive und externe Anfragen). Danach liegt `floorball_test.json` in "Exporte".
2. Funktion `testSchedule` ausführen. Im **Ausführungsprotokoll** erscheint der Anfang des Spielplans.
   Diesen Anfang (ohne Schlüssel) an Claude schicken.
3. Für den Kader: Skripteigenschaft `PROBE_PATH` mit dem Pfad aus der Saisonmanager-Doku
   anlegen (ohne führenden Schrägstrich) und `testPfad` ausführen.

## 4. Als Web-App bereitstellen
1. **Bereitstellen > Neue Bereitstellung > Typ: Web-App.**
2. Ausführen als: **Ich**. Zugriff: **Nur Personen aus USV Jena** (Domain).
3. Bereitstellen, die Web-App-URL kopieren. Das ist der Link zur App.
4. Auf dem Android-Tablet in Chrome öffnen und **Zum Startbildschirm hinzufügen**.

## Aktualisieren
Die Web-App lädt die App aus GitHub (`main`, Datei `floorball_live_app_7.html`). Ein neuer Stand
der App ist also nur ein Push. Er ist nach spätestens ca. 10 Minuten da (5 Minuten Zwischenspeicher
im Backend plus der von GitHub). Fällt GitHub aus, nimmt das Backend die neueste gleichnamige Datei
aus dem Drive-Ordner "Floorball Live" (Rückfall).

Das Backend selbst (`Code.gs`) ändert sich selten. Dann den neuen Code einfügen, speichern und
**Bereitstellen > Bereitstellungen verwalten > Bearbeiten (Stift) > Version: Neue Version > Bereitstellen**.
Nicht "Neue Bereitstellung" wählen, das erzeugt eine neue Adresse.

**Sicherheit:** Wer das GitHub-Repository ändern kann, bestimmt den Code, der in der Web-App läuft
(auch auf die Funktionen `saveFile`, `readFile`, `getGames`, `getRoster`). Das GitHub-Konto sollte
deshalb mit Zwei-Faktor-Anmeldung geschützt sein. Der Saisonmanager-Schlüssel ist aus der App heraus
nicht lesbar.

## Gemeinsam erfassen (mehrere Geräte)
Ab Backend-Stand mit `syncExchange` (08.11.2026) können mehrere Geräte am selben Spiel arbeiten.
Dafür muss `Code.gs` einmal als **neue Version der bestehenden Bereitstellung** veröffentlicht werden
(siehe oben). Ohne diese Version zeigt die App beim Einschalten von „Gemeinsam mit anderen Geräten“
nur „keine Verbindung“, alles andere läuft normal.

Speicher: Versionsnummer in der Skripteigenschaft `SYNC_VERSION` (legt das Skript selbst an),
Inhalt in `Exporte/sync_spiel.json`. Beide nicht von Hand ändern. Es darf nur **eine** Datei
`sync_spiel.json` geben.

## Saisonauswertung
Ab Backend-Stand mit `listExports` (08.11.2026) lädt „Saison aus Drive laden“ alle Exporte aus dem
Ordner „Exporte“. Auch dafür ist einmal eine **neue Version der bestehenden Bereitstellung** nötig.
Ohne sie meldet der Knopf einen Fehler; die Auswahl von Exportdateien funktioniert trotzdem.

## Freigabeliste (wer darf die App nutzen)
Standard: Jedes Konto der Domain (USV Jena e.V.) kann die Web-App öffnen und nutzen. Alles läuft im Namen von Max.
Mit der **Skripteigenschaft `ALLOWED_USERS`** lässt sich das auf bestimmte Konten beschränken:

1. Projekteinstellungen (Zahnrad) → ganz unten **Skripteigenschaften** → **Skripteigenschaft hinzufügen**.
2. Name: `ALLOWED_USERS`. Wert: die E-Mail-Adressen, getrennt durch Komma, Semikolon, Leerzeichen oder Zeilenumbruch,
   z. B. `floorball-tablet@usvjena.de, paulina.jacob@usvjena.de`. Speichern.
3. Im Editor die Funktion `testZugriff` ausführen. Das Protokoll zeigt, ob die Liste aktiv ist und ob dein Konto freigegeben ist.

Voraussetzung: `appsscript.json` muss den Bereich `https://www.googleapis.com/auth/userinfo.email` enthalten (steht in der Datei in diesem Ordner).
Nach dem Einfügen einmal eine Funktion im Editor ausführen und die Berechtigung bestätigen, dann neue Version bereitstellen. Ohne diesen Bereich
ist die Adresse nicht lesbar und eine gefüllte Liste sperrt alle aus (außer dem Editor-Zugang von Max). Erst `testZugriff` prüfen, dann die Liste füllen.

Verhalten:
- **Leer oder nicht vorhanden:** alle Konten der Domain dürfen (bisheriges Verhalten).
- **Gefüllt:** nur die Konten in der Liste **und der Besitzer des Projekts (Max)**. Alle anderen sehen beim Öffnen „Kein Zugriff“
  und können auch keine Server-Funktionen (Speichern, Spielplan, Saisonauswertung, gemeinsames Erfassen) nutzen.
- Groß-/Kleinschreibung der Adressen ist egal. Das Tablet-Konto (`floorball-tablet@usvjena.de`) und alle Coaches, die erfassen sollen,
  müssen in der Liste stehen, sonst sperren sie sich aus.
- Wer sich versehentlich aussperrt: Max (Besitzer) kommt immer hinein und kann die Eigenschaft ändern oder löschen.
- Der Code der Prüfung steht in `apps-script/Code.gs` (`allowedList_`, `isAllowed_`, `assertAllowed_`). Dafür ist einmal eine
  **neue Version der bestehenden Bereitstellung** nötig. Die Adressen stehen nur in der Skripteigenschaft, nicht im öffentlichen Repository.

## Bekannte Grenzen (nicht getestet)
- Die App braucht beim Laden Internet. Ohne Netz startet sie nicht.
- Im Apps-Script-Fenster kann der Browserspeicher (`localStorage`) anders reagieren als bei der
  lokalen Datei. Deshalb wird der Spielstand zusätzlich nach Drive gespeichert (nächste Stufe).
