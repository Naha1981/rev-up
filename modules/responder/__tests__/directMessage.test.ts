import { test } from "node:test";
import assert from "node:assert/strict";
import { startService } from "../server.js";

async function selftest(port: number, body: string, headers: Record<string, string> = {}) {
  const res = await fetch(`http://127.0.0.1:${port}/selftest/enquiry`, {
    method: "POST",
    headers: { "content-type": "text/plain", ...headers },
    body,
  });
  assert.equal(res.status, 200);
  return (await res.json()) as {
    status: string;
    reason: string | null;
    replies: { to: string; text: string }[];
  };
}

test("try-it: restaurant enquiry without a phone gets a business reply with the menu", async () => {
  const port = 35000 + Math.floor(Math.random() * 1000);
  const svc = await startService({ PORT: String(port), RESPONDER_SELFTEST: "1" } as NodeJS.ProcessEnv);
  try {
    const r = await selftest(
      port,
      "Hi, do you have a table for 4 this Saturday evening around 7pm? Also what vegetarian options do you have?",
      {
        "x-industry": "restaurant",
        "x-menu-context": "QA Peri-Peri Chicken R129; Braai Platter R185",
        "x-business-name": "QA Grill House",
      },
    );
    assert.equal(r.status, "replied");
    assert.equal(r.replies.length, 1);
    const text = r.replies[0]!.text;
    assert.match(text, /QA Grill House's assistant/);
    assert.match(text, /From our current menu: QA Peri-Peri Chicken R129/);
    // party size, day/time and the dietary ask were all in the message: acknowledge, don't re-ask
    assert.match(text, /Noted: 4 people, this Saturday at 7pm, vegetarian noted\./);
    assert.doesNotMatch(text, /How many people|What day and time|dietary needs or allergies/);
    assert.match(text, /I'll check with the kitchen on vegetarian options/);
    assert.match(text, /I'll confirm your table here on WhatsApp shortly\./);
    assert.doesNotMatch(text, /property|viewing|bond/i);
    assert.equal(r.replies[0]!.to, "+27820000001");
  } finally {
    await svc.stop();
  }
});

test("try-it: general enquiry without a phone never uses property wording", async () => {
  const port = 36000 + Math.floor(Math.random() * 1000);
  const svc = await startService({ PORT: String(port), RESPONDER_SELFTEST: "1" } as NodeJS.ProcessEnv);
  try {
    const r = await selftest(
      port,
      "Hi, I would like to know what services you offer and what your prices are please",
      { "x-industry": "general", "x-business-name": "QA Services" },
    );
    assert.equal(r.status, "replied");
    const text = r.replies[0]!.text;
    assert.match(text, /thanks for getting in touch/);
    assert.doesNotMatch(text, /property|viewing|bond|about your enquiry/i);
  } finally {
    await svc.stop();
  }
});

test("try-it: a typed phone number is used as the sender", async () => {
  const port = 37000 + Math.floor(Math.random() * 1000);
  const svc = await startService({ PORT: String(port), RESPONDER_SELFTEST: "1" } as NodeJS.ProcessEnv);
  try {
    const r = await selftest(
      port,
      "Hi, this is Lerato, my number is 082 555 0134. Do you have a table for two on Friday night?",
      { "x-industry": "restaurant" },
    );
    assert.equal(r.status, "replied");
    assert.equal(r.replies[0]!.to, "27825550134");
    assert.match(r.replies[0]!.text, /Hi Lerato/);
  } finally {
    await svc.stop();
  }
});

test("try-it: details already given are acknowledged, not re-asked", async () => {
  const port = 38000 + Math.floor(Math.random() * 1000);
  const svc = await startService({ PORT: String(port), RESPONDER_SELFTEST: "1" } as NodeJS.ProcessEnv);
  try {
    const r = await selftest(
      port,
      "Hi, do you have a table for 4 this Saturday at 7pm? Also what vegetarian options do you have?",
      {
        "x-industry": "restaurant",
        "x-menu-context": "QA Peri-Peri Chicken R129.00; QA Veggie Bowl R89.00 (vegetarian)",
        "x-business-name": "QA Grill House",
      },
    );
    assert.equal(r.status, "replied");
    const text = r.replies[0]!.text;
    assert.match(text, /Noted: 4 people, this Saturday at 7pm, vegetarian noted\./);
    assert.doesNotMatch(text, /How many people|What day and time|dietary needs or allergies/);
    assert.match(text, /Vegetarian options: QA Veggie Bowl R89\.00 \(vegetarian\)/);
    assert.match(text, /I'll confirm your table here on WhatsApp shortly\./);
    assert.doesNotMatch(text, /quick question/);
  } finally {
    await svc.stop();
  }
});

test("try-it: dietary ask without a matching menu item gets an honest fallback", async () => {
  const port = 39000 + Math.floor(Math.random() * 1000);
  const svc = await startService({ PORT: String(port), RESPONDER_SELFTEST: "1" } as NodeJS.ProcessEnv);
  try {
    const r = await selftest(
      port,
      "Table for 2 on Friday evening, anything vegan?",
      { "x-industry": "restaurant", "x-menu-context": "QA Peri-Peri Chicken R129.00" },
    );
    const text = r.replies[0]!.text;
    assert.match(text, /Noted: 2 people, Friday evening, vegan noted\./);
    assert.match(text, /I'll check with the kitchen on vegan options and let you know\./);
    assert.doesNotMatch(text, /How many people|What day and time/);
  } finally {
    await svc.stop();
  }
});
