// Verifierar att plattformsgrunden är ADDITIV: ingen befintlig modul,
// route eller affärslogik importerar src/platform, och src/platform
// importerar ingen affärslogik, ingen databas och inget UI.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

const allFiles = walk(ROOT);
const platformFiles = allFiles.filter((f) => f.includes(`${join("src", "platform")}`));
const otherFiles = allFiles.filter((f) => !platformFiles.includes(f));

describe("Isolering av plattformslagret", () => {
  it("bara godkända skal-filer importerar src/platform", () => {
    // Life Store-vyn är den enda konsumenten tills modulmigreringen påbörjas.
    const allowed = [join("routes", "_app", "tillagg.tsx")];
    const offenders = otherFiles
      .filter((f) => !allowed.some((a) => f.endsWith(a)))
      .filter((f) => /from\s+["'](@\/platform|.*\/platform\/)/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });


  it("src/platform importerar varken databas, UI eller affärsmoduler", () => {
    const forbidden = /from\s+["'][^"']*(integrations\/supabase|@\/components|@\/modules|@\/routes|@tanstack)/;
    const offenders = platformFiles.filter((f) => forbidden.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("src/platform innehåller inga nätverksanrop", () => {
    const network = /\b(fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/;
    const offenders = platformFiles
      .filter((f) => !f.includes("__tests__"))
      .filter((f) => network.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("main-ai-prototypen finns kvar orörd", () => {
    expect(allFiles.some((f) => f.endsWith(join("_app", "main-ai.tsx")))).toBe(true);
  });
});
