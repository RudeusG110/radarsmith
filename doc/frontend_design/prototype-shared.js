/* ============================================================
   RadarSmith prototype — shared mock backend + rendering helpers
   Used by flow-2-prototype.html and flow-3-prototype.html.
   Stands in for the 8-endpoint FastAPI contract (all mock/in-memory).
   Each flow file defines its own router (goHome/goLibrary/goWorkspace,
   currentRadar, render) and reuses everything here.
   ============================================================ */

const QUADRANTS = ["Techniques", "Platforms", "Tools", "Languages & Frameworks"];
const RINGS = ["Adopt", "Trial", "Assess", "Caution"];
const RING_COLORS = ["var(--ring-adopt)", "var(--ring-trial)", "var(--ring-assess)", "var(--ring-caution)"];

let radars = [
    {
        id: "r-bundled", name: "Engineering Radar", purpose: "Our current tech stances",
        bundled: true,
        blips: [
            { id: "b1", name: "PostgreSQL", q: 2, r: 0, desc: "Primary relational store. See https://postgresql.org" },
            { id: "b2", name: "React", q: 3, r: 0, desc: "Default UI library for web apps." },
            { id: "b3", name: "Kafka", q: 1, r: 1, desc: "Event streaming backbone." },
            { id: "b4", name: "Deno", q: 3, r: 2, desc: "Evaluating as a Node alternative." },
            { id: "b5", name: "Trunk-based dev", q: 0, r: 0, desc: "Short-lived branches, frequent merges." },
            { id: "b6", name: "GraphQL", q: 0, r: 2, desc: "Assessing for aggregation layer." },
            { id: "b7", name: "Terraform", q: 2, r: 1, desc: "Infra as code for cloud resources." },
            { id: "b8", name: "Service mesh", q: 1, r: 3, desc: "Complexity outweighs benefit for us now." },
        ],
    },
    {
        id: "r-data", name: "Data Platform Radar", purpose: "Warehouse & pipeline choices",
        bundled: false,
        blips: [
            { id: "d1", name: "dbt", q: 0, r: 0, desc: "Transformation layer standard." },
            { id: "d2", name: "Snowflake", q: 1, r: 1, desc: "Trialling as warehouse." },
        ],
    },
    {
        id: "r-sec", name: "Security Radar", purpose: "Controls and tooling stances",
        bundled: false,
        blips: [
            { id: "s1", name: "SBOMs", q: 0, r: 1, desc: "Trialling software bills of materials." },
            { id: "s2", name: "Vault", q: 2, r: 0, desc: "Secrets management standard." },
            { id: "s3", name: "Passkeys", q: 0, r: 2, desc: "Assessing for internal auth." },
        ],
    },
];

/* ---------------- shared UI state ---------------- */
let selectedBlipId = null;
let narrowTab = "table";
let editingBlipId = null;
let confirmAction = null;

const $ = (id) => document.getElementById(id);
const view = document.getElementById("view");

/* ---------------- radar geometry (deterministic, id-seeded) ---------------- */
function seededJitter(id, salt) {
    let h = 2166136261;
    const s = id + ":" + salt;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000) / 1000;
}
function markerPos(b, R) {
    const startDeg = b.q * 90;
    const aFrac = 0.15 + 0.7 * seededJitter(b.id, "a");
    const angle = (startDeg + aFrac * 90) * Math.PI / 180;
    const ringInner = b.r * R / 4;
    const ringOuter = (b.r + 1) * R / 4;
    const rFrac = 0.25 + 0.5 * seededJitter(b.id, "r");
    const rad = ringInner + rFrac * (ringOuter - ringInner);
    return { x: Math.cos(angle) * rad, y: -Math.sin(angle) * rad };
}

