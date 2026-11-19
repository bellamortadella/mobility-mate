/* Mobility Mate — app logic */

const SWITCH_SECS = 5;   // pause to swap sides on one-sided moves
const READY_SECS = 5;    // countdown before the first move
const DEFAULT_DUR = 45;
const DEFAULT_REST = 10;

const $app = document.getElementById("app");
const $sheet = document.getElementById("sheet-root");
const exById = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

/* ================= Icons ================= */
const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4.5" height="16" rx="1.5"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.5"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 5.2v13.6a1 1 0 0 1-1.55.83L7 13.2V18a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v4.8l9.45-6.43A1 1 0 0 1 18 5.2z"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5.2v13.6a1 1 0 0 0 1.55.83L17 13.2V18a1 1 0 0 0 2 0V6a1 1 0 0 0-2 0v4.8L7.55 4.37A1 1 0 0 0 6 5.2z"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
};

/* ================= Stick figure ================= */
const JOINTS = ["head", "neck", "mid", "hip", "eA", "hA", "eB", "hB", "kA", "fA", "kB", "fB"];
const SVGNS = "http://www.w3.org/2000/svg";
const liveFigures = new Set();

function lerpPose(a, b, t) {
  const out = {};
  for (const k of JOINTS) out[k] = [a[k][0] + (b[k][0] - a[k][0]) * t, a[k][1] + (b[k][1] - a[k][1]) * t];
  return out;
}
const ease = (x) => (1 - Math.cos(Math.PI * x)) / 2;
// 0 → hold start → move → hold end → move back
function pingPong(phase) {
  if (phase < 0.15) return 0;
  if (phase < 0.5) return ease((phase - 0.15) / 0.35);
  if (phase < 0.65) return 1;
  return 1 - ease((phase - 0.65) / 0.35);
}

class Figure {
  constructor(poses, { animate = true, period = 3600, stroke = 9, accent = false, flip = false, ground = true } = {}) {
    this.poses = poses;
    this.animate = animate;
    this.period = period;
    this.offset = Math.random() * period;
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 240 200");
    svg.setAttribute("class", "fig");
    const g = document.createElementNS(SVGNS, "g");
    if (flip) g.setAttribute("transform", "translate(240 0) scale(-1 1)");
    svg.appendChild(g);
    const ink = accent ? "var(--accent)" : "var(--ink)";
    const mk = (tag, attrs) => {
      const el = document.createElementNS(SVGNS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      g.appendChild(el);
      return el;
    };
    const line = { fill: "none", stroke: ink, "stroke-width": stroke, "stroke-linecap": "round", "stroke-linejoin": "round" };
    if (ground) mk("line", { x1: 30, x2: 210, y1: 188, y2: 188, stroke: "var(--line)", "stroke-width": 4, "stroke-linecap": "round" });
    this.armB = mk("path", { ...line, opacity: 0.35 });
    this.legB = mk("path", { ...line, opacity: 0.35 });
    this.spine = mk("path", line);
    this.legA = mk("path", line);
    this.armA = mk("path", line);
    this.headEl = mk("circle", { r: 13, fill: ink });
    this.svg = svg;
    this.draw(poses[0]);
    if (animate && poses.length > 1) liveFigures.add(this);
  }
  setPoses(poses) { this.poses = poses; this.draw(poses[0]); }
  draw(p) {
    const P = (k) => `${p[k][0].toFixed(1)} ${p[k][1].toFixed(1)}`;
    // Quadratic curve through neck → mid → hip (control point chosen so the curve passes through mid)
    const cx = 2 * p.mid[0] - (p.neck[0] + p.hip[0]) / 2;
    const cy = 2 * p.mid[1] - (p.neck[1] + p.hip[1]) / 2;
    this.spine.setAttribute("d", `M${P("neck")} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${P("hip")} M${P("head")} L${P("neck")}`);
    this.armA.setAttribute("d", `M${P("neck")} L${P("eA")} L${P("hA")}`);
    this.armB.setAttribute("d", `M${P("neck")} L${P("eB")} L${P("hB")}`);
    this.legA.setAttribute("d", `M${P("hip")} L${P("kA")} L${P("fA")}`);
    this.legB.setAttribute("d", `M${P("hip")} L${P("kB")} L${P("fB")}`);
    this.headEl.setAttribute("cx", p.head[0]);
    this.headEl.setAttribute("cy", p.head[1]);
  }
  tick(now) {
    const phase = ((now + this.offset) % this.period) / this.period;
    this.draw(lerpPose(this.poses[0], this.poses[1], pingPong(phase)));
  }
}

function mountFigure(container, poses, opts) {
  const f = new Figure(poses, opts);
  container.replaceChildren(f.svg);
  return f;
}

(function animLoop(now) {
  for (const f of liveFigures) {
    if (!f.svg.isConnected) { liveFigures.delete(f); continue; }
    f.tick(now);
  }
  requestAnimationFrame(animLoop);
})(performance.now());

/* ================= Storage ================= */
const STORE_KEY = "mobilitymate.flows.v1";
const uid = () => Math.random().toString(36).slice(2, 9);

function seedFlows() {
  return [{
    id: uid(), name: "Morning Unlock", rest: DEFAULT_REST,
    items: [
      { exId: "cat-cow", dur: 45 },
      { exId: "deep-squat", dur: 60 },
      { exId: "hip-flexor", dur: 45 },
      { exId: "forward-fold", dur: 45 },
    ],
  }];
}
function loadFlows() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw).map((f) => ({ ...f, items: f.items.filter((i) => exById[i.exId]) }));
  } catch (e) { /* storage unavailable */ }
  return seedFlows();
}
let flows = loadFlows();
function saveFlows() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(flows)); } catch (e) { /* ignore */ }
}

