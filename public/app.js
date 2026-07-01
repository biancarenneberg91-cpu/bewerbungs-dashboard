const API = "/.netlify/functions/api";

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const detailView = document.getElementById("detailView");
const logoutNav = document.getElementById("logoutNav");
const flashEl = document.getElementById("flash");

let currentFilter = "Alle";

function getPassword() {
  return sessionStorage.getItem("dashboard_password");
}

function showFlash(msg) {
  flashEl.textContent = msg;
  flashEl.style.display = "block";
  setTimeout(() => (flashEl.style.display = "none"), 3500);
}

function showView(view) {
  loginView.style.display = "none";
  dashboardView.style.display = "none";
  detailView.style.display = "none";
  logoutNav.style.display = getPassword() ? "block" : "none";
  view.style.display = "block";
}

async function apiCall(action, { method = "GET", body = null, params = {} } = {}) {
  const query = new URLSearchParams({ action, ...params }).toString();
  const headers = { "Content-Type": "application/json" };
  if (getPassword()) headers["x-dashboard-password"] = getPassword();
  const res = await fetch(`${API}?${query}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Fehler");
  return data;
}

// --- Login ---

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const pw = document.getElementById("passwordInput").value;
  try {
    const res = await fetch(`${API}?action=login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    if (data.ok) {
      sessionStorage.setItem("dashboard_password", pw);
      loadDashboard();
    } else {
      showFlash("Falsches Passwort.");
    }
  } catch (err) {
    showFlash("Verbindung fehlgeschlagen.");
  }
});

document.getElementById("logoutLink").addEventListener("click", (e) => {
  e.preventDefault();
  sessionStorage.removeItem("dashboard_password");
  showView(loginView);
});

// --- Dashboard ---

const STATUS_LIST = ["Alle", "Ausstehend", "Interview", "Angenommen", "Abgelehnt"];

async function loadDashboard() {
  try {
    const data = await apiCall("list", { params: { status: currentFilter } });
    renderFilters(data.counts);
    renderApps(data.applications);
    showView(dashboardView);
  } catch (err) {
    showFlash("Fehler beim Laden: " + err.message);
    showView(loginView);
  }
}

function renderFilters(countsRaw) {
  const counts = {};
  countsRaw.forEach((c) => (counts[c.status] = c.n));
  counts["Alle"] = countsRaw.reduce((sum, c) => sum + c.n, 0);

  const container = document.getElementById("filterButtons");
  container.innerHTML = "";
  STATUS_LIST.forEach((s) => {
    const btn = document.createElement("button");
    btn.className = "btn" + (currentFilter === s ? " btn-primary" : "");
    btn.style.fontSize = "12px";
    btn.style.padding = "7px 13px";
    btn.innerHTML = `${s} <span class="mono" style="opacity:0.7;">${counts[s] || 0}</span>`;
    btn.addEventListener("click", () => {
      currentFilter = s;
      loadDashboard();
    });
    container.appendChild(btn);
  });
}

