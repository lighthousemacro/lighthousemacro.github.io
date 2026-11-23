"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("./engine.js");

const TODAY = "2026-11-20";

function specimen() {
  return D.seeds.find((note) => note.id === "specimen-twelve-tiles");
}

function draft() {
  return D.seeds.find((note) => note.id === "draft-unfinished");
}

function badChecks(report, agent) {
  return report[agent].checks
    .filter((item) => item.status !== "pass")
    .map((item) => item.id + ":" + item.status + ":" + item.detail);
}

test("the specimen clears search, generative, and answer checks", () => {
  const report = D.analyze(specimen(), { today: TODAY });
  assert.deepEqual(badChecks(report, "seo"), []);
  assert.deepEqual(badChecks(report, "geo"), []);
  assert.deepEqual(badChecks(report, "aeo"), []);
  assert.ok(report.min >= D.SHIP_AT);
  assert.match(D.shipLine(report), /ready to file/);
});

test("the unfinished draft is caught and can draft an answer from its own sentences", () => {
  const note = draft();
  const before = D.analyze(note, { today: TODAY });
  assert.ok(before.min < D.SHIP_AT);
  assert.ok(before.aeo.checks.some((item) => item.id === "answer" && item.status === "fail"));
  assert.ok(before.geo.checks.some((item) => item.id === "sources" && item.status === "fail"));
  assert.ok(before.seo.checks.some((item) => item.id === "pillar" && item.status === "fail"));

  const result = D.applyFix(note, "draft-answer");
  assert.equal(result.applied, true);
  const flat = note.body.replace(/\s+/g, " ");
  D.sentences(result.note.answer).forEach((sentence) => {
    assert.ok(flat.includes(sentence), sentence);
  });
  D.numbersIn(result.note.answer).forEach((n) => {
    assert.ok(D.numbersIn(note.body).includes(n));
  });
  assert.ok(D.wordCount(result.note.answer) >= 35);
  assert.ok(D.wordCount(result.note.answer) <= 80);
});

test("fixes do not invent a figure or a definition twice", () => {
  const thin = D.blankNote({
    title: "A short beam about nothing yet",
    body: "Too thin.",
    pillar: "labor",
    question: "Did hiring cool"
  });
  const blocked = D.applyFix(thin, "draft-answer");
  assert.equal(blocked.applied, false);
  assert.match(blocked.message, /will not invent a figure/);

  const marked = D.applyFix(thin, "mark-question");
  assert.equal(marked.note.question, "Did hiring cool?");

  const defined = D.applyFix(thin, "insert-definition");
  assert.equal(defined.applied, true);
  assert.match(defined.note.body, /Labor is the source code/);
  const again = D.applyFix(defined.note, "insert-definition");
  assert.equal(again.applied, false);
});

test("an answer cannot introduce a number the body does not contain", () => {
  const note = D.clone(specimen());
  note.answer = "The policy rate is 9.9% and that alone settles the call for the next year of this note.";
  const report = D.analyze(note, { today: TODAY });
  const faithful = report.aeo.checks.find((item) => item.id === "answer-faithful");
  assert.equal(faithful.status, "fail");
  assert.match(faithful.detail, /9\.9%/);
});

test("absolute language is a warning, and markdown stays text", () => {
  const note = D.clone(specimen());
  note.body = note.body + "\n\nThis is always true.";
  const report = D.analyze(note, { today: TODAY });
  assert.equal(report.geo.checks.find((item) => item.id === "absolutes").status, "warn");

  const html = D.renderMarkdown("Hello <img src=x onerror=alert(1)> and **bold**.");
  assert.equal(html.includes("<img"), false);
  assert.match(html, /&lt;img/);
  assert.match(html, /<strong>bold<\/strong>/);
});