/* ================= Helpers ================= */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function fmt(secs) {
  secs = Math.max(0, Math.ceil(secs));
  const m = Math.floor(secs / 60), s = secs % 60;
  return m ? `${m}:${String(s).padStart(2, "0")}` : `${s}`;
}
function fmtLong(secs) {
  const m = Math.round(secs / 60);
  return m < 1 ? `${Math.round(secs)} sec` : `${m} min`;
}
function flowSeconds(flow) {
  if (!flow.items.length) return 0;
  let t = READY_SECS;
  flow.items.forEach((it, i) => {
    const ex = exById[it.exId];
    t += ex.sided ? it.dur * 2 + SWITCH_SECS : it.dur;
    if (i < flow.items.length - 1) t += flow.rest;
  });
  return t;
}
function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
function show(html) {
  $app.innerHTML = html;
  $app.classList.remove("screen-in");
  void $app.offsetWidth;
  $app.classList.add("screen-in");
  window.scrollTo(0, 0);
}

/* ================= Home ================= */
function renderHome() {
  stopPlayer();
  const cards = flows.map((f) => {
    const dots = f.items.map((it) => {
      const ex = exById[it.exId];
      const w = Math.max(10, Math.round((ex.sided ? it.dur * 2 : it.dur) / 4));
      return `<span style="width:${w}px"></span>`;
    }).join("");
    return `
      <div class="flow-card" data-play="${f.id}" role="button" tabindex="0">
        <div class="info">
          <h3>${esc(f.name || "Untitled flow")}</h3>
          <div class="meta">${f.items.length} move${f.items.length === 1 ? "" : "s"} · ${fmtLong(flowSeconds(f))}</div>
          <div class="dots">${dots}</div>
        </div>
        <button class="edit-chip" data-edit="${f.id}">Edit</button>
        <span class="play-chip">${ICON.play}</span>
      </div>`;
  }).join("");

  show(`
    <div class="hello">
      <div class="hero-fig" id="hero"></div>
      <h1>Mobility<br><em>Mate</em></h1>
      <p>Pick a flow. Move well.</p>
    </div>
    <div class="flows">${cards || `<div class="empty">No flows yet. Build your first one.</div>`}</div>
    <button class="btn btn-ghost new-flow" id="new">+ New flow</button>
  `);

  mountFigure(document.getElementById("hero"), EXERCISES[0].poses, { stroke: 11, ground: false, period: 3000 });
  document.getElementById("new").onclick = () => renderBuilder(null);
  $app.querySelectorAll("[data-edit]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); renderBuilder(b.dataset.edit); });
  $app.querySelectorAll("[data-play]").forEach((c) => c.onclick = () => {
    const f = flows.find((x) => x.id === c.dataset.play);
    if (f.items.length) startPlayer(f); else renderBuilder(f.id);
  });
}

/* ================= Builder ================= */
let draft = null;

function renderBuilder(flowId) {
  const existing = flows.find((f) => f.id === flowId);
  draft = existing
    ? JSON.parse(JSON.stringify(existing))
    : { id: uid(), name: "", rest: DEFAULT_REST, items: [], isNew: true };
  drawBuilder();
}

function drawBuilder() {
  const items = draft.items.map((it, i) => {
    const ex = exById[it.exId];
    return `
      <div class="item">
        <div class="thumb" data-thumb="${i}"></div>
        <div>
          <div class="name">${esc(ex.name)}</div>
          ${ex.sided ? `<div class="sub">Left + right</div>` : ""}
        </div>
        <div class="controls">
          <div class="tools">
            <button data-up="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move up">${ICON.up}</button>
            <button data-down="${i}" ${i === draft.items.length - 1 ? "disabled" : ""} aria-label="Move down">${ICON.down}</button>
            <button data-del="${i}" aria-label="Remove">${ICON.trash}</button>
          </div>
          <div class="stepper">
            <button data-dur="${i}" data-d="-15">−</button>
            <span class="val">${fmt(it.dur)}${it.dur < 60 ? "s" : ""}</span>
            <button data-dur="${i}" data-d="15">+</button>
          </div>
        </div>
      </div>`;
  }).join("");

  show(`
    <div class="topbar">
      <button class="icon-btn" id="back" aria-label="Back">${ICON.back}</button>
      <span class="muted">${draft.isNew ? "New flow" : "Edit flow"}</span>
      <span style="width:44px"></span>
    </div>
    <input class="title-input" id="title" placeholder="Name your flow" value="${esc(draft.name)}" maxlength="40" />
    <div class="row-setting">
      <label>Rest between moves</label>
      <div class="stepper">
        <button id="rest-minus">−</button>
        <span class="val">${draft.rest}s</span>
        <button id="rest-plus">+</button>
      </div>
    </div>
    <div class="items">${items}</div>
    <button class="btn btn-ghost add-btn" id="add">+ Add exercise</button>
    <div class="builder-foot">
      <div class="total">${draft.items.length ? `Total ≈ ${fmtLong(flowSeconds(draft))}` : "Add a few moves to get going"}</div>
      <button class="btn btn-primary" id="save" ${draft.items.length ? "" : "disabled style='opacity:.4'"}>Save flow</button>
      ${draft.isNew ? "" : `<button class="danger" id="delete">Delete flow</button>`}
    </div>
  `);

  $app.querySelectorAll("[data-thumb]").forEach((el) => {
    const ex = exById[draft.items[+el.dataset.thumb].exId];
    mountFigure(el, [ex.poses[1]], { animate: false, stroke: 12, ground: false });
  });

  const title = document.getElementById("title");
  title.oninput = () => (draft.name = title.value);
  if (draft.isNew && !draft.name) title.focus();

  document.getElementById("back").onclick = renderHome;
  document.getElementById("rest-minus").onclick = () => { draft.rest = Math.max(0, draft.rest - 5); drawBuilder(); };
  document.getElementById("rest-plus").onclick = () => { draft.rest = Math.min(60, draft.rest + 5); drawBuilder(); };
  document.getElementById("add").onclick = openLibrary;
  $app.querySelectorAll("[data-dur]").forEach((b) => b.onclick = () => {
    const it = draft.items[+b.dataset.dur];
    it.dur = Math.min(600, Math.max(15, it.dur + +b.dataset.d));
    drawBuilder();
  });
  const swap = (i, j) => { [draft.items[i], draft.items[j]] = [draft.items[j], draft.items[i]]; drawBuilder(); };
  $app.querySelectorAll("[data-up]").forEach((b) => b.onclick = () => swap(+b.dataset.up, +b.dataset.up - 1));
  $app.querySelectorAll("[data-down]").forEach((b) => b.onclick = () => swap(+b.dataset.down, +b.dataset.down + 1));
  $app.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { draft.items.splice(+b.dataset.del, 1); drawBuilder(); });

  document.getElementById("save").onclick = () => {
    if (!draft.items.length) return;
    const { isNew, ...clean } = draft;
    clean.name = clean.name.trim() || "My flow";
    const idx = flows.findIndex((f) => f.id === clean.id);
    if (idx >= 0) flows[idx] = clean; else flows.push(clean);
    saveFlows();
    renderHome();
  };
  const del = document.getElementById("delete");
  if (del) del.onclick = () => {
    if (!confirm(`Delete "${draft.name || "this flow"}"?`)) return;
    flows = flows.filter((f) => f.id !== draft.id);
    saveFlows();
    renderHome();
  };
}