function scoreRingSvg(score, size = 44, stroke = 3) {
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const pct = score != null ? (score / 10) * 100 : 0;
  const offset = c - (pct / 100) * c;
  const center = size / 2;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${stroke}"/>
      <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="var(--violet)" stroke-width="${stroke}"
              stroke-dasharray="${c}" stroke-dashoffset="${offset}"
              stroke-linecap="round" transform="rotate(-90 ${center} ${center})"/>
    </svg>`;
}

function renderApps(apps) {
  const list = document.getElementById("appsList");
  const empty = document.getElementById("emptyState");
  list.innerHTML = "";

  if (apps.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  apps.forEach((a) => {
    const borderColor =
      a.status === "Angenommen" ? "var(--green)" :
      a.status === "Interview" ? "var(--yellow)" :
      a.status === "Abgelehnt" ? "var(--red)" : "var(--border)";

    const el = document.createElement("div");
    el.className = "app-card";
    el.style.borderLeft = `3px solid ${borderColor}`;
    el.innerHTML = `
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
          <span style="font-weight: 600; font-size: 15px;">${escapeHtml(a.name || "")}</span>
          <span class="status-badge status-${a.status}">${a.status}</span>
        </div>
        <div style="color: var(--text-dim); font-size: 13px;">
          Rang: ${escapeHtml(a.rang || "")} · Discord: ${escapeHtml(a.discord_name || "")}
          · <span class="mono">#${a.id}</span>
        </div>
      </div>
      <div style="position: relative; width: 44px; height: 44px; flex-shrink: 0;">
        ${scoreRingSvg(a.ai_score)}
        <div class="mono" style="position: absolute; inset: 0; display: flex; align-items: center;
                    justify-content: center; font-size: 12px; font-weight: 600;
                    color: ${a.ai_score != null ? "var(--violet)" : "var(--text-dim)"};">
          ${a.ai_score != null ? a.ai_score : "–"}
        </div>
      </div>
    `;
    el.addEventListener("click", () => loadDetail(a.id));
    list.appendChild(el);
  });
}

// --- Detail ---

async function loadDetail(id) {
  try {
    const data = await apiCall("detail", { params: { id } });
    renderDetail(data.application);
    showView(detailView);
  } catch (err) {
    showFlash("Fehler beim Laden: " + err.message);
  }
}

function renderDetail(a) {
  const score = a.ai_score;
  const size = 64, stroke = 4;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;

  const fields = [
    ["Warum ins Team?", a.motivation],
    ["Erfahrungen", a.erfahrung],
    ["Stärken", a.staerken],
    ["Schwächen", a.schwaechen],
    ["Warum gerade diese Person", a.warum_du],
  ];

  document.getElementById("detailContent").innerHTML = `
    <div style="display: flex; align-items: center; gap: 14px; margin: 18px 0 28px;">
      <h1 style="margin: 0; font-size: 26px;">${escapeHtml(a.name || "")}</h1>
      <span class="status-badge status-${a.status}">${a.status}</span>
      <span class="mono" style="color: var(--text-dim); font-size: 13px;">#${a.id}</span>
    </div>

    <div style="display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px; align-items: start;">

      <div class="card">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px;">
          <div><div class="mono meta-label">ALTER</div>${escapeHtml(a.age || "")}</div>
          <div><div class="mono meta-label">DISCORD</div>${escapeHtml(a.discord_name || "")}</div>
          <div><div class="mono meta-label">INGAME</div>${escapeHtml(a.ingame_name || "")}</div>
          <div><div class="mono meta-label">RANG</div>${escapeHtml(a.rang || "")}</div>
          <div><div class="mono meta-label">STUNDEN/WOCHE</div>${escapeHtml(a.stunden || "")}</div>
          <div><div class="mono meta-label">REGELN GELESEN</div>${escapeHtml(a.regeln_gelesen || "")}</div>
        </div>
        ${fields.map(([label, value]) => `
          <div class="field-label">${label}</div>
          <div class="field-value">${escapeHtml(value || "")}</div>
        `).join("")}
      </div>

      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="background: linear-gradient(180deg, rgba(155,107,255,0.08), var(--surface));
                    border: 1px solid rgba(155,107,255,0.25); border-radius: 12px; padding: 24px; text-align: center;">
          <div class="mono" style="font-size: 11px; color: var(--violet); letter-spacing: 0.05em; margin-bottom: 14px;">
            KI-EINSCHÄTZUNG
          </div>
          <div style="position: relative; width: ${size}px; height: ${size}px; margin: 0 auto 14px;">
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
              <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${stroke}"/>
              <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--violet)" stroke-width="${stroke}"
                      stroke-dasharray="${c}" stroke-dashoffset="${c}"
                      stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})" id="scoreRing"
                      style="transition: stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1);"/>
            </svg>
            <div class="mono" style="position: absolute; inset: 0; display: flex; align-items: center;
                        justify-content: center; font-size: 18px; font-weight: 600;">
              ${score != null ? score : "–"}<span style="font-size: 11px; color: var(--text-dim);">/10</span>
            </div>
          </div>
          <div style="font-size: 13px; color: var(--text); line-height: 1.5; text-align: left;">
            ${escapeHtml(a.ai_summary || "Keine KI-Auswertung verfügbar.")}
          </div>
          ${a.ai_risiken ? `
            <div style="margin-top: 14px; text-align: left;">
              <div style="font-size: 11px; font-weight: 600; color: var(--yellow); margin-bottom: 4px;">RISIKEN</div>
              <div style="font-size: 13px; color: var(--text-dim); line-height: 1.5;">${escapeHtml(a.ai_risiken)}</div>
            </div>` : ""}
          <div style="margin-top: 14px; font-size: 12px;">
            Empfehlung: <strong style="color: var(--violet);">${escapeHtml(a.ai_empfehlung || "n/a")}</strong>
          </div>
        </div>

        <div class="card" style="padding: 20px;">
          <div class="mono" style="font-size: 11px; color: var(--text-dim); margin-bottom: 12px;">ENTSCHEIDUNG</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn btn-green" data-status="Angenommen">✓ Annehmen</button>
            <button class="btn btn-yellow" data-status="Interview">🎙 Zum Interview einladen</button>
            <button class="btn btn-red" data-status="Abgelehnt">✕ Ablehnen</button>
          </div>
          ${a.reviewed_by ? `<div style="margin-top: 12px; font-size: 12px; color: var(--text-dim);">Zuletzt bearbeitet von ${escapeHtml(a.reviewed_by)}</div>` : ""}
        </div>
      </div>
    </div>
  `;

  requestAnimationFrame(() => {
    const ring = document.getElementById("scoreRing");
    if (ring && score != null) {
      const offset = c - (score / 10) * c;
      requestAnimationFrame(() => (ring.style.strokeDashoffset = offset));
    }
  });

  document.querySelectorAll("[data-status]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await apiCall("update-status", { method: "POST", body: { id: a.id, status: btn.dataset.status } });
        showFlash(`Status auf '${btn.dataset.status}' gesetzt.`);
        loadDetail(a.id);
      } catch (err) {
        showFlash("Fehler: " + err.message);
      }
    });
  });
}

document.getElementById("backLink").addEventListener("click", (e) => {
  e.preventDefault();
  loadDashboard();
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// --- Start ---

if (getPassword()) {
  loadDashboard();
} else {
  showView(loginView);
}
