#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const D = require("./engine.js");

function option(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) return true;
  return value;
}

function help() {
  return [
    "Pharos Desk",
    "",
    "The SEO, GEO, and AEO engines behind the research editor.",
    "They score a note and build its packet. They do not invent figures.",
    "",
    "Usage",
    "  node desk/cli.js analyze --seed specimen --today 2026-11-20",
    "  node desk/cli.js analyze note.json --json --strict",
    "  node desk/cli.js packet --seed specimen --format markdown",
    "",
    "Commands",
    "  analyze   Print each agent's score and the checks still open.",
    "  packet    Print one export: markdown, html, jsonld, social, llms, or all.",
    "",
    "Options",
    "  --seed specimen|draft   Use a note shipped with the desk.",
    "  --today YYYY-MM-DD      Date the freshness check measures from. The default is this machine's calendar date.",
    "  --json                  Print the analyze report as JSON.",
    "  --strict                Exit 1 unless SEO, GEO, and AEO all clear 80.",
    "  --format name           Packet field to print. Default: markdown.",
    "",
    "A file path ending in .json is read as the note.",
    ""
  ].join("\n");
}

function loadNote(args) {
  const seed = option(args, "--seed");
  if (seed && seed !== true) {
    const note = D.seeds.find((item) => item.id.indexOf(seed) !== -1);
    if (!note) {
      throw new Error("No seed matches \"" + seed + "\". Use specimen or draft.");
    }
    return D.clone(note);
  }
  const file = args.find((arg) => !arg.startsWith("-") && arg !== "analyze" && arg !== "packet" && arg !== "help" && /\.json$/i.test(arg));
  if (!file) throw new Error("Pass a note.json path or --seed specimen.");
  return D.sanitize(JSON.parse(fs.readFileSync(file, "utf8")));
}

function printReport(report) {
  const lines = ["SEO " + report.seo.score + "   GEO " + report.geo.score + "   AEO " + report.aeo.score, D.shipLine(report), ""];
  ["seo", "geo", "aeo"].forEach((id) => {
    lines.push(id.toUpperCase());
    report[id].checks.forEach((item) => {
      lines.push("  " + item.status.padEnd(4, " ") + "  " + item.label);
      lines.push("        " + item.detail);
    });
    lines.push("");
  });
  return lines.join("\n");
}

function main(argv) {
  const args = argv.slice(2);
  if (!args.length || args.includes("--help") || args.includes("help") || args[0] === "-h") {
    process.stdout.write(help());
    return 0;
  }
  const command = args.find((arg) => arg === "analyze" || arg === "packet") || "analyze";
  const today = option(args, "--today");
  const note = loadNote(args);
  const report = D.analyze(note, { today: today && today !== true ? today : undefined });
  if (command === "packet") {
    const packed = D.packet(note, report);
    const format = option(args, "--format");
    const name = format && format !== true ? format : "markdown";
    if (name === "all") {
      process.stdout.write(JSON.stringify({
        slug: packed.slug,
        canonical: packed.canonical,
        markdown: packed.markdown,
        html: packed.html,
        jsonld: packed.jsonld,
        social: packed.social,
        llms: packed.llms
      }, null, 2) + "\n");
    } else if (!Object.prototype.hasOwnProperty.call(packed, name)) {
      throw new Error("Unknown format \"" + name + "\". Use markdown, html, jsonld, social, llms, or all.");
    } else {
      process.stdout.write(String(packed[name]).replace(/\s*$/, "") + "\n");
    }
  } else if (args.includes("--json")) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else process.stdout.write(printReport(report));
  if (args.includes("--strict") && report.min < D.SHIP_AT) return 1;
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main(process.argv));
  } catch (error) {
    process.stderr.write(error.message + "\n");
    process.exit(2);
  }
}

module.exports = { main: main };
