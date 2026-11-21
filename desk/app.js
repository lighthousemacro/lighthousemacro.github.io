/* Pharos Desk. The editor, the reader, and the three agents. */
(function () {
  "use strict";

  var D = window.LhmDesk;
  var KEY = "lhm-pharos-desk-v1";
  var state = load();
  var ui = { agent: "seo", mode: "write", focusTitle: false, paintQueued: false };
  var generation = 0;

  var live = document.getElementById("live");
  var toast = document.getElementById("toast");
  document.body.addEventListener("click", onClick);
  document.body.addEventListener("input", onField);
  document.body.addEventListener("change", onField);
  window.addEventListener("hashchange", route);
  window.addEventListener("storage", function (event) {
    if (event.key !== KEY || !event.newValue) return;
    var saved = readSaved();
    if (!saved) return;
    state.notes = saved.notes.filter(function (note) { return saved.deleted.indexOf(note.id) === -1; });
    state.deleted = saved.deleted;
    if (!state.notes.some(function (note) { return note.id === state.activeId; })) state.activeId = state.notes[0] ? state.notes[0].id : "";
    generation += 1;
    route();
  });

  if (!location.hash || location.hash === "#" || location.hash === "#/") {
    var opening = state.activeId || (state.notes[0] && state.notes[0].id) || "";
    if (opening) history.replaceState(null, "", "#/note/" + encodeURIComponent(opening));
  }
  route();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.notes)) return fresh();
      var deleted = Array.isArray(parsed.deleted) ? parsed.deleted.map(String) : [];
      var notes = parsed.notes.map(D.sanitize).filter(function (note) { return deleted.indexOf(note.id) === -1; });
      var activeId = notes.some(function (note) { return note.id === parsed.activeId; }) ? parsed.activeId : (notes[0] ? notes[0].id : "");
      return { notes: notes, activeId: activeId, deleted: deleted };
    } catch (error) {
      return fresh();
    }
  }

  function fresh() {
    var notes = D.seeds.map(D.clone);
    return { notes: notes, activeId: notes[0].id, deleted: [] };
  }

  function readSaved() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.notes)) return null;
      return {
        notes: parsed.notes.map(D.sanitize),
        activeId: parsed.activeId || "",
        deleted: Array.isArray(parsed.deleted) ? parsed.deleted.map(String) : []
      };
    } catch (error) {
      return null;
    }
  }

  function mergeNotes(localNotes, savedNotes) {
    var savedById = {};
    savedNotes.forEach(function (note) { savedById[note.id] = note; });
    var seen = {};
    var merged = [];
    localNotes.forEach(function (note) {
      var other = savedById[note.id];
      var chosen = other && String(other.updatedAt || "") > String(note.updatedAt || "") ? other : note;
      merged.push(chosen);
      seen[chosen.id] = true;
    });
    savedNotes.forEach(function (note) {
      if (!seen[note.id]) merged.push(note);
    });
    return merged;
  }

  function save(removed) {
    try {
      if (!state.deleted) state.deleted = [];
      (removed || []).forEach(function (id) {
        if (state.deleted.indexOf(id) === -1) state.deleted.push(id);
      });
      var saved = readSaved();
      if (saved && saved.deleted) {
        saved.deleted.forEach(function (id) {
          if (state.deleted.indexOf(id) === -1) state.deleted.push(id);
        });
      }
      state.deleted = state.deleted.slice(-200);
      var savedNotes = saved ? saved.notes.filter(function (note) { return state.deleted.indexOf(note.id) === -1; }) : [];
      state.notes = mergeNotes(state.notes.filter(function (note) { return state.deleted.indexOf(note.id) === -1; }), savedNotes);
      if (state.activeId && !state.notes.some(function (note) { return note.id === state.activeId; })) {
        state.activeId = state.notes[0] ? state.notes[0].id : "";
      }
      localStorage.setItem(KEY, JSON.stringify({ version: 1, notes: state.notes, activeId: state.activeId, deleted: state.deleted }));
      return true;
    } catch (error) {
      say("This browser could not save the library. The change is still on screen and will be lost on reload.");
      return false;
    }
  }

  function localToday() {
    var now = new Date();
    var shifted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return shifted.toISOString().slice(0, 10);
  }

  function analyzeOpts() {
    return { today: localToday(), library: state.notes };
  }

  function current() {
    for (var i = 0; i < state.notes.length; i++) {
      if (state.notes[i].id === state.activeId) return state.notes[i];
    }
    return state.notes[0] || null;
  }

  function parseHash() {
    var hash = (location.hash || "").replace(/^#/, "");
    try { hash = decodeURIComponent(hash); } catch (error) { /* keep the raw hash */ }
    var read = /^\/read\/([^/]+)$/.exec(hash);
    if (read) return { name: "read", slug: read[1] };
    var note = /^\/note\/([^/]+)$/.exec(hash);
    if (note) return { name: "edit", id: note[1] };
    return { name: "edit", id: state.activeId || "" };
  }

  function route() {
    var next = parseHash();
    var home = document.getElementById("desk-home");
    if (next.name === "read") {
      document.body.classList.add("reading");
      if (toast) toast.hidden = true;
      renderRead(next.slug);
      if (home) home.setAttribute("href", "#/note/" + encodeURIComponent(state.activeId || ""));
      return;
    }
    var wasReading = document.body.classList.contains("reading");
    document.body.classList.remove("reading");
    if (wasReading) ui.mode = "write";
    if (next.id && state.notes.some(function (note) { return note.id === next.id; })) state.activeId = next.id;
    else if (next.id) say("That note is not in this browser.");
    renderDesk();
  }

  function renderDesk() {
    var note = current();
    document.getElementById("app").innerHTML =
      '<div class="app">' +
        '<aside class="library">' + libraryHtml() + "</aside>" +
        '<div class="work">' +
          (note
            ? scoreStrip() + '<div class="columns"><div id="stage"></div>' + railHtml() + "</div>"
            : '<div class="sheet bare"><h2>Start a note.</h2><p>The library in this browser is empty.</p><button type="button" class="new" data-action="new">New note</button></div>') +
        "</div></div>";
    if (note) {
      renderStage();
      paintChrome();
    }
    if (ui.focusTitle) {
      ui.focusTitle = false;
      var title = document.getElementById("f-title");
      if (title) title.focus();
    }
    var home = document.getElementById("desk-home");
    if (home && note) home.setAttribute("href", "#/note/" + encodeURIComponent(note.id));
  }

  function libraryHtml() {
    var buttons = state.notes.map(function (note) {
      var report = D.analyze(note, analyzeOpts());
      var series = D.seriesById(note.series);
      var flag = note.specimen ? "Specimen" : note.status === "public" ? "Public" : "Draft";
      return '<button type="button" class="note-btn' + (note.id === state.activeId ? " active" : "") + '" data-action="open" data-id="' + D.escapeHtml(note.id) + '">' +
        '<span class="t">' + D.escapeHtml(note.title || "Untitled note") + "</span>" +
        '<span class="s"><span>' + D.escapeHtml((series ? series.label : "Unfiled") + " · " + flag) + '</span><b class="mini' + (report.min < D.SHIP_AT ? " low" : "") + '" data-mini="' + D.escapeHtml(note.id) + '">' + report.min + "</b></span>" +
        "</button>";
    }).join("");
    return '<div class="lib-head"><p class="eyebrow">Lighthouse Macro</p><h1>Pharos Desk</h1>' +
      '<p class="lib-lead">Write the note here. SEO files it for search. GEO makes it citable. AEO lifts the question and the answer. The reader is the page.</p>' +
      '<button type="button" class="new" data-action="new">New note</button></div>' +
      '<div class="notes" id="notes">' + (buttons || '<p class="empty">No notes yet.</p>') + "</div>" +
      '<div class="lib-foot"><button type="button" data-action="export-library">Export library</button>' +
      '<button type="button" data-action="import">Import</button>' +
      '<button type="button" data-action="restore">Restore examples</button>' +
      "<p>Saved in this browser. The command line reads the same engines.</p>" +
      '<input id="import-file" type="file" accept="application/json,.json" hidden></div>';
  }

  function scoreStrip() {
    return '<div class="scorestrip" role="tablist" aria-label="Agents">' +
      D.AGENTS.map(function (agent) {
        return '<button type="button" role="tab" data-action="agent" data-agent="' + agent.id + '" data-testid="score-' + agent.id + '" aria-selected="false"><span>' + agent.name + "</span><b>0</b><small>" + agent.kicker + "</small></button>";
      }).join("") +
      '<p id="ship" data-testid="ship"></p></div>';
  }

  function railHtml() {
    return '<aside class="rail" id="rail"><p class="eyebrow" id="agent-kicker">Search</p><h2 id="agent-name">SEO</h2><p id="agent-lede"></p><div id="checks"></div></aside>';
  }

  function renderStage() {
    var stage = document.getElementById("stage");
    var note = current();
    if (!stage || !note) return;
    if (ui.mode === "reader") {
      stage.innerHTML = modes("reader") + '<div class="reader-mount">' + D.articleHtml(note, D.analyze(note, analyzeOpts())) + "</div>";
    } else if (ui.mode === "packet") {
      stage.innerHTML = modes("packet") + packetHtml(note);
    } else {
      stage.innerHTML = modes("write") + writeHtml(note);
    }
  }

  function modes(mode) {
    function button(id, label) {
      return '<button type="button" data-action="mode" data-mode="' + id + '" aria-pressed="' + (mode === id ? "true" : "false") + '">' + label + "</button>";
    }
    return '<div class="modes">' + button("write", "Write") + button("reader", "Reader") + button("packet", "Packet") +
      '<a class="textlink" id="open-page" href="#/read/note">Open the page</a>' +
      '<button type="button" class="textlink danger" data-action="delete">Delete</button></div>';
  }

  function field(name, label, value, opts) {
    opts = opts || {};
    var control;
    if (opts.kind === "select") {
      control = '<select id="f-' + name + '" data-field="' + name + '">' + opts.options.map(function (opt) {
        return '<option value="' + D.escapeHtml(opt.value) + '"' + (opt.value === value ? " selected" : "") + ">" + D.escapeHtml(opt.label) + "</option>";
      }).join("") + "</select>";
    } else if (opts.kind === "textarea") {
      control = '<textarea id="f-' + name + '" data-field="' + name + '" rows="' + (opts.rows || 4) + '" placeholder="' + D.escapeHtml(opts.placeholder || "") + '">' + D.escapeHtml(value || "") + "</textarea>";
    } else {
      control = '<input id="f-' + name + '" data-field="' + name + '" type="' + (opts.type || "text") + '" value="' + D.escapeHtml(value || "") + '" placeholder="' + D.escapeHtml(opts.placeholder || "") + '" autocomplete="off">';
    }
    var count = opts.count ? ' <em data-count="' + name + '"></em>' : "";
    return '<label class="field" for="f-' + name + '"><span>' + label + count + "</span>" + control + "</label>";
  }

  function writeHtml(note) {
    var seriesOptions = [{ value: "", label: "Choose a series" }].concat(D.SERIES.map(function (series) {
      return { value: series.id, label: series.label + " · " + series.cadence };
    }));
    var pillarOptions = [{ value: "", label: "Choose a pillar" }].concat(D.PILLARS.map(function (pillar) {
      return { value: pillar.id, label: pillar.n + "  " + pillar.name };
    }));
    return '<label class="title-field" for="f-title"><span class="eyebrow">Title</span>' +
      '<textarea id="f-title" class="title" data-field="title" rows="2" placeholder="The claim, in the title">' + D.escapeHtml(note.title) + "</textarea></label>" +
      field("dek", "Description", note.dek, { kind: "textarea", rows: 3, placeholder: "The sentence under the title in search. 110 to 165 characters." }) +
      '<div class="grid4">' +
        field("series", "Series", note.series, { kind: "select", options: seriesOptions }) +
        field("pillar", "Pillar", note.pillar, { kind: "select", options: pillarOptions }) +
        field("date", "Date of the evidence", note.date, { type: "date" }) +
        field("status", "On the site", note.status, { kind: "select", options: [{ value: "draft", label: "Draft" }, { value: "public", label: "Public" }] }) +
      "</div>" +
      field("question", "The question", note.question, { placeholder: "What is the regime board actually saying?" }) +
      field("answer", "Direct answer", note.answer, { kind: "textarea", rows: 5, count: true, placeholder: "The answer in one breath, 35 to 80 words. Use only figures already in the note." }) +
      field("body", "The note", note.body, { kind: "textarea", rows: 14, count: true, placeholder: "## The setup\n\nWhat happened, and which pillar it lands in.\n\n## The evidence\n\nThe figure, the source, and the date.\n\n## The read\n\nWhat you make of it." }) +
      '<p class="hint">Headings are lines that start with ##. The agents read this text. They do not add figures.</p>' +
      field("invalidation", "What would change the call", note.invalidation, { kind: "textarea", rows: 4, placeholder: "The print, revision, or price that would make this wrong." }) +
      field("sources", "Sources", note.sources, { kind: "textarea", rows: 4, placeholder: "Bureau of Labor Statistics — payrolls, the month and the year" });
  }

  function packetHtml(note) {
    var packed = D.packet(note, D.analyze(note, analyzeOpts()));
    var slug = packed.slug;
    return '<div class="packet-lead"><p>The desk is the application. Beehiiv, Substack, and WordPress take the markdown. The HTML file is the page. Search and answer engines take the schema. Nothing here posts by itself.</p>' +
      '<p class="command">node desk/cli.js analyze note.json --strict</p>' +
      '<button type="button" data-action="download-note">Download note.json</button></div>' +
      block("Markdown · Beehiiv, Substack, WordPress", packed.markdown, "markdown", slug + ".md", "text/markdown") +
      block("HTML · The page", packed.html, "html", slug + ".html", "text/html") +
      block("JSON-LD", packed.jsonld, "jsonld", slug + ".json", "application/json") +
      block("Post · " + packed.social.length + " characters", packed.social, "social") +
      block("llms.txt line", packed.llms, "llms");
  }

  function block(title, text, part, filename) {
    var download = filename ? '<button type="button" data-action="download" data-part="' + part + '" data-filename="' + D.escapeHtml(filename) + '">Download</button>' : "";
    return '<section class="packet"><header><h3>' + D.escapeHtml(title) + '</h3><div><button type="button" data-action="copy" data-part="' + part + '">Copy</button>' + download + "</div></header><pre>" + D.escapeHtml(text) + "</pre></section>";
  }

  function renderRead(slug) {
    var note = null;
    for (var i = 0; i < state.notes.length; i++) {
      if (D.publicSlug(state.notes[i], state.notes) === slug) { note = state.notes[i]; break; }
    }
    var app = document.getElementById("app");
    if (!note) {
      app.innerHTML = '<main class="read-miss"><p class="eyebrow">Pharos Desk</p><h1>This page is not in the desk.</h1><p>A draft lives in the browser that wrote it. The specimen is on every copy of the desk.</p><p><a href="#/note/' + encodeURIComponent(state.activeId || "") + '">Back to the desk</a></p></main>';
      document.title = "Not in the desk · Pharos Desk";
      return;
    }
    state.activeId = note.id;
    app.innerHTML = '<main class="read-wrap"><p class="read-tools"><a href="#/note/' + encodeURIComponent(note.id) + '">Open in the desk</a></p>' + D.articleHtml(note, D.analyze(note, analyzeOpts())) + "</main>";
    document.title = (note.title || "Note") + " · Pharos Desk";
  }

  function paintChrome() {
    var note = current();
    if (!note || document.body.classList.contains("reading")) return;
    var report = D.analyze(note, analyzeOpts());
    D.AGENTS.forEach(function (agent) {
      var button = document.querySelector('[data-testid="score-' + agent.id + '"]');
      if (!button) return;
      button.querySelector("b").textContent = String(report[agent.id].score);
      button.setAttribute("aria-selected", ui.agent === agent.id ? "true" : "false");
      button.classList.toggle("ready", report[agent.id].score >= D.SHIP_AT);
      button.classList.toggle("low", report[agent.id].score < D.SHIP_AT);
    });
    var ship = document.getElementById("ship");
    if (ship) ship.textContent = D.shipLine(report);
    var meta = null;
    for (var i = 0; i < D.AGENTS.length; i++) if (D.AGENTS[i].id === ui.agent) meta = D.AGENTS[i];
    var kicker = document.getElementById("agent-kicker");
    var name = document.getElementById("agent-name");
    var lede = document.getElementById("agent-lede");
    if (kicker) kicker.textContent = meta.kicker;
    if (name) name.textContent = meta.name;
    if (lede) lede.textContent = meta.lede;
    var checks = document.getElementById("checks");
    if (checks) {
      var top = checks.scrollTop;
      checks.innerHTML = checksHtml(report[ui.agent].checks);
      checks.scrollTop = top;
    }
    document.querySelectorAll("[data-count]").forEach(function (el) {
      var key = el.getAttribute("data-count");
      var count = D.wordCount(note[key] || "");
      el.textContent = key === "body" && count ? count + " words · about " + Math.max(1, Math.round(count / 220)) + " min" : count + " words";
    });
    var mini = null;
    var minis = document.querySelectorAll("[data-mini]");
    for (var m = 0; m < minis.length; m++) if (minis[m].getAttribute("data-mini") === note.id) mini = minis[m];
    if (mini) {
      mini.textContent = String(report.min);
      mini.classList.toggle("low", report.min < D.SHIP_AT);
    }
    var card = null;
    var cards = document.querySelectorAll(".note-btn");
    for (var c = 0; c < cards.length; c++) if (cards[c].getAttribute("data-id") === note.id) card = cards[c];
    if (card) {
      var title = card.querySelector(".t");
      if (title) title.textContent = note.title || "Untitled note";
      var filing = card.querySelector(".s span");
      if (filing) {
        var series = D.seriesById(note.series);
        var flag = note.specimen ? "Specimen" : note.status === "public" ? "Public" : "Draft";
        filing.textContent = (series ? series.label : "Unfiled") + " · " + flag;
      }
    }
    var page = document.getElementById("open-page");
    if (page) page.setAttribute("href", "#/read/" + encodeURIComponent(D.publicSlug(note, state.notes)));
    if (ui.mode === "write") document.title = (note.title || "Untitled note") + " · Pharos Desk";
  }

  function schedulePaint() {
    if (ui.paintQueued) return;
    ui.paintQueued = true;
    requestAnimationFrame(function () {
      ui.paintQueued = false;
      paintChrome();
    });
  }

  function checksHtml(checks) {
    var order = { fail: 0, warn: 1, pass: 2 };
    return checks.slice().sort(function (a, b) { return order[a.status] - order[b.status]; }).map(function (item) {
      var fix = item.fix ? '<button type="button" class="fix" data-action="apply" data-fix="' + item.fix.id + '">' + D.escapeHtml(item.fix.label) + "</button>" : "";
      var mark = item.status === "pass" ? "Pass" : item.status === "warn" ? "Watch" : "Fix";
      return '<article class="check ' + item.status + '"><p class="mark">' + mark + "</p><div><h3>" + D.escapeHtml(item.label) + "</h3><p>" + D.escapeHtml(item.detail) + "</p>" + fix + "</div></article>";
    }).join("");
  }

  function onField(event) {
    var target = event.target;
    if (!target) return;
    if (target.id === "import-file") {
      importFile(target);
      return;
    }
    if (!target.getAttribute || !target.getAttribute("data-field")) return;
    var note = current();
    if (!note) return;
    note[target.getAttribute("data-field")] = target.value;
    note.updatedAt = new Date().toISOString();
    generation += 1;
    save();
    schedulePaint();
  }

  function onClick(event) {
    var button = event.target.closest ? event.target.closest("[data-action]") : null;
    if (!button) return;
    var action = button.getAttribute("data-action");
    if (action === "open") {
      location.hash = "/note/" + encodeURIComponent(button.getAttribute("data-id"));
      return;
    }
    if (action === "agent") {
      ui.agent = button.getAttribute("data-agent");
      paintChrome();
      var rail = document.getElementById("rail");
      if (rail && window.matchMedia("(max-width: 1100px)").matches) rail.scrollIntoView({ block: "start" });
      return;
    }
    if (action === "mode") {
      ui.mode = button.getAttribute("data-mode");
      renderStage();
      paintChrome();
      return;
    }
    if (action === "apply") applyFix(button.getAttribute("data-fix"));
    else if (action === "new") createNote();
    else if (action === "delete") removeNote();
    else if (action === "copy") copyPart(button.getAttribute("data-part"), button);
    else if (action === "download") downloadPart(button.getAttribute("data-part"), button.getAttribute("data-filename"));
    else if (action === "download-note") downloadNote();
    else if (action === "export-library") exportLibrary();
    else if (action === "import") document.getElementById("import-file").click();
    else if (action === "restore") restore();
  }

  function applyFix(fixId) {
    var note = current();
    if (!note) return;
    var result = D.applyFix(note, fixId);
    say(result.message);
    if (!result.applied) return;
    result.note.id = note.id;
    result.note.specimen = note.specimen;
    result.note.updatedAt = new Date().toISOString();
    var index = -1;
    for (var i = 0; i < state.notes.length; i++) if (state.notes[i].id === note.id) index = i;
    state.notes[index] = result.note;
    save();
    if (ui.mode === "write") {
      Object.keys(result.note).forEach(function (key) {
        var el = document.querySelector('[data-field="' + key + '"]');
        if (el && "value" in el) el.value = result.note[key] == null ? "" : result.note[key];
      });
      paintChrome();
    } else {
      renderStage();
      paintChrome();
    }
  }

  function createNote() {
    var note = D.blankNote({ series: "beam", date: localToday(), status: "draft" });
    state.notes.unshift(note);
    state.activeId = note.id;
    ui.mode = "write";
    ui.agent = "seo";
    ui.focusTitle = true;
    generation += 1;
    if (!save()) {
      renderDesk();
      return;
    }
    location.hash = "/note/" + encodeURIComponent(note.id);
  }

  function removeNote() {
    var note = current();
    if (!note) return;
    var name = note.title || "Untitled note";
    if (!window.confirm('Delete "' + name + '" from this browser?')) return;
    state.notes = state.notes.filter(function (item) { return item.id !== note.id; });
    state.activeId = state.notes[0] ? state.notes[0].id : "";
    generation += 1;
    if (!save([note.id])) {
      renderDesk();
      return;
    }
    say("Deleted " + name + ".");
    if (state.activeId) location.hash = "/note/" + encodeURIComponent(state.activeId);
    else {
      history.replaceState(null, "", "#/");
      renderDesk();
    }
  }

  function packed() {
    var note = current();
    return D.packet(note, D.analyze(note, analyzeOpts()), state.notes);
  }

  function copyPart(part, button) {
    var text = packed()[part] || "";
    var done = function () { flash(button, "Copied"); say("Copied the " + part + " packet."); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else fallbackCopy(text, done);
  }

  function fallbackCopy(text, done) {
    var area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    var copied = false;
    try { copied = document.execCommand("copy"); }
    catch (error) { copied = false; }
    area.remove();
    if (copied) done();
    else say("Select the text and copy it.");
  }

  function flash(button, label) {
    var old = button.textContent;
    button.textContent = label;
    setTimeout(function () { button.textContent = old; }, 1200);
  }

  function download(filename, text, type) {
    var blob = new Blob([text], { type: type || "text/plain" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function downloadPart(part, filename) {
    var data = packed();
    var type = part === "html" ? "text/html" : part === "jsonld" ? "application/json" : "text/markdown";
    download(filename || part + ".txt", data[part], type);
    say("Downloaded " + (filename || part) + ".");
  }

  function downloadNote() {
    var note = current();
    download((D.slugify(note.title) || "note") + ".json", JSON.stringify(note, null, 2), "application/json");
    say("Downloaded the note. Run node desk/cli.js analyze on that file.");
  }

  function exportLibrary() {
    download("pharos-desk.json", JSON.stringify({ version: 1, notes: state.notes }, null, 2), "application/json");
    say("Exported the library.");
  }

  function importFile(input) {
    var file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    var seen = generation;
    var reader = new FileReader();
    reader.onerror = function () { say("That file could not be read."); };
    reader.onabort = function () { say("The import was cancelled."); };
    reader.onload = function () {
      try {
        if (seen !== generation) throw new Error("The library changed while that file was reading. Import it again.");
        var data = JSON.parse(String(reader.result || ""));
        var incoming = Array.isArray(data) ? data : data.notes;
        if (!Array.isArray(incoming)) throw new Error("That file has no notes.");
        var notes = incoming.map(D.sanitize);
        var fresh = [];
        notes.forEach(function (note) {
          var existing = -1;
          for (var i = 0; i < state.notes.length; i++) if (state.notes[i].id === note.id) existing = i;
          if (existing >= 0) state.notes[existing] = note;
          else fresh.push(note);
        });
        state.notes = fresh.concat(state.notes);
        if (!current()) state.activeId = state.notes[0] ? state.notes[0].id : "";
        generation += 1;
        if (!save()) return;
        say("Imported " + notes.length + (notes.length === 1 ? " note." : " notes."));
        renderDesk();
      } catch (error) {
        say(error.message || "That file could not be read.");
      }
    };
    reader.readAsText(file);
  }

  function restore() {
    var added = 0;
    D.seeds.forEach(function (seed) {
      if (!state.notes.some(function (note) { return note.id === seed.id; })) {
        state.notes.push(D.clone(seed));
        added += 1;
      }
    });
    if (!state.activeId && state.notes[0]) state.activeId = state.notes[0].id;
    generation += 1;
    if (added && !save()) return;
    say(added ? "Restored " + added + (added === 1 ? " example." : " examples.") : "The examples are already in this library.");
    if (added) renderDesk();
  }

  function say(message) {
    if (live) live.textContent = message;
    if (!toast) return;
    toast.hidden = false;
    toast.textContent = message;
    clearTimeout(say.timer);
    say.timer = setTimeout(function () { toast.hidden = true; }, 2600);
  }
})();
