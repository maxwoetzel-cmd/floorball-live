# Floorball Live

Live-Statistik- und Analyse-App für die Spiele der USV-Jena-Floorball-Herren.
Eine einzige HTML-Datei, die komplett offline im Browser läuft — kein Server,
keine Installation.

## Öffnen
- **Am Computer:** `floorball_live_app_7.html` doppelklicken (öffnet im
  Standardbrowser).
- **Am Handy:** Datei im Browser öffnen und über das Teilen-Menü
  "Zum Startbildschirm hinzufügen" — dann startet sie wie eine App.

## Funktionen
Schuss-Erfassung über Spielfeld-Zonen, Bullys, Über-/Unterzahl, Kader- und
Aufstellungsverwaltung mit Eiszeiten und Plus-Minus, Torwart-Statistik sowie
CSV- und JSON-Export.

## Daten sichern
Der Spielstand wird im Browser gespeichert. Zum Sichern oder Übertragen auf ein
anderes Gerät den **JSON-Export** in der App nutzen.

## Entwicklung
Siehe `CLAUDE.md` für den Projektkontext. Wichtigste Regel: alles bleibt in der
einen HTML-Datei (keine externen Abhängigkeiten), damit die App offline als
lokale Datei funktioniert.
