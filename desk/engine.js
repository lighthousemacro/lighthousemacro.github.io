/* Pharos Desk engines.
   SEO files a note for search. GEO makes it citable by generative engines.
   AEO lifts one question and one direct answer.
   The same functions run in the browser and in `node desk/cli.js`.
   They rearrange the author's words. They do not invent figures. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LhmDesk = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SHIP_AT = 80;
  var DISCLAIMER = "Lighthouse Macro, LLC provides research and advisory services that are informational and educational in nature. Nothing published or communicated by Lighthouse Macro constitutes personalized investment advice, a solicitation, or a recommendation to buy, sell, or hold any security. All investment decisions are the sole responsibility of the reader or client. Past performance is not indicative of future results. Lighthouse Macro, LLC is not a registered investment advisor.";

  var SERIES = [
    { id: "beacon", label: "The Beacon", cadence: "Long-form" },
    { id: "beam", label: "The Beam", cadence: "Tactical" },
    { id: "horizon", label: "The Horizon", cadence: "Forward view" },
    { id: "chartbook", label: "The Chartbook", cadence: "Visual compilation" },
    { id: "marginal", label: "Marginal Matters", cadence: "Free explainer" }
  ];

  var PILLARS = [
    { id: "labor", n: "01", name: "Labor", engine: "Macro Dynamics", href: "/research/labor-the-source-code.html", definition: "Labor is the source code of the cycle: the flows of hiring, firing, and participation underneath every other print." },
    { id: "prices", n: "02", name: "Prices", engine: "Macro Dynamics", href: "/research/prices-the-transmission-belt.html", definition: "Prices are the transmission belt. Inflation is the macro variable that directly sets how restrictive policy can stay." },
    { id: "growth", n: "03", name: "Growth", engine: "Macro Dynamics", href: "/research/growth-the-second-derivative.html", definition: "Growth is the second derivative. The level of GDP lags; the turn in momentum is the tell." },
    { id: "housing", n: "04", name: "Housing", engine: "Macro Dynamics", href: "/research/housing-the-collateral-engine.html", definition: "Housing is the collateral engine: the financial system's collateral backbone and the most rate-sensitive sector in the economy." },
    { id: "consumer", n: "05", name: "Consumer", engine: "Macro Dynamics", href: "/research/consumer-the-last-domino.html", definition: "The consumer is the last domino, a lagging confirmation of what labor, credit, and confidence already said." },
    { id: "business", n: "06", name: "Business", engine: "Macro Dynamics", href: "/research/business-the-forward-commitment.html", definition: "Business investment is the forward commitment. Firms spend out of conviction, not habit." },
    { id: "trade", n: "07", name: "Trade", engine: "Macro Dynamics", href: "/research/trade-the-pipeline.html", definition: "Trade is the pipeline, where domestic policy meets the global price of goods, currencies, and tariffs." },
    { id: "government", n: "08", name: "Government", engine: "Monetary Mechanics", href: "/research/government-the-fiscal-overhang.html", definition: "Government is the fiscal overhang. The Treasury, not only the Fed, moves the quantity of duration the market has to hold." },
    { id: "financial", n: "09", name: "Financial", engine: "Monetary Mechanics", href: "/research/financial-the-cascade.html", definition: "Financial is the cascade. The policy rate is the start of the story; credit conditions are how it arrives." },
    { id: "plumbing", n: "10", name: "Plumbing", engine: "Monetary Mechanics", href: "/research/plumbing-the-invisible-infrastructure.html", definition: "Plumbing is the invisible infrastructure: reserves, repo, and the pipes under the policy rate." },
    { id: "market-structure", n: "11", name: "Market Structure", engine: "Market Structure", href: "/research/market-structure-the-weight-of-evidence.html", definition: "Market structure is the weight of evidence in the tape: breadth, leadership, and whether the index is the market." },
    { id: "sentiment", n: "12", name: "Sentiment", engine: "Market Structure", href: "/research/sentiment-and-positioning-the-contrarian-216.html", definition: "Sentiment and positioning are the contrarian edge: what is already believed, and what is already owned." },
    { id: "cross", n: "—", name: "Cross-pillar", engine: "The Diagnostic Dozen", href: "/framework.html", definition: "The Diagnostic Dozen is twelve pillars in three engines. A cross-pillar note says which engine is leading when the tiles disagree." }
  ];

  var ENTITIES = [
    ["Diagnostic Dozen", /Diagnostic Dozen/gi],
    ["Federal Reserve", /\b(Federal Reserve|the Fed|FOMC)\b/gi],
    ["Treasury", /\bTreasur(?:y|ies)\b/gi],
    ["CPI", /\bCPI\b/g],
    ["PCE", /\bPCE\b/g],
    ["SOFR", /\bSOFR\b/g],
    ["regime board", /regime board/gi],
    ["unemployment", /\bunemployment\b/gi],
    ["inflation", /\binflation\b/gi],
    ["yield curve", /yield curve/gi],
    ["credit spread", /credit spreads?/gi],
    ["Pharos", /\bPharos\b/g]
  ];

  var AGENTS = [
    { id: "seo", name: "SEO", kicker: "Search", lede: "How a search engine files the note. Title, description, headings, internal links, and Article schema." },
    { id: "geo", name: "GEO", kicker: "Generative", lede: "How a generative engine cites the note. A sourced passage, a named author, a date, and a definition an assistant can quote." },
    { id: "aeo", name: "AEO", kicker: "Answer", lede: "How an answer engine lifts the note. One question, a direct answer in the author's words, and FAQ schema." }
  ];

  var STOP = "a an the of to and or for as on in at by from with into that this those these actually really just about over under after before be are was were it its if not no yes than then so such our your their his her who whom which how when where why what is do does did".split(" ");

  function uid() {
    return "n-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function seriesById(id) {
    for (var i = 0; i < SERIES.length; i++) if (SERIES[i].id === id) return SERIES[i];
    return null;
  }

  function pillarById(id) {
    for (var i = 0; i < PILLARS.length; i++) if (PILLARS[i].id === id) return PILLARS[i];
    return null;
  }

  function words(text) {
    var raw = String(text || "").trim();
    if (!raw) return [];
    return raw.split(/\s+/);
  }

  function wordCount(text) {
    return words(text).length;
  }

  function sentences(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function numbersIn(text) {
    return String(text || "").match(/\d+(?:[.,]\d+)?%?/g) || [];
  }

  function strongNumbers(text) {
    return numbersIn(text).filter(function (n) {
      return n.replace(/\D/g, "").length >= 4 || /[.%]/.test(n);
    });
  }

  function slugify(title) {
    return String(title || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function clip(text, max) {
    var clean = String(text || "").replace(/\s+/g, " ").trim();
    if (clean.length <= max) return clean;
    var cut = clean.slice(0, max + 1);
    var sp = cut.lastIndexOf(" ");
    return (sp > 40 ? cut.slice(0, sp) : clean.slice(0, max)).replace(/[,\s;:]+$/g, "");
  }

  function isoToday(date) {
    var d = date || new Date();
    return d.toISOString().slice(0, 10);
  }

  function ageDays(dateStr, today) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "") || !/^\d{4}-\d{2}-\d{2}$/.test(today || "")) return null;
    var a = Date.parse(dateStr + "T00:00:00Z");
    var b = Date.parse(today + "T00:00:00Z");
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }

  function sanitize(note) {
    var next = {
      id: "",
      title: "",
      dek: "",
      series: "",
      pillar: "",
      date: "",
      status: "draft",
      question: "",
      answer: "",
      body: "",
      invalidation: "",
      sources: "",
      specimen: false,
      updatedAt: ""
    };
    var src = note || {};
    Object.keys(next).forEach(function (key) {
      if (src[key] != null) next[key] = src[key];
    });
    ["title", "dek", "series", "pillar", "date", "question", "answer", "body", "invalidation", "sources", "updatedAt"].forEach(function (key) {
      next[key] = String(next[key] || "");
    });
    next.specimen = !!next.specimen;
    next.status = next.status === "public" ? "public" : "draft";
    if (!seriesById(next.series)) next.series = "";
    if (!pillarById(next.pillar)) next.pillar = "";
    if (next.date && !/^\d{4}-\d{2}-\d{2}$/.test(next.date)) next.date = "";
    if (!next.id) next.id = uid();
    return next;
  }

  function blankNote(partial) {
    return sanitize(Object.assign({ id: uid(), series: "beam", status: "draft" }, partial || {}));
  }

  function clone(note) {
    return JSON.parse(JSON.stringify(note));
  }

  function sourceLines(note) {
    return String(note.sources || "").split(/\n/).map(function (line) { return line.trim(); }).filter(Boolean);
  }

  function headings(body) {
    return String(body || "").split("\n").map(function (line) {
      var match = /^(#{2,3})\s+(.+)$/.exec(line.trim());
      return match ? { level: match[1].length, text: match[2].trim() } : null;
    }).filter(Boolean);
  }

  function firstParagraph(body) {
    var blocks = String(body || "").split(/\n\s*\n/);
    for (var i = 0; i < blocks.length; i++) {
      var text = blocks[i].trim();
      if (text && text.charAt(0) !== "#") return text.replace(/\s+/g, " ");
    }
    return "";
  }

  function corpus(note) {
    return [note.title, note.dek, note.question, note.body, note.answer, note.invalidation, note.sources, note.date].join("\n");
  }

  function findEntities(text) {
    var found = [];
    ENTITIES.forEach(function (pair) {
      var matches = String(text || "").match(pair[1]);
      if (matches && matches.length) found.push({ name: pair[0], count: matches.length });
    });
    PILLARS.forEach(function (pillar) {
      if (pillar.id === "cross") return;
      var re = new RegExp("\\b" + pillar.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi");
      var matches = String(text || "").match(re);
      if (matches && matches.length) found.push({ name: pillar.name, count: matches.length });
    });
    return found;
  }

  function hasDefinition(text, pillar) {
    if (!pillar) return false;
    if (String(text || "").indexOf(pillar.definition.slice(0, 42)) !== -1) return true;
    var name = pillar.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("\\b" + name + "\\b[^.?!]{0,90}\\b(is|are|means)\\b", "i").test(text || "");
  }

  function quotable(note) {
    var text = [note.body, note.answer].filter(Boolean).join(" ");
    var ranged = sentences(text).filter(function (sentence) {
      var count = wordCount(sentence);
      return count >= 18 && count <= 55;
    });
    var withDigit = null;
    for (var i = 0; i < ranged.length; i++) {
      if (/\d/.test(ranged[i])) { withDigit = ranged[i]; break; }
    }
    return withDigit || ranged[0] || null;
  }

  function citation(note) {
    var clean = sanitize(note);
    var passage = quotable(clean);
    if (!passage || !clean.title) return null;
    var when = clean.date || "undated";
    return {
      passage: passage,
      attribution: "Bob Sheehan, CFA, CMT, \"" + clean.title + ",\" Lighthouse Macro, " + when + "."
    };
  }

  function questionMarked(question) {
    var q = String(question || "").trim();
    if (!q) return "";
    return /\?$/.test(q) ? q : q.replace(/[.]+$/g, "") + "?";
  }

  function faqs(note) {
    var clean = sanitize(note);
    var pillar = pillarById(clean.pillar);
    var items = [];
    if (wordCount(clean.question) >= 4 && wordCount(clean.answer) >= 20) {
      items.push({ q: questionMarked(clean.question), a: clean.answer.trim() });
    }
    if (wordCount(clean.invalidation) >= 12) {
      items.push({ q: "What would change this call?", a: clean.invalidation.trim() });
    }
    if (pillar) {
      items.push({
        q: pillar.id === "cross" ? "Where does a cross-pillar note sit in the framework?" : "Where does " + pillar.name + " sit in the Diagnostic Dozen?",
        a: pillar.definition + " This note is filed under " + pillar.name + ", in " + pillar.engine + "."
      });
    }
    return items;
  }

  function internalLinks(note) {
    var clean = sanitize(note);
    var pillar = pillarById(clean.pillar);
    var links = [];
    if (pillar) links.push({ label: pillar.name, href: "https://lighthousemacro.com" + pillar.href });
    links.push({ label: "The Diagnostic Dozen", href: "https://lighthousemacro.com/framework.html" });
    links.push({ label: "Methodology", href: "https://lighthousemacro.com/methodology.html" });
    links.push({ label: "Pharos Desk", href: "https://lighthousemacro.com/desk/" });
    return links;
  }

  function canonical(note) {
    var clean = sanitize(note);
    var slug = slugify(clean.title);
    if (!slug) return "https://lighthousemacro.com/desk/";
    return "https://lighthousemacro.com/desk/#/read/" + slug;
  }

  function check(id, status, label, detail, fix) {
    return { id: id, status: status, label: label, detail: detail, fix: fix || null };
  }

  function score(checks) {
    if (!checks.length) return 0;
    var earned = checks.reduce(function (sum, item) {
      return sum + (item.status === "pass" ? 1 : item.status === "warn" ? 0.5 : 0);
    }, 0);
    return Math.round((earned / checks.length) * 100);
  }

  function contentWords(question) {
    return words(question).map(function (word) {
      return word.toLowerCase().replace(/[^a-z0-9-]/g, "");
    }).filter(function (word) {
      return word.length >= 4 && STOP.indexOf(word) === -1;
    });
  }

  function sourceLinked(note) {
    var prose = note.answer + "\n" + note.body;
    var lines = sourceLines(note);
    var proseStrong = {};
    strongNumbers(prose).forEach(function (n) { proseStrong[n] = true; });
    for (var i = 0; i < lines.length; i++) {
      var strong = strongNumbers(lines[i]);
      for (var j = 0; j < strong.length; j++) if (proseStrong[strong[j]]) return true;
      var name = lines[i].split(/[—–:]/)[0].trim();
      if (name.length >= 6 && prose.toLowerCase().indexOf(name.toLowerCase()) !== -1) return true;
    }
    return false;
  }

  function draftAnswer(body) {
    var text = String(body || "").replace(/^#{2,3}[^\n]*$/gm, " ").replace(/\s+/g, " ").trim();
    if (wordCount(text) < 25) return null;
    var parts = sentences(text);
    if (!parts.length) parts = [text];
    var out = [];
    var count = 0;
    for (var i = 0; i < parts.length; i++) {
      var n = wordCount(parts[i]);
      if (!n) continue;
      if (n > 80 && count === 0) return words(parts[i]).slice(0, 70).join(" ");
      if (count >= 25 && count + n > 80) break;
      out.push(parts[i]);
      count += n;
      if (count >= 70) break;
    }
    if (count < 25) return null;
    return out.join(" ");
  }

  function dekSource(note) {
    if (wordCount(note.answer) >= 20) return sentences(note.answer)[0] || "";
    return sentences(firstParagraph(note.body))[0] || "";
  }

  function seoChecks(note, opts) {
    var title = note.title.trim();
    var dek = note.dek.trim();
    var heads = headings(note.body);
    var checks = [];
    checks.push(title
      ? check("title-present", "pass", "Title", "The note has a title.")
      : check("title-present", "fail", "Title", "A search result needs a title."));
    if (title) {
      var len = title.length;
      var titleFix = len > 70 ? { id: "trim-title", label: "Shorten the title to search length" } : null;
      checks.push(len >= 40 && len <= 65
        ? check("title-length", "pass", "Title length", len + " characters. Search titles land best between 40 and 65.")
        : check("title-length", len >= 25 && len <= 75 ? "warn" : "fail", "Title length", len + " characters. Aim for 40 to 65, the length a search result can show in full.", titleFix));
    }
    var dekSentence = dekSource(note);
    var dekFix = wordCount(dekSentence) >= 8 ? { id: "write-dek", label: "Use the first sentence as the description" } : null;
    checks.push(dek.length >= 110 && dek.length <= 165
      ? check("dek-length", "pass", "Description", dek.length + " characters. This is the line under the title in search.")
      : check("dek-length", dek.length >= 70 && dek.length <= 200 ? "warn" : "fail", "Description", (dek ? dek.length : 0) + " characters. Aim for 110 to 165.", dek ? dekFix : dekFix));
    if (heads.some(function (h) { return h.level === 2; })) {
      checks.push(check("headings", "pass", "Headings", "The body has a section heading search engines can map."));
    } else {
      checks.push(check("headings", "fail", "Headings", "Add at least one section heading, written as ## in the body.", wordCount(note.body) >= 20 ? { id: "add-heading", label: "Add an evidence heading" } : null));
    }
    if (heads.length) {
      var skipped = false;
      for (var i = 0; i < heads.length; i++) if (heads[i].level === 3 && !heads.slice(0, i).some(function (h) { return h.level === 2; })) skipped = true;
      checks.push(skipped
        ? check("heading-order", "fail", "Heading order", "A ### arrives before any ##. Keep the outline one level at a time.")
        : check("heading-order", "pass", "Heading order", "Section headings follow a single outline."));
    }
    var distinctive = contentWords(note.question);
    var hay = (title + " " + heads.map(function (h) { return h.text; }).join(" ")).toLowerCase();
    if (!wordCount(note.question)) {
      checks.push(check("question-overlap", "fail", "Question in the title", "Write the question the note exists to answer. The title or a heading should carry its words."));
    } else if (distinctive.some(function (word) { return hay.indexOf(word) !== -1; })) {
      checks.push(check("question-overlap", "pass", "Question in the title", "The title or a heading uses the words of the question."));
    } else {
      checks.push(check("question-overlap", "warn", "Question in the title", "The question and the title do not share a distinctive word. Searchers type the question, not the headline's metaphor."));
    }
    var pillar = pillarById(note.pillar);
    checks.push(pillar
      ? check("pillar", "pass", "Pillar", "Filed under " + pillar.name + ". The packet links " + pillar.href + ".")
      : check("pillar", "fail", "Pillar", "File the note under a pillar so the packet can link the framework essay."));
    checks.push(/^\d{4}-\d{2}-\d{2}$/.test(note.date)
      ? check("date", "pass", "Date", "Dated " + note.date + ".")
      : check("date", "fail", "Date", "Put the date of the evidence on the note."));
    var series = seriesById(note.series);
    checks.push(series
      ? check("series", "pass", "Series", series.label + " · " + series.cadence + ".")
      : check("series", "fail", "Series", "Choose the series. Beacon, Beam, Horizon, Chartbook, or Marginal Matters."));
    var ledeCount = wordCount(firstParagraph(note.body));
    checks.push(ledeCount >= 40
      ? check("lede", "pass", "Opening", ledeCount + " words before the first break. The opening carries the note.")
      : check("lede", "fail", "Opening", ledeCount + " words in the opening. Give it at least 40, in your own sentences."));
    var path = canonical(note);
    var where = note.specimen ? "Specimen page: " : note.status === "public" ? "Public page: " : "Draft page, in this browser: ";
    checks.push(slugify(title)
      ? check("public-path", "pass", "Where it lives", where + path)
      : check("public-path", "fail", "Where it lives", "The note needs a title before it has a path."));
    var slug = slugify(title);
    if (opts && opts.library && slug) {
      var clash = opts.library.some(function (other) {
        return other && other.id !== note.id && slugify(other.title) === slug;
      });
      checks.push(clash
        ? check("slug", "warn", "Slug", slug + " is already used by another note in this library.")
        : check("slug", "pass", "Slug", slug + "."));
    }
    return checks;
  }

  function geoChecks(note, opts) {
    var checks = [];
    var today = (opts && opts.today) || isoToday();
    var lines = sourceLines(note);
    var prose = note.answer + "\n" + note.body;
    var pillar = pillarById(note.pillar);
    var entities = findEntities(corpus(note));
    checks.push(note.title.trim() && note.date
      ? check("attribution", "pass", "Attribution", "Bob Sheehan, CFA, CMT, Lighthouse Macro, " + note.date + ". Generative engines cite a person and a date.")
      : check("attribution", "fail", "Attribution", "A citation needs the title and the date. The author and the firm are already on the packet."));
    checks.push(lines.length
      ? check("sources", "pass", "Sources", lines.length + (lines.length === 1 ? " source is named." : " sources are named."))
      : check("sources", "fail", "Sources", "Name the series and what it covers, one source per line. A generative engine should not invent the source you meant."));
    if (!lines.length && !/\d/.test(prose)) {
      checks.push(check("sourced-claim", "fail", "Sourced claim", "There is no figure and no source. A generative engine should not cite this yet."));
    } else if (!lines.length) {
      checks.push(check("sourced-claim", "fail", "Sourced claim", "The prose uses a figure without a source line. Name the series and the date."));
    } else if (!/\d/.test(prose)) {
      checks.push(check("sourced-claim", "warn", "Sourced claim", "Sources are listed, but the prose has no figure tied to them."));
    } else if (!sourceLinked(note)) {
      checks.push(check("sourced-claim", "warn", "Sourced claim", "Put the source's name or date next to the figure so a citation can connect them."));
    } else {
      checks.push(check("sourced-claim", "pass", "Sourced claim", "A figure in the prose ties back to a named source."));
    }
    checks.push(pillar && hasDefinition(note.body + " " + note.answer, pillar)
      ? check("definition", "pass", "Definition", pillar.name + " is defined in the note, which is what an assistant quotes when someone asks what it is.")
      : check("definition", "fail", "Definition", pillar ? "The " + pillar.name + " definition is not in the note yet." : "Choose a pillar, then the desk can offer its framework definition.", pillar ? { id: "insert-definition", label: "Insert the " + pillar.name + " definition" } : null));
    var passage = quotable(note);
    if (passage) {
      checks.push(check("quotable", "pass", "Quotable passage", "\"" + passage + "\""));
    } else {
      checks.push(check("quotable", "fail", "Quotable passage", "Write one sentence of 18 to 55 words that carries the claim. That is the passage a generative engine can lift."));
    }
    var age = ageDays(note.date, today);
    if (age == null) {
      checks.push(check("freshness", "fail", "Freshness", "Generative engines discount undated claims."));
    } else if (age < -1) {
      checks.push(check("freshness", "warn", "Freshness", "The date is in the future."));
    } else if (age > 400) {
      checks.push(check("freshness", "warn", "Freshness", "The date is more than a year old. Re-check the figures or say that the note is historical."));
    } else {
      checks.push(check("freshness", "pass", "Freshness", "Dated " + note.date + ", " + age + (age === 1 ? " day" : " days") + " from " + today + "."));
    }
    var inv = wordCount(note.invalidation);
    checks.push(inv >= 12
      ? check("invalidation", "pass", "Invalidation", "The note says what would change the call. That is the line a careful citation keeps.")
      : check("invalidation", inv >= 6 ? "warn" : "fail", "Invalidation", "Write the print, revision, or price that would make this call wrong."));
    checks.push(entities.length >= 2
      ? check("entities", "pass", "Entities", entities.slice(0, 6).map(function (e) { return e.name; }).join(", ") + ".")
      : check("entities", entities.length === 1 ? "warn" : "fail", "Entities", entities.length ? "Only " + entities[0].name + " is named. Name the institution or the series too." : "Name the institutions and series a reader would look up."));
    if (/\b(always|never|guaranteed|certainly)\b/i.test(prose)) {
      checks.push(check("absolutes", "warn", "Absolutes", "Always, never, guaranteed, or certainly is in the prose. Hedge it, or a citation will harden it."));
    }
    return checks;
  }

  function aeoChecks(note) {
    var checks = [];
    var question = note.question.trim();
    var qWords = wordCount(question);
    if (!qWords) {
      checks.push(check("question", "fail", "Question", "Write the question the note exists to answer, and end it with a question mark."));
    } else if (!/\?$/.test(question)) {
      checks.push(check("question", "fail", "Question", "End the question with a question mark so an answer engine can see it is a question.", { id: "mark-question", label: "Add the question mark" }));
    } else if (qWords >= 6 && qWords <= 22) {
      checks.push(check("question", "pass", "Question", qWords + " words. A question a person would actually type."));
    } else {
      checks.push(check("question", qWords >= 4 && qWords <= 28 ? "warn" : "fail", "Question", qWords + " words. Aim for 6 to 22."));
    }
    var answerWords = wordCount(note.answer);
    var answerFix = draftAnswer(note.body) ? { id: "draft-answer", label: "Draft the answer from the body" } : null;
    if (answerWords >= 35 && answerWords <= 80) {
      checks.push(check("answer", "pass", "Direct answer", answerWords + " words. The reader places this above the body, which is where an answer engine looks."));
    } else if (!answerWords) {
      checks.push(check("answer", "fail", "Direct answer", "Write the answer in your own words, 35 to 80 words. The desk can draft it from the body, and will not add a figure.", answerFix));
    } else {
      checks.push(check("answer", answerWords >= 20 && answerWords <= 110 ? "warn" : "fail", "Direct answer", answerWords + " words. Aim for 35 to 80, the length of a spoken answer.", answerFix));
    }
    if (answerWords) {
      var lead = note.answer.trim();
      checks.push(/^(this (piece|note|article)|in this|i wrote|we wrote)\b/i.test(lead)
        ? check("answer-lead", "fail", "Answer leads", "Start with the answer, not with a description of the piece.")
        : check("answer-lead", "pass", "Answer leads", "The answer starts on the claim."));
      var allowed = {};
      numbersIn([note.body, note.dek, note.sources, note.invalidation, note.date].join("\n")).forEach(function (n) { allowed[n] = true; });
      var stray = numbersIn(note.answer).filter(function (n) { return !allowed[n]; });
      if (stray.length) {
        checks.push(check("answer-faithful", "fail", "Answer stays inside the note", "The answer uses " + stray.join(", ") + ", which is not in the body, the sources, or the date. Take it out, or write it into the evidence first.", answerFix));
      }
    }
    var items = faqs(note);
    checks.push(items.length >= 3
      ? check("faqs", "pass", "FAQ schema", items.length + " questions will ship in FAQ schema: the note's question, what would change the call, and where the pillar sits.")
      : check("faqs", items.length === 2 ? "warn" : "fail", "FAQ schema", items.length + " of 3 FAQ entries can be built. They come from the answer, the invalidation, and the pillar. Nothing is invented."));
    return checks;
  }

  function analyze(note, opts) {
    var clean = sanitize(note);
    var options = opts || {};
    var seo = seoChecks(clean, options);
    var geo = geoChecks(clean, options);
    var aeo = aeoChecks(clean);
    var seoScore = score(seo);
    var geoScore = score(geo);
    var aeoScore = score(aeo);
    return {
      seo: { id: "seo", score: seoScore, checks: seo },
      geo: { id: "geo", score: geoScore, checks: geo },
      aeo: { id: "aeo", score: aeoScore, checks: aeo },
      faqs: faqs(clean),
      citation: citation(clean),
      entities: findEntities(corpus(clean)),
      links: internalLinks(clean),
      min: Math.min(seoScore, geoScore, aeoScore),
      shipAt: SHIP_AT
    };
  }

  function shipLine(report) {
    var names = ["seo", "geo", "aeo"].filter(function (id) { return report[id].score < report.shipAt; }).map(function (id) { return id.toUpperCase(); });
    if (!names.length) return "All three agents clear " + report.shipAt + ". The packet is ready to file.";
    var list = names.length === 1 ? names[0] : names.length === 2 ? names[0] + " and " + names[1] : names.slice(0, -1).join(", ") + ", and " + names[names.length - 1];
    return list + (names.length === 1 ? " is" : " are") + " under " + report.shipAt + ". Export still works.";
  }

  function applyFix(note, fixId) {
    var clean = sanitize(note);
    var next = clone(clean);
    if (fixId === "mark-question") {
      var q = clean.question.trim();
      if (!q) return { note: clean, applied: false, message: "Write the question first." };
      if (/\?$/.test(q)) return { note: clean, applied: false, message: "The question already ends with a question mark." };
      next.question = q.replace(/[.]+$/g, "") + "?";
      return { note: next, applied: true, message: "Added the question mark." };
    }
    if (fixId === "draft-answer") {
      var drafted = draftAnswer(clean.body);
      if (!drafted) return { note: clean, applied: false, message: "The body is too thin to draft an answer. Write the evidence in your own words. The desk will not invent a figure." };
      if (drafted === clean.answer.trim()) return { note: clean, applied: false, message: "The answer is already the body's sentences." };
      next.answer = drafted;
      return { note: next, applied: true, message: "Drafted the answer from sentences already in the body. No figure was added." };
    }
    if (fixId === "write-dek") {
      var sentence = dekSource(clean);
      if (wordCount(sentence) < 8) return { note: clean, applied: false, message: "Write a full sentence first. The description has to be yours." };
      var clipped = clip(sentence, 155);
      if (clipped === clean.dek.trim()) return { note: clean, applied: false, message: "The description is already that sentence." };
      next.dek = clipped;
      return { note: next, applied: true, message: "Set the description from a sentence already in the note. Read it once before you ship." };
    }
    if (fixId === "insert-definition") {
      var pillar = pillarById(clean.pillar);
      if (!pillar) return { note: clean, applied: false, message: "Choose a pillar first." };
      if (hasDefinition(clean.body, pillar)) return { note: clean, applied: false, message: "The definition is already in the note." };
      var blocks = String(clean.body || "").split(/\n\s*\n/);
      var idx = -1;
      for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].trim() && blocks[i].trim().charAt(0) !== "#") { idx = i; break; }
      }
      if (idx === -1) next.body = pillar.definition + (clean.body.trim() ? "\n\n" + clean.body.trim() : "");
      else {
        blocks.splice(idx + 1, 0, pillar.definition);
        next.body = blocks.join("\n\n");
      }
      return { note: next, applied: true, message: "Inserted the " + pillar.name + " definition from the framework. It does not add a data point." };
    }
    if (fixId === "add-heading") {
      if (headings(clean.body).some(function (h) { return h.level === 2; })) return { note: clean, applied: false, message: "The body already has a section heading." };
      if (wordCount(clean.body) < 20) return { note: clean, applied: false, message: "Write the evidence, then add a heading." };
      next.body = "## The evidence\n\n" + clean.body.replace(/^\s+/, "");
      return { note: next, applied: true, message: "Added an evidence heading. Rename it if the section is about something more specific." };
    }
    if (fixId === "trim-title") {
      var title = clean.title.trim();
      if (title.length <= 70) return { note: clean, applied: false, message: "The title is already inside a usable length." };
      var cut = title.slice(0, 66);
      var sp = cut.lastIndexOf(" ");
      next.title = (sp > 30 ? cut.slice(0, sp) : title.slice(0, 60)).replace(/[:\s,.-]+$/g, "");
      return { note: next, applied: true, message: "Shortened the title to " + next.title.length + " characters. Read it. The cut is mechanical." };
    }
    return { note: clean, applied: false, message: "That fix is not available." };
  }

  function renderInline(text) {
    return escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  }

  function renderMarkdown(markdown) {
    var lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    var html = [];
    var para = [];
    var list = [];
    function flushPara() {
      if (!para.length) return;
      var text = para.join(" ").trim();
      if (text) html.push("<p>" + renderInline(text) + "</p>");
      para = [];
    }
    function flushList() {
      if (!list.length) return;
      html.push("<ul>" + list.map(function (item) { return "<li>" + renderInline(item) + "</li>"; }).join("") + "</ul>");
      list = [];
    }
    lines.forEach(function (line) {
      var heading = /^(#{2,3})\s+(.*)$/.exec(line);
      if (heading) {
        flushPara();
        flushList();
        var tag = heading[1].length === 2 ? "h2" : "h3";
        html.push("<" + tag + ">" + renderInline(heading[2]) + "</" + tag + ">");
        return;
      }
      var item = /^-\s+(.*)$/.exec(line);
      if (item) {
        flushPara();
        list.push(item[1]);
        return;
      }
      if (!line.trim()) {
        flushPara();
        flushList();
        return;
      }
      flushList();
      para.push(line.trim());
    });
    flushPara();
    flushList();
    return html.join("\n");
  }

  function articleHtml(note, report) {
    var clean = sanitize(note);
    var rep = report || analyze(clean);
    var series = seriesById(clean.series);
    var pillar = pillarById(clean.pillar);
    var meta = [series && series.label, pillar && pillar.name, clean.date].filter(Boolean).join(" · ");
    var ribbon = "";
    if (clean.specimen) ribbon = '<p class="ribbon">Specimen. Restates the public regime board' + (clean.date ? " dated " + escapeHtml(clean.date) : "") + ". Not a new forecast.</p>";
    else if (clean.status !== "public") ribbon = '<p class="ribbon">Draft. Not a published note.</p>';
    var answer = clean.answer.trim()
      ? '<section class="desk-answer"><p class="kicker">The answer</p><p>' + escapeHtml(clean.answer.trim()) + "</p></section>"
      : "";
    var cite = "";
    if (rep.citation && clean.answer.indexOf(rep.citation.passage) === -1) {
      cite = '<blockquote class="cite"><p>' + escapeHtml(rep.citation.passage) + "</p><footer>" + escapeHtml(rep.citation.attribution) + "</footer></blockquote>";
    }
    var invalidation = clean.invalidation.trim()
      ? '<section class="invalidation"><h2>What would change the call</h2><p>' + escapeHtml(clean.invalidation.trim()) + "</p></section>"
      : "";
    var sources = sourceLines(clean);
    var sourceHtml = sources.length
      ? "<section class=\"sources\"><h2>Sources</h2><ul>" + sources.map(function (line) { return "<li>" + escapeHtml(line) + "</li>"; }).join("") + "</ul></section>"
      : "";
    var links = rep.links.map(function (link) {
      return '<li><a href="' + escapeHtml(link.href) + '">' + escapeHtml(link.label) + "</a></li>";
    }).join("");
    return [
      '<article class="piece">',
      ribbon,
      meta ? '<p class="meta">' + escapeHtml(meta) + "</p>" : "",
      "<h1>" + escapeHtml(clean.title || "Untitled note") + "</h1>",
      clean.dek.trim() ? '<p class="dek">' + escapeHtml(clean.dek.trim()) + "</p>" : "",
      answer,
      cite,
      '<div class="body">' + renderMarkdown(clean.body) + "</div>",
      invalidation,
      sourceHtml,
      '<section class="more"><h2>On the site</h2><ul>' + links + "</ul></section>",
      '<p class="byline">Bob Sheehan, CFA, CMT · Lighthouse Macro</p>',
      '<p class="disclaimer">' + escapeHtml(DISCLAIMER) + "</p>",
      "</article>"
    ].filter(Boolean).join("\n");
  }

  function jsonLd(note, report) {
    var clean = sanitize(note);
    var rep = report || analyze(clean);
    var slug = slugify(clean.title) || "note";
    var url = canonical(clean);
    var pillar = pillarById(clean.pillar);
    var graph = [
      {
        "@type": "Article",
        headline: clean.title,
        description: clip(clean.dek || clean.answer, 160),
        datePublished: clean.date || undefined,
        dateModified: (clean.updatedAt || clean.date || "").slice(0, 10) || undefined,
        author: { "@type": "Person", name: "Bob Sheehan", honorificSuffix: "CFA, CMT", url: "https://lighthousemacro.com/#about" },
        publisher: { "@type": "Organization", name: "Lighthouse Macro", url: "https://lighthousemacro.com", logo: "https://lighthousemacro.com/assets/logo-navy-lightsky.png" },
        mainEntityOfPage: url,
        url: url,
        about: pillar ? pillar.name : "Macro research",
        isAccessibleForFree: clean.status === "public",
        speakable: { "@type": "SpeakableSpecification", cssSelector: [".desk-answer", "h1"] }
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Lighthouse Macro", item: "https://lighthousemacro.com/" },
          { "@type": "ListItem", position: 2, name: "Pharos Desk", item: "https://lighthousemacro.com/desk/" },
          { "@type": "ListItem", position: 3, name: clean.title || "Note", item: url }
        ]
      }
    ];
    if (rep.faqs.length) {
      graph.push({
        "@type": "FAQPage",
        mainEntity: rep.faqs.map(function (item) {
          return { "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } };
        })
      });
    }
    return { "@context": "https://schema.org", "@graph": graph, slug: slug };
  }

  function safeJson(obj) {
    return JSON.stringify(obj, null, 2).replace(/</g, "\\u003c");
  }

  function markdown(note, report) {
    var clean = sanitize(note);
    var rep = report || analyze(clean);
    var series = seriesById(clean.series);
    var pillar = pillarById(clean.pillar);
    var lines = [];
    lines.push("# " + (clean.title || "Untitled note"));
    lines.push("");
    if (clean.dek.trim()) {
      lines.push("*" + clean.dek.trim() + "*");
      lines.push("");
    }
    if (clean.answer.trim()) {
      lines.push("**The answer.** " + clean.answer.trim());
      lines.push("");
    }
    if (clean.body.trim()) {
      lines.push(clean.body.trim());
      lines.push("");
    }
    if (clean.invalidation.trim()) {
      lines.push("## What would change the call");
      lines.push("");
      lines.push(clean.invalidation.trim());
      lines.push("");
    }
    var sources = sourceLines(clean);
    if (sources.length) {
      lines.push("## Sources");
      lines.push("");
      sources.forEach(function (line) { lines.push("- " + line); });
      lines.push("");
    }
    lines.push("## On the site");
    lines.push("");
    rep.links.forEach(function (link) { lines.push("- [" + link.label + "](" + link.href + ")"); });
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("Bob Sheehan, CFA, CMT · Lighthouse Macro");
    var meta = [series && series.label, pillar && pillar.name, clean.date].filter(Boolean).join(" · ");
    if (meta) lines.push(meta);
    lines.push("");
    lines.push(DISCLAIMER);
    lines.push("");
    return lines.join("\n");
  }

  function social(note) {
    var clean = sanitize(note);
    var link = canonical(clean);
    var sentence = (sentences(clean.answer)[0] || sentences(clean.dek)[0] || "").trim();
    var head = clean.title.trim() || "Lighthouse Macro";
    var text = sentence ? head + ". " + sentence : head;
    var budget = 280 - 1 - link.length;
    if (text.length > budget) {
      text = text.slice(0, Math.max(0, budget - 1)).replace(/\s+\S*$/, "").replace(/[,\s;:]+$/g, "");
      if (text.length > budget - 1) text = text.slice(0, Math.max(0, budget - 1));
      text = text + "…";
    }
    var out = (text + " " + link).trim();
    return out.length <= 280 ? out : out.slice(0, 279) + "…";
  }

  function llms(note) {
    var clean = sanitize(note);
    var series = seriesById(clean.series);
    var pillar = pillarById(clean.pillar);
    var line = clip(sentences(clean.answer)[0] || clean.dek || clean.title, 180);
    var bits = [series && series.label, pillar && pillar.name, clean.date].filter(Boolean).join(" · ");
    return "- [" + (clean.title || "Untitled") + "](" + canonical(clean) + "): " + line + (bits ? " " + bits + "." : "") + " Lighthouse Macro.";
  }

  function fullDocument(note, report) {
    var clean = sanitize(note);
    var rep = report || analyze(clean);
    var robots = clean.status === "public" && !clean.specimen ? "index,follow" : "noindex,follow";
    var description = clip(clean.dek || clean.answer || "Lighthouse Macro research.", 160);
    var style = [
      "body{margin:0;background:#F4F7F9;color:#36424C;font:17px/1.7 Inter,Georgia,serif}",
      ".wrap{max-width:760px;margin:0 auto;padding:48px 24px 80px}",
      "h1{font-family:Montserrat,Inter,sans-serif;font-weight:800;font-size:clamp(32px,5vw,48px);line-height:1.05;letter-spacing:-.02em;color:#123456;margin:12px 0}",
      "h2{font-family:Montserrat,Inter,sans-serif;font-size:26px;color:#123456;margin:32px 0 12px}",
      "h3{font-family:Montserrat,Inter,sans-serif;font-size:20px;color:#123456;margin:24px 0 8px}",
      ".meta,.kicker{font-family:'Source Code Pro',ui-monospace,monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#2389BB}",
      ".dek{font-size:20px;color:#123456}",
      ".desk-answer{border-left:3px solid #FF6723;padding:4px 0 4px 16px;margin:24px 0}",
      ".cite{margin:24px 0;padding:16px 18px;background:#fff;border:1px solid #E3E8EC;border-radius:14px}",
      ".cite footer{margin-top:8px;color:#898989;font-size:14px}",
      ".invalidation{background:#123456;color:#E6EEF5;padding:20px 22px;border-radius:14px}",
      ".invalidation h2{color:#fff}",
      "a{color:#2389BB}",
      ".byline{font-weight:600;color:#123456}",
      ".disclaimer,.ribbon{color:#5B7189;font-size:13px;line-height:1.5}",
      ".ribbon{color:#892323;font-family:'Source Code Pro',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase}"
    ].join("");
    return [
      "<!DOCTYPE html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      "<title>" + escapeHtml((clean.title || "Note") + " | Lighthouse Macro") + "</title>",
      '<meta name="description" content="' + escapeHtml(description) + '">',
      '<meta name="robots" content="' + robots + '">',
      '<link rel="canonical" href="' + escapeHtml(canonical(clean)) + '">',
      '<meta property="og:title" content="' + escapeHtml(clean.title || "Lighthouse Macro") + '">',
      '<meta property="og:description" content="' + escapeHtml(description) + '">',
      '<meta property="og:type" content="article">',
      '<script type="application/ld+json">' + safeJson(jsonLd(clean, rep)) + "</script>",
      "<style>" + style + "</style>",
      "</head>",
      "<body>",
      '<main class="wrap">',
      articleHtml(clean, rep),
      "</main>",
      "</body>",
      "</html>",
      ""
    ].join("\n");
  }

  function packet(note, report) {
    var clean = sanitize(note);
    var rep = report || analyze(clean);
    return {
      slug: slugify(clean.title) || "note",
      canonical: canonical(clean),
      metaTitle: (clean.title || "Note") + " | Lighthouse Macro",
      metaDescription: clip(clean.dek || clean.answer || "", 160),
      markdown: markdown(clean, rep),
      html: fullDocument(clean, rep),
      jsonld: safeJson(jsonLd(clean, rep)),
      social: social(clean),
      llms: llms(clean),
      article: articleHtml(clean, rep)
    };
  }

  var seeds = [
    sanitize({
      id: "specimen-twelve-tiles",
      specimen: true,
      status: "public",
      series: "marginal",
      pillar: "cross",
      date: "2026-11-20",
      title: "Twelve Tiles, One Board: What the Regime Read Actually Is",
      dek: "As of 2026-11-20 the regime board is split across twelve pillars. The real economy is not telling the same story as financial conditions, plumbing, or the tape.",
      question: "What is the Diagnostic Dozen regime board actually saying as of 2026-11-20?",
      answer: "As of 2026-11-20 the public regime board is split. Labor, prices, and growth are marked healthy, cooling, and above trend, while financial conditions are marked crisis, plumbing is scarce, market structure is bearish, and sentiment is fearful. The board compresses the Diagnostic Dozen. It is not a single-word call.",
      body: [
        "The regime board is the daily compression of the Diagnostic Dozen, twelve pillars read together rather than one print at a time. As of 2026-11-20 the public homepage shows twelve labels, and those labels still do not agree with each other.",
        "Labor is marked healthy. Prices are marked cooling. Growth is marked above trend. Housing is marked frozen, the consumer stressed, and business slowing. Trade is marked a dollar squeeze. Government is marked elevated. Financial is marked crisis. Plumbing is marked scarce. Market structure is marked bearish, and sentiment is marked fearful.",
        "## What the split means",
        "The Diagnostic Dozen is twelve pillars in three engines. A cross-pillar note says which engine is leading when the tiles disagree. Labor is the calm tile on this board. Financial is the stressed one. Averaging them into a single adjective throws the framework away.",
        "Macro Dynamics is the real economy. Monetary Mechanics is the Treasury, credit, and the Federal Reserve's liquidity. Market Structure is the tape: breadth, leadership, and positioning. The board compresses the three engines. The note is the judgment about which one is leading.",
        "## What this specimen is",
        "This page restates labels published on the Lighthouse Macro homepage on 2026-11-20. It is the worked example shipped with the desk, so the agents have a complete note to score. It is not a new house view, and it is not a forecast.",
        "A tile is a label on a composite, not a trade. The thresholds live on the methodology page."
      ].join("\n\n"),
      invalidation: "This specimen goes stale on the day the homepage tiles change. A research note that cites a tile is wrong when that label is no longer the label on the live board for the date it names.",
      sources: "Lighthouse Macro regime board — homepage tiles dated 2026-11-20\nLighthouse Macro methodology — published thresholds for the twelve pillars",
      updatedAt: "2026-11-20T00:00:00.000Z"
    }),
    sanitize({
      id: "draft-unfinished",
      specimen: false,
      status: "draft",
      series: "beam",
      pillar: "",
      date: "2026-11-20",
      title: "Rough draft: an unfinished print",
      dek: "Jobs.",
      question: "what happened to hiring",
      answer: "",
      body: "Hiring cooled and the layoff rate did not jump. The labor pillar is a set of flows, not one payroll headline. A single month is not the cycle. The note still needs a source, a date on the figure, and the line that would change the call.",
      invalidation: "",
      sources: "",
      updatedAt: "2026-11-20T00:00:00.000Z"
    })
  ];

  return {
    SHIP_AT: SHIP_AT,
    DISCLAIMER: DISCLAIMER,
    SERIES: SERIES,
    PILLARS: PILLARS,
    AGENTS: AGENTS,
    seeds: seeds,
    uid: uid,
    slugify: slugify,
    wordCount: wordCount,
    words: words,
    sentences: sentences,
    numbersIn: numbersIn,
    escapeHtml: escapeHtml,
    sanitize: sanitize,
    blankNote: blankNote,
    clone: clone,
    seriesById: seriesById,
    pillarById: pillarById,
    analyze: analyze,
    shipLine: shipLine,
    applyFix: applyFix,
    renderMarkdown: renderMarkdown,
    articleHtml: articleHtml,
    packet: packet,
    canonical: canonical,
    score: score
  };
});
