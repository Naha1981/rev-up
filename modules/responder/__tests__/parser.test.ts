import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnquiry, parseEmail, normalizeSaPhone } from "../parser/index.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const read = (f: string) => readFileSync(join(fixtures, f), "utf8");

test("phone normalisation", () => {
  assert.equal(normalizeSaPhone("082 555 0134"), "27825550134");
  assert.equal(normalizeSaPhone("+27 82 555 0134"), "27825550134");
  assert.equal(normalizeSaPhone("0027 82 555 9910"), "27825559910");
  assert.equal(normalizeSaPhone("27825550134"), "27825550134");
  assert.equal(normalizeSaPhone("82 555 0134"), "27825550134"); // missing trunk 0
  assert.equal(normalizeSaPhone("(082) 555-0134"), "27825550134");
  assert.equal(normalizeSaPhone("12345"), null);
  assert.equal(normalizeSaPhone("not a phone"), null);
});

test("property24 plain text enquiry", () => {
  const e = parseEnquiry(read("property24-basic.eml"));
  assert.equal(e.provider, "property24");
  assert.equal(e.leadName, "Sipho Dlamini");
  assert.equal(e.leadEmail, "sipho.dlamini@example.com");
  assert.equal(e.leadPhone, "27825550134");
  assert.equal(e.listingRef, "113456789");
  assert.match(e.listingTitle!, /3 Bedroom House for Sale in Fourways/);
  assert.equal(e.price, "R2,495,000");
  assert.match(e.message!, /view it this weekend/);
  assert.ok(!/stop receiving/i.test(e.message!), "footer must not leak into message");
  assert.equal(e.listingUrl, "https://www.property24.com/for-sale/fourways/sandton/gauteng/113456789");
  assert.ok(e.confidence >= 0.9);
  assert.deepEqual(e.missing, []);
});

test("property24 html-only multipart (quoted-printable)", () => {
  const e = parseEnquiry(read("property24-html.eml"));
  assert.equal(e.provider, "property24");
  assert.equal(e.leadName, "Ayanda Ngcobo");
  assert.equal(e.leadPhone, "27835556642");
  assert.equal(e.listingRef, "115222333");
  assert.match(e.message!, /relocating from Durban/i);
});

test("privateproperty plain text enquiry", () => {
  const e = parseEnquiry(read("privateproperty-basic.eml"));
  assert.equal(e.provider, "privateproperty");
  assert.equal(e.leadName, "Naledi Mokoena");
  assert.equal(e.leadPhone, "27735558877");
  assert.equal(e.listingRef, "PP987654");
  assert.match(e.message!, /pre-approved/);
  assert.ok(!/do not reply/i.test(e.message!), "footer must not leak into message");
});

test("privateproperty html-only multipart (base64)", () => {
  const e = parseEnquiry(read("privateproperty-html.eml"));
  assert.equal(e.provider, "privateproperty");
  assert.equal(e.leadName, "Kagiso Molefe");
  assert.equal(e.leadPhone, "27825559910");
  assert.equal(e.listingRef, "PP123456");
  assert.match(e.message!, /cash buyers/);
});

test("enquiry without a phone number is flagged", () => {
  const e = parseEnquiry(read("property24-no-phone.eml"));
  assert.equal(e.provider, "property24");
  assert.equal(e.leadPhone, undefined);
  assert.ok(e.missing.includes("leadPhone"));
});

test("forwarded/unknown format falls back to generic parser with capped confidence", () => {
  const e = parseEnquiry(read("forwarded-unknown.eml"));
  assert.equal(e.provider, "unknown");
  assert.equal(e.leadPhone, "27615552290");
  assert.equal(e.leadName, "Lerato Khumalo");
  assert.ok(e.confidence <= 0.6, `generic confidence must be capped, got ${e.confidence}`);
});

test("MIME header unfolding and quoted-printable decode", () => {
  const parsed = parseEmail("Subject: long subject\r\n\tcontinued here\r\nX-Test: 1\r\n\r\nbody");
  assert.equal(parsed.subject, "long subject continued here");
  assert.equal(parsed.text, "body");
});
