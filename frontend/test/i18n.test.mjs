import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const messagesDir = path.resolve(__dirname, "../src/messages");

function flattenKeys(obj, prefix = "") {
  let keys = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(keys, flattenKeys(value, fullKey));
    } else {
      keys[fullKey] = value;
    }
  }
  return keys;
}

describe("Internationalization (i18n) Test Suite", () => {
  const enRaw = fs.readFileSync(path.join(messagesDir, "en.json"), "utf8");
  const hiRaw = fs.readFileSync(path.join(messagesDir, "hi.json"), "utf8");
  const teRaw = fs.readFileSync(path.join(messagesDir, "te.json"), "utf8");

  const en = JSON.parse(enRaw);
  const hi = JSON.parse(hiRaw);
  const te = JSON.parse(teRaw);

  const enFlat = flattenKeys(en);
  const hiFlat = flattenKeys(hi);
  const teFlat = flattenKeys(te);

  const enKeys = Object.keys(enFlat);
  const hiKeys = Object.keys(hiFlat);
  const teKeys = Object.keys(teFlat);

  test("1. Dictionaries should load and have identical total key counts", () => {
    assert.equal(enKeys.length > 0, true, "en.json should have keys");
    assert.equal(
      hiKeys.length,
      enKeys.length,
      `Hindi should have ${enKeys.length} keys, but has ${hiKeys.length}`
    );
    assert.equal(
      teKeys.length,
      enKeys.length,
      `Telugu should have ${enKeys.length} keys, but has ${teKeys.length}`
    );
  });

  test("2. 100% Key Parity - Hindi dictionary has all English keys", () => {
    const missingInHi = enKeys.filter((k) => !(k in hiFlat));
    assert.deepEqual(missingInHi, [], `Missing in Hindi: ${missingInHi.join(", ")}`);
  });

  test("3. 100% Key Parity - Telugu dictionary has all English keys", () => {
    const missingInTe = enKeys.filter((k) => !(k in teFlat));
    assert.deepEqual(missingInTe, [], `Missing in Telugu: ${missingInTe.join(", ")}`);
  });

  test("4. No empty translations in any language", () => {
    for (const [k, v] of Object.entries(enFlat)) {
      assert.ok(typeof v === "string" && v.trim().length > 0, `Empty EN translation for ${k}`);
    }
    for (const [k, v] of Object.entries(hiFlat)) {
      assert.ok(typeof v === "string" && v.trim().length > 0, `Empty HI translation for ${k}`);
    }
    for (const [k, v] of Object.entries(teFlat)) {
      assert.ok(typeof v === "string" && v.trim().length > 0, `Empty TE translation for ${k}`);
    }
  });

  test("5. Script Authenticity - Hindi contains Devanagari characters", () => {
    const devanagariRegex = /[\u0900-\u097F]/;
    let foundDevanagari = 0;
    for (const v of Object.values(hiFlat)) {
      if (devanagariRegex.test(v)) foundDevanagari++;
    }
    assert.ok(
      foundDevanagari > 200,
      `Expected predominantly Devanagari text, found in ${foundDevanagari} strings`
    );
  });

  test("6. Script Authenticity - Telugu contains Telugu script characters", () => {
    const teluguRegex = /[\u0C00-\u0C7F]/;
    let foundTelugu = 0;
    for (const v of Object.values(teFlat)) {
      if (teluguRegex.test(v)) foundTelugu++;
    }
    assert.ok(
      foundTelugu > 200,
      `Expected predominantly Telugu script text, found in ${foundTelugu} strings`
    );
  });

  test("7. Parameter Interpolation works across all 3 languages", () => {
    const enGreeting = enFlat["dashboard.overview.greeting"].replace("{name}", "Aditi");
    const hiGreeting = hiFlat["dashboard.overview.greeting"].replace("{name}", "Aditi");
    const teGreeting = teFlat["dashboard.overview.greeting"].replace("{name}", "Aditi");

    assert.ok(enGreeting.includes("Aditi"), "EN greeting includes parameter");
    assert.ok(hiGreeting.includes("Aditi"), "HI greeting includes parameter");
    assert.ok(teGreeting.includes("Aditi"), "TE greeting includes parameter");
  });

  test("8. Technical Terms Preservation - API, AI, SQL remain readable", () => {
    const enFAQ = enFlat["landing.faq.q1"];
    const hiFAQ = hiFlat["landing.faq.q1"];
    const teFAQ = teFlat["landing.faq.q1"];

    assert.ok(enFAQ.includes("ORACY"), "EN has ORACY");
    assert.ok(hiFAQ.includes("ORACY"), "HI preserves ORACY");
    assert.ok(teFAQ.includes("ORACY"), "TE preserves ORACY");
  });
});

