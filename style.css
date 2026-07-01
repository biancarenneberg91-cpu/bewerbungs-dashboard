// Netlify Function: API für das Bewerbungs-Dashboard
// Verbindet sich direkt mit derselben Postgres-Datenbank wie der Discord-Bot.
// Aufruf über /.netlify/functions/api?action=...

const { Client } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;

function checkAuth(event) {
  const provided =
    event.headers["x-dashboard-password"] || event.headers["X-Dashboard-Password"];
  return DASHBOARD_PASSWORD && provided === DASHBOARD_PASSWORD;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (!DATABASE_URL) {
    return json(500, { error: "DATABASE_URL fehlt in den Netlify Environment Variables." });
  }

  // Login-Check läuft ohne Passwort-Header, alles andere braucht ihn
  const params = event.queryStringParameters || {};
  const action = params.action;

  if (action === "login") {
    const body = JSON.parse(event.body || "{}");
    if (DASHBOARD_PASSWORD && body.password === DASHBOARD_PASSWORD) {
      return json(200, { ok: true });
    }
    return json(401, { ok: false, error: "Falsches Passwort." });
  }

  if (!checkAuth(event)) {
    return json(401, { error: "Nicht angemeldet." });
  }

  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    if (action === "list" && event.httpMethod === "GET") {
      const status = params.status;
      let result;
      if (status && status !== "Alle") {
        result = await client.query(
          "SELECT * FROM applications WHERE status = $1 ORDER BY id DESC",
          [status]
        );
      } else {
        result = await client.query("SELECT * FROM applications ORDER BY id DESC");
      }
      const counts = await client.query(
        "SELECT status, COUNT(*)::int AS n FROM applications GROUP BY status"
      );
      return json(200, { applications: result.rows, counts: counts.rows });
    }

    if (action === "detail" && event.httpMethod === "GET") {
      const id = params.id;
      const result = await client.query("SELECT * FROM applications WHERE id = $1", [id]);
      if (result.rows.length === 0) return json(404, { error: "Nicht gefunden." });
      return json(200, { application: result.rows[0] });
    }

    if (action === "update-status" && event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { id, status } = body;
      const allowed = ["Angenommen", "Interview", "Abgelehnt", "Ausstehend"];
      if (!allowed.includes(status)) return json(400, { error: "Ungültiger Status." });
      await client.query(
        "UPDATE applications SET status = $1, reviewed_by = $2, reviewed_at = now() WHERE id = $3",
        [status, "Dashboard", id]
      );
      return json(200, { ok: true });
    }

    return json(400, { error: "Unbekannte Aktion." });
  } catch (err) {
    return json(500, { error: String(err) });
  } finally {
    await client.end();
  }
};