function renderRadar(radar, size = 460, opts = {}) {
    const cx = size / 2, cy = size / 2, R = size / 2 - 30;
    let svg = `<svg class="radar" viewBox="0 0 ${size} ${size}" role="graphics-document" aria-label="Radar for ${escapeHtml(radar.name)}">`;
    for (let i = 4; i >= 1; i--) {
        const rr = i * R / 4;
        svg += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${i % 2 ? '#151c25' : '#111820'}" stroke="var(--border)" stroke-width="1"/>`;
    }
    svg += `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="var(--border)"/>`;
    svg += `<line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="var(--border)"/>`;
    for (let i = 0; i < 4; i++) {
        const rr = (i + 0.5) * R / 4;
        svg += `<text class="ring-label" x="${cx}" y="${cy - rr + 3}" text-anchor="middle">${RINGS[i]}</text>`;
    }
    const ql = [
        { x: cx + R * 0.55, y: cy - R * 0.9, t: QUADRANTS[0] },
        { x: cx - R * 0.55, y: cy - R * 0.9, t: QUADRANTS[1] },
        { x: cx - R * 0.55, y: cy + R * 0.98, t: QUADRANTS[2] },
        { x: cx + R * 0.55, y: cy + R * 0.98, t: QUADRANTS[3] },
    ];
    ql.forEach(l => { svg += `<text class="quad-label" x="${l.x}" y="${l.y}" text-anchor="middle">${l.t}</text>`; });
    radar.blips.forEach((b, idx) => {
        const p = markerPos(b, R);
        const x = cx + p.x, y = cy + p.y;
        const sel = b.id === selectedBlipId ? "selected" : "";
        svg += `<g class="marker ${sel}" role="graphics-symbol img" aria-label="${escapeHtml(b.name)}, ${QUADRANTS[b.q]}, ${RINGS[b.r]}" onclick="selectBlip('${b.id}')" tabindex="0">
        <circle cx="${x}" cy="${y}" r="12" fill="${RING_COLORS[b.r]}" stroke="#0f1419" stroke-width="1.5"/>
        <text x="${x}" y="${y + 4}" text-anchor="middle">${idx + 1}</text></g>`;
    });
    svg += `</svg>`;
    return svg;
}

/* compact non-interactive thumbnail for cards/hero */
function renderThumbnail(radar, size = 200) {
    const cx = size / 2, cy = size / 2, R = size / 2 - 6;
    let svg = `<svg viewBox="0 0 ${size} ${size}" width="100%" role="img" aria-label="${escapeHtml(radar.name)} thumbnail">`;
    for (let i = 4; i >= 1; i--) svg += `<circle cx="${cx}" cy="${cy}" r="${i * R / 4}" fill="${i % 2 ? '#151c25' : '#111820'}" stroke="var(--border)"/>`;
    svg += `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="var(--border)"/><line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="var(--border)"/>`;
    radar.blips.forEach(b => {
        const p = markerPos(b, R); const x = cx + p.x, y = cy + p.y;
        svg += `<circle cx="${x}" cy="${y}" r="4" fill="${RING_COLORS[b.r]}"/>`;
    });
    return svg + `</svg>`;
}