test("the packet is citable, escaped, and short enough to post", () => {
  const note = specimen();
  const packed = D.packet(note, D.analyze(note, { today: TODAY }));
  assert.equal(packed.slug, "twelve-tiles-one-board-what-the-regime-read-actually-is");
  assert.ok(packed.social.length <= 280);
  assert.match(packed.jsonld, /FAQPage/);
  assert.match(packed.jsonld, /Bob Sheehan/);
  assert.match(packed.jsonld, /SpeakableSpecification/);
  assert.match(packed.html, /noindex,follow/);
  assert.match(packed.markdown, /What would change the call/);
  assert.equal(packed.markdown.includes("Reading Room"), false);
  assert.equal(packed.canonical, "https://lighthousemacro.com/desk/#/read/" + packed.slug);
  const published = D.clone(note);
  published.specimen = false;
  published.status = "public";
  assert.equal(D.canonical(published), "https://lighthousemacro.com/desk/#/read/" + packed.slug);
  assert.match(packed.llms, /Lighthouse Macro/);
  assert.match(packed.article, /class="desk-answer"/);
  assert.match(packed.article, /Not a new forecast/);

  const evil = D.blankNote({
    title: "</script><script>alert(1)</script>",
    dek: "A description long enough to stand in for search text, written so the packet still has a sentence to show the reader.",
    body: "The body has enough words to render and it includes <b>markup</b> that must stay text in the page rather than run. " + "More words follow so the opening clears forty. ".repeat(3),
    date: TODAY,
    series: "beam",
    pillar: "labor",
    status: "public"
  });
  const html = D.packet(evil).html;
  assert.equal(html.includes("</script><script>alert"), false);
  assert.match(html, /&lt;script&gt;alert/);
});

test("a shared slug is flagged when the library is known", () => {
  const a = D.clone(specimen());
  const b = D.clone(specimen());
  b.id = "other-copy";
  const report = D.analyze(a, { today: TODAY, library: [a, b] });
  assert.equal(report.seo.checks.find((item) => item.id === "slug").status, "warn");
});

test("the title trim stays on a word boundary", () => {
  const note = D.blankNote({
    title: "This title is deliberately far too long for a search result and should be cut on a word"
  });
  const result = D.applyFix(note, "trim-title");
  assert.equal(result.applied, true);
  assert.ok(result.note.title.length <= 66);
  assert.equal(result.note.title.endsWith(" "), false);
  assert.ok(note.title.startsWith(result.note.title));
});

test("dates, slugs, and source names stay strict", () => {
  assert.equal(D.sanitize({ id: "bad/id", date: "2026-02-31", title: "A note" }).date, "");
  assert.equal(D.sanitize({ id: "bad/id", title: "A note" }).id.includes("/"), false);

  const later = D.clone(specimen());
  later.date = "2026-11-21";
  assert.equal(D.analyze(later, { today: TODAY }).geo.checks.find((item) => item.id === "freshness").status, "warn");

  const overlap = D.blankNote({
    title: "The corporate print is the whole story for now",
    question: "What is the policy rate?",
    date: TODAY,
    series: "beam",
    pillar: "labor"
  });
  assert.equal(D.analyze(overlap, { today: TODAY }).seo.checks.find((item) => item.id === "question-overlap").status, "warn");

  const loose = D.clone(specimen());
  loose.sources = "Unrelated office — memo dated 2026-11-20";
  assert.equal(D.analyze(loose, { today: TODAY }).geo.checks.find((item) => item.id === "sourced-claim").status, "warn");

  const copy = D.clone(specimen());
  copy.id = "othercopy";
  assert.notEqual(D.publicSlug(specimen(), [specimen(), copy]), D.publicSlug(copy, [specimen(), copy]));
});

test("the command line scores the same engine", () => {
  const cli = path.join(__dirname, "cli.js");
  const good = spawnSync(process.execPath, [cli, "analyze", "--seed", "specimen", "--json", "--today", TODAY, "--strict"], { encoding: "utf8" });
  assert.equal(good.status, 0, good.stderr);
  const report = JSON.parse(good.stdout);
  assert.ok(report.min >= 80);

  const bad = spawnSync(process.execPath, [cli, "analyze", "--seed", "draft", "--strict", "--today", TODAY], { encoding: "utf8" });
  assert.notEqual(bad.status, 0);

  const social = spawnSync(process.execPath, [cli, "packet", "--seed", "specimen", "--format", "social"], { encoding: "utf8" });
  assert.equal(social.status, 0, social.stderr);
  assert.ok(social.stdout.trim().length <= 280);

  const strictPacket = spawnSync(process.execPath, [cli, "packet", "--seed", "draft", "--strict", "--today", TODAY, "--format", "social"], { encoding: "utf8" });
  assert.equal(strictPacket.status, 1);
  assert.ok(strictPacket.stdout.trim().length > 0);
});