function openLibrary() {
  const cards = EXERCISES.map((ex) => `
    <button class="lib-card" data-add="${ex.id}">
      <div class="lib-fig" data-libfig="${ex.id}"></div>
      <div class="name">${esc(ex.name)}</div>
      ${ex.sided ? `<span class="tag">L + R</span>` : ""}
    </button>`).join("");
  $sheet.innerHTML = `
    <div class="scrim" id="scrim"></div>
    <div class="sheet">
      <div class="grab"></div>
      <h2>Add a move</h2>
      <div class="lib">${cards}</div>
      <button class="btn btn-ink" id="done-add" style="width:100%;margin-top:16px">Done</button>
    </div>`;
  $sheet.querySelectorAll("[data-libfig]").forEach((el) => mountFigure(el, exById[el.dataset.libfig].poses, { stroke: 10 }));
  const close = () => { $sheet.innerHTML = ""; drawBuilder(); };
  document.getElementById("scrim").onclick = close;
  document.getElementById("done-add").onclick = close;
  $sheet.querySelectorAll("[data-add]").forEach((b) => b.onclick = () => {
    draft.items.push({ exId: b.dataset.add, dur: DEFAULT_DUR });
    b.classList.remove("added"); void b.offsetWidth; b.classList.add("added");
    vibrate(10);
  });
}