/* ---------------- shared table + detail bar ---------------- */
function renderTable(radar) {
    if (radar.blips.length === 0) {
        return `<div style="padding:24px;color:var(--muted);text-align:center">No blips yet. Use <strong>+ Add Blip</strong> to place your first one.</div>`;
    }
    const rows = radar.blips.map(b => `
    <tr class="${b.id === selectedBlipId ? 'selected' : ''}" onclick="selectBlip('${b.id}')">
      <td class="blip-name">${escapeHtml(b.name)}</td>
      <td><select class="cell" onclick="event.stopPropagation()" onchange="changePlacement('${b.id}','q',this)">
            ${QUADRANTS.map((q, i) => `<option value="${i}" ${i === b.q ? 'selected' : ''}>${q}</option>`).join("")}
          </select><span class="saving hidden" id="sv-q-${b.id}">saving…</span></td>
      <td><select class="cell" onclick="event.stopPropagation()" onchange="changePlacement('${b.id}','r',this)">
            ${RINGS.map((r, i) => `<option value="${i}" ${i === b.r ? 'selected' : ''}>${r}</option>`).join("")}
          </select><span class="saving hidden" id="sv-r-${b.id}">saving…</span></td>
      <td style="text-align:right"><button class="icon-btn" onclick="event.stopPropagation(); askDeleteBlip('${b.id}')">🗑</button></td>
    </tr>`).join("");
    return `<table class="blips"><thead><tr><th>Name</th><th>Quadrant</th><th>Ring</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderDetailBar(radar) {
    const b = radar.blips.find(x => x.id === selectedBlipId);
    if (!b) return `<div class="detailbar empty">Select a blip (row or marker) to see its full details here.</div>`;
    return `<div class="detailbar">
      <span class="d-name">${escapeHtml(b.name)}</span>
      <span class="d-place">${QUADRANTS[b.q]} · ${RINGS[b.r]}</span>
      <span class="d-desc">${linkify(b.desc)}</span>
      <button class="btn small" onclick="openBlipDrawer('${b.id}')">Edit</button></div>`;
}

/* ---------------- shared interactions ---------------- */
function selectBlip(id) {
    selectedBlipId = (selectedBlipId === id ? null : id);
    render();
    const row = document.querySelector("tr.selected");
    if (row) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function setTab(t) { narrowTab = t; render(); }

function changePlacement(id, dim, sel) {
    const radar = currentRadar();
    const b = radar.blips.find(x => x.id === id);
    const badge = $(`sv-${dim}-${id}`);
    if (badge) badge.classList.remove("hidden");
    setTimeout(() => {
        if (dim === "q") b.q = parseInt(sel.value, 10); else b.r = parseInt(sel.value, 10);
        render();
    }, 350);
}

/* ---- create radar ---- */
function openCreate() { $("createScrim").classList.add("open"); $("createDialog").classList.add("open"); $("newName").value = ""; $("newPurpose").value = ""; setTimeout(() => $("newName").focus(), 50); }
function closeCreate() { $("createScrim").classList.remove("open"); $("createDialog").classList.remove("open"); }
function submitCreate() {
    const name = $("newName").value.trim();
    if (!name) { $("newName").focus(); $("newName").style.borderColor = "var(--danger)"; return; }
    const id = "r-" + Date.now();
    radars.push({ id, name, purpose: $("newPurpose").value.trim(), bundled: false, blips: [] });
    closeCreate();
    goWorkspace(id);
}

/* ---- blip drawer ---- */
function openBlipDrawer(id) {
    const radar = currentRadar();
    editingBlipId = id;
    $("drawerTitle").textContent = id ? "Edit blip" : "Add blip";
    $("blipQuad").innerHTML = QUADRANTS.map((q, i) => `<option value="${i}">${q}</option>`).join("");
    $("blipRing").innerHTML = RINGS.map((r, i) => `<option value="${i}">${r}</option>`).join("");
    if (id) {
        const b = radar.blips.find(x => x.id === id);
        $("blipName").value = b.name; $("blipDesc").value = b.desc; $("blipQuad").value = b.q; $("blipRing").value = b.r;
    } else {
        $("blipName").value = ""; $("blipDesc").value = ""; $("blipQuad").value = 0; $("blipRing").value = 0;
    }
    $("drawerScrim").classList.add("open"); $("drawer").classList.add("open");
    setTimeout(() => $("blipName").focus(), 50);
}
function closeDrawer() { $("drawerScrim").classList.remove("open"); $("drawer").classList.remove("open"); }
function saveDrawer() {
    const radar = currentRadar();
    const name = $("blipName").value.trim();
    const desc = $("blipDesc").value.trim();
    if (!name || !desc) { alert("Name and description are required."); return; }
    const q = parseInt($("blipQuad").value, 10), r = parseInt($("blipRing").value, 10);
    if (editingBlipId) {
        const b = radar.blips.find(x => x.id === editingBlipId);
        b.name = name; b.desc = desc; b.q = q; b.r = r; selectedBlipId = b.id;
    } else {
        const id = "b-" + Date.now();
        radar.blips.push({ id, name, desc, q, r }); selectedBlipId = id;
    }
    closeDrawer(); render();
}

/* ---- delete confirm ---- */
function askDeleteRadar(id) {
    const r = radars.find(x => x.id === id);
    $("confirmTitle").textContent = `Delete “${r.name}”?`;
    $("confirmBody").textContent = `This permanently removes the radar and all ${r.blips.length} of its blips. This cannot be undone.`;
    $("confirmBtn").textContent = "Delete radar";
    confirmAction = () => { radars = radars.filter(x => x.id !== id); closeConfirm(); if (typeof route !== "undefined" && route.radarId === id) goHome(); else render(); };
    openConfirm();
}
function askDeleteBlip(id) {
    const radar = currentRadar();
    const b = radar.blips.find(x => x.id === id);
    $("confirmTitle").textContent = `Delete “${b.name}”?`;
    $("confirmBody").textContent = `This blip will be removed from the radar. This cannot be undone.`;
    $("confirmBtn").textContent = "Delete blip";
    confirmAction = () => { radar.blips = radar.blips.filter(x => x.id !== id); if (selectedBlipId === id) selectedBlipId = null; closeConfirm(); render(); };
    openConfirm();
}
function openConfirm() { $("confirmScrim").classList.add("open"); $("confirmDialog").classList.add("open"); }
function closeConfirm() { $("confirmScrim").classList.remove("open"); $("confirmDialog").classList.remove("open"); confirmAction = null; }

/* ---- utils ---- */
function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function linkify(s) { return escapeHtml(s).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'); }

document.addEventListener("DOMContentLoaded", () => {
    const btn = $("confirmBtn");
    if (btn) btn.addEventListener("click", () => { if (confirmAction) confirmAction(); });
});
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); closeCreate(); closeConfirm(); } });
