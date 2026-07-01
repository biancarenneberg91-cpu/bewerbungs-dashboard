# Bewerbungs-Dashboard (Netlify)

Statische Webseite (HTML/CSS/JS) + kleine Serverfunktion, die sich direkt mit
deiner Postgres-Datenbank auf Railway verbindet. Ersetzt die vorherige
Flask-Dashboard-Version.

## Was hier drin ist

```
public/           -> die eigentliche Webseite (Login, Übersicht, Detail)
netlify/functions/api.js  -> kleine Funktion, die Daten aus der DB liest/schreibt
netlify.toml       -> sagt Netlify, wo beides liegt
package.json        -> eine Abhängigkeit (pg, zum Sprechen mit Postgres)
```

## Setup

### 1. GitHub-Repo
Diesen ganzen Ordner in ein neues GitHub-Repo hochladen (z.B. `bewerbungs-dashboard`).

### 2. Bei Netlify importieren
- app.netlify.com -> "Add new site" -> "Import an existing project"
- GitHub verbinden, das Repo auswählen
- Build-Einstellungen übernimmt Netlify automatisch aus `netlify.toml` — nichts einzutragen nötig

### 3. Umgebungsvariablen setzen
Bei Netlify: Site settings -> Environment variables -> "Add a variable"

```
DATABASE_URL=deine_railway_postgres_url
DASHBOARD_PASSWORD=ein_sicheres_passwort
```

Die `DATABASE_URL` findest du in Railway beim Postgres-Service unter "Variables" —
dort auf das Auge-Symbol klicken, um den vollen Connection-String zu sehen, und
kopieren (beginnt mit `postgresql://`).

### 4. Deploy
Nach dem Setzen der Variablen: "Deploys" -> "Trigger deploy" -> "Deploy site".
Netlify gibt dir eine URL wie `https://irgendwas.netlify.app` — darüber ist das
Dashboard erreichbar.

## Wie es funktioniert

- Die Seite selbst ist komplett statisch (kein Server, der laufen muss)
- Beim Login wird dein Passwort im Browser gemerkt (nur für die Sitzung) und bei
  jeder Anfrage mitgeschickt
- Die kleine Funktion `api.js` prüft das Passwort und holt/ändert dann Daten in
  der Datenbank — läuft nur kurz bei jedem Klick, nicht dauerhaft
- Gleiche Datenbank wie der Discord-Bot, also alles bleibt synchron: Status-Änderungen
  im Dashboard sieht der Bot genauso wie umgekehrt

## Hinweis zur Sicherheit

Das Passwort schützt die Seite vor zufälligen Besuchern, ist aber kein vollwertiges
Login-System mit Benutzerkonten. Für ein kleines Team reicht das erfahrungsgemäß aus
(genauso wie bei deiner NEXUS-GAMES-Seite), aber teile das Passwort nur mit Leuten,
die wirklich Zugriff haben sollen.