/* ================= Player ================= */
let player = null;
let wakeLock = null;

function buildSteps(flow) {
  const steps = [];
  const n = flow.items.length;
  flow.items.forEach((it, i) => {
    const ex = exById[it.exId];
    if (i === 0) steps.push({ type: "ready", dur: READY_SECS, ex, side: ex.sided ? "Left" : null, idx: i });
    if (ex.sided) {
      steps.push({ type: "work", dur: it.dur, ex, side: "Left", idx: i });
      steps.push({ type: "switch", dur: SWITCH_SECS, ex, side: "Right", idx: i });
      steps.push({ type: "work", dur: it.dur, ex, side: "Right", idx: i });
    } else {
      steps.push({ type: "work", dur: it.dur, ex, side: null, idx: i });
    }
    if (i < n - 1 && flow.rest > 0) {
      const nx = exById[flow.items[i + 1].exId];
      steps.push({ type: "rest", dur: flow.rest, ex: nx, side: nx.sided ? "Left" : null, idx: i + 1 });
    }
  });
  return steps;
}

async function requestWake() {
  try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) {}
}
function releaseWake() { try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; }
document.addEventListener("visibilitychange", () => { if (player && document.visibilityState === "visible") requestWake(); });

function startPlayer(flow) {
  stopPlayer();
  player = {
    flow, steps: buildSteps(flow), i: 0,
    elapsed: 0, last: performance.now(), paused: false, lastShown: null, raf: 0,
  };
  requestWake();
  drawPlayerShell();
  enterStep();
  player.raf = requestAnimationFrame(playerLoop);
}

function stopPlayer() {
  if (player) cancelAnimationFrame(player.raf);
  player = null;
  releaseWake();
}

function drawPlayerShell() {
  const segs = player.flow.items.map(() => "<span><i></i></span>").join("");
  show(`
    <div class="player">
      <div class="topbar">
        <button class="icon-btn" id="quit" aria-label="End flow">${ICON.close}</button>
        <div class="progress" id="progress">${segs}</div>
        <div class="counter" id="counter"></div>
      </div>
      <div class="stage">
        <div class="phase" id="phase"></div>
        <div class="ring-wrap">
          <svg class="ring" viewBox="0 0 100 100">
            <circle class="ring-track" cx="50" cy="50" r="46" />
            <circle class="ring-bar" id="ringbar" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0" />
          </svg>
          <div class="ring-fig" id="ringfig"></div>
        </div>
        <div class="time" id="time"></div>
        <div class="ex-name" id="exname"></div>
        <div id="side"></div>
        <div class="cue" id="cue"></div>
      </div>
      <div class="transport">
        <button class="icon-btn" id="prev" aria-label="Previous">${ICON.prev}</button>
        <button class="big" id="pp" aria-label="Pause">${ICON.pause}</button>
        <button class="icon-btn" id="next" aria-label="Next">${ICON.next}</button>
      </div>
    </div>
  `);
  player.fig = mountFigure(document.getElementById("ringfig"), player.steps[0].ex.poses, { stroke: 9, period: 3600 });
  document.getElementById("quit").onclick = () => { if (confirm("End this flow?")) renderHome(); };
  document.getElementById("pp").onclick = togglePause;
  document.getElementById("next").onclick = () => goStep(player.i + 1);
  document.getElementById("prev").onclick = () => goStep(player.elapsed > 2 || player.i === 0 ? player.i : player.i - 1);
}

function enterStep() {
  const s = player.steps[player.i];
  player.elapsed = 0;
  player.lastShown = null;
  const labels = { ready: "Get ready", work: "Move", switch: "Switch sides", rest: "Rest · up next" };
  const phase = document.getElementById("phase");
  phase.textContent = labels[s.type];
  phase.className = "phase" + (s.type === "work" ? "" : " rest");
  document.getElementById("ringbar").classList.toggle("rest", s.type !== "work");
  document.getElementById("exname").textContent = s.ex.name;
  document.getElementById("side").innerHTML = s.side ? `<span class="side-pill">${s.side.toUpperCase()}</span>` : "";
  document.getElementById("cue").textContent = s.type === "work" ? s.ex.cue : s.type === "switch" ? "Swap to the other side." : s.ex.cue;
  document.getElementById("counter").textContent = `${s.idx + 1}/${player.flow.items.length}`;
  player.fig.setPoses(s.ex.poses);
  // Mirror the figure for the right side so it reads as "the other leg"
  player.fig.svg.firstChild.setAttribute("transform", s.side === "Right" ? "translate(240 0) scale(-1 1)" : "");
  // Figure animates during work; holds start pose while resting/getting ready
  if (s.type === "work") liveFigures.add(player.fig); else liveFigures.delete(player.fig);
  if (s.type !== "work") player.fig.draw(s.ex.poses[0]);
  if (s.type === "work") vibrate([40, 60, 40]); else vibrate(30);
}

function goStep(i) {
  if (!player) return;
  if (i >= player.steps.length) return finishFlow();
  player.i = Math.max(0, i);
  enterStep();
}

function togglePause() {
  player.paused = !player.paused;
  const pp = document.getElementById("pp");
  pp.innerHTML = player.paused ? ICON.play : ICON.pause;
  pp.setAttribute("aria-label", player.paused ? "Resume" : "Pause");
  const s = player.steps[player.i];
  if (player.paused) liveFigures.delete(player.fig);
  else if (s.type === "work") liveFigures.add(player.fig);
}

function playerLoop(now) {
  if (!player) return;
  const dt = (now - player.last) / 1000;
  player.last = now;
  if (!player.paused) player.elapsed += Math.min(dt, 0.5);
  const s = player.steps[player.i];
  const left = s.dur - player.elapsed;
  if (left <= 0) { goStep(player.i + 1); if (player) player.raf = requestAnimationFrame(playerLoop); return; }

  // Ring empties as time runs out
  document.getElementById("ringbar").setAttribute("stroke-dashoffset", (100 * player.elapsed / s.dur).toFixed(2));
  const shown = fmt(left);
  if (shown !== player.lastShown) {
    const t = document.getElementById("time");
    t.textContent = shown;
    if (Math.ceil(left) <= 3) { t.classList.remove("tick"); void t.offsetWidth; t.classList.add("tick"); }
    player.lastShown = shown;
  }
  // Progress bar per exercise
  const segs = document.querySelectorAll("#progress i");
  segs.forEach((seg, k) => {
    let w = 0;
    if (k < s.idx) w = 100;
    else if (k === s.idx) {
      const mine = player.steps.filter((x) => x.idx === k && x.type !== "rest" && x.type !== "ready");
      const total = mine.reduce((a, x) => a + x.dur, 0);
      let done = 0;
      for (let j = 0; j < player.i; j++) {
        const x = player.steps[j];
        if (x.idx === k && x.type !== "rest" && x.type !== "ready") done += x.dur;
      }
      if (s.type !== "rest" && s.type !== "ready") done += player.elapsed;
      w = total ? (100 * done) / total : 0;
    }
    seg.style.width = w + "%";
  });
  player.raf = requestAnimationFrame(playerLoop);
}

function finishFlow() {
  const flow = player.flow;
  stopPlayer();
  vibrate([60, 80, 60, 80, 120]);
  const cheers = ["Nice work.", "Loose & ready.", "Look at you go.", "Smooth moves."];
  show(`
    <div class="done">
      <div class="done-fig" id="donefig"></div>
      <h2>${cheers[Math.floor(Math.random() * cheers.length)]}</h2>
      <p>${esc(flow.name)} · ${fmtLong(flowSeconds(flow))} of moving</p>
      <button class="btn btn-primary" id="home" style="width:100%">Back to flows</button>
      <button class="btn" id="again" style="width:100%">Go again</button>
    </div>
  `);
  mountFigure(document.getElementById("donefig"), CELEBRATE, { accent: true, period: 900, stroke: 10 });
  document.getElementById("home").onclick = renderHome;
  document.getElementById("again").onclick = () => startPlayer(flow);
}

/* ================= Boot ================= */
document.addEventListener("keydown", (e) => {
  if (!player) return;
  if (e.code === "Space") { e.preventDefault(); togglePause(); }
  if (e.code === "ArrowRight") goStep(player.i + 1);
  if (e.code === "ArrowLeft") goStep(player.i - 1);
});
renderHome();
