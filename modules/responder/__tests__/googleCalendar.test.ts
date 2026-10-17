import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleCalendarProvider } from "../intake/googleCalendar.js";
import { GoogleAuth } from "../intake/auth.js";
import { parseEnquiry } from "../parser/index.js";
import { candidateSlots } from "../flow/slots.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const enquiry = parseEnquiry(readFileSync(join(fixtures, "property24-basic.eml"), "utf8"));

interface Call { url: string; method: string; body?: Record<string, unknown>; }

function fakeAuth(calls: Call[], busy: { start: string; end: string }[]): GoogleAuth {
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 });
    }
    calls.push({ url: u, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (u.includes("/freeBusy")) {
      return new Response(JSON.stringify({ calendars: { primary: { busy } } }), { status: 200 });
    }
    if (u.includes("/events")) {
      return new Response(JSON.stringify({ id: "evt-123", htmlLink: "https://calendar.google.com/event?eid=evt-123" }), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  return new GoogleAuth({ clientId: "c", clientSecret: "s", refreshToken: "r" }, fetchImpl);
}

const CFG = { calendarId: "primary", viewingDurationMin: 30, agentName: "Thabiso" };

test("free/busy filtering drops occupied candidates", async () => {
  const calls: Call[] = [];
  const now = new Date();
  const first = candidateSlots(1, now)[0]!;
  // Make the first two candidates busy; the provider must skip them.
  const second = candidateSlots(2, now)[1]!;
  const busy = [first, second].map((s) => ({
    start: s.start.toISOString(),
    end: new Date(s.start.getTime() + 30 * 60_000).toISOString(),
  }));
  const cal = new GoogleCalendarProvider(fakeAuth(calls, busy), CFG);
  const slots = await cal.getAvailableSlots(3, now);

  assert.equal(slots.length, 3);
  const offeredStarts = slots.map((s) => s.start.getTime());
  assert.ok(!offeredStarts.includes(first.start.getTime()), "busy slot 1 excluded");
  assert.ok(!offeredStarts.includes(second.start.getTime()), "busy slot 2 excluded");

  const fb = calls.find((c) => c.url.includes("/freeBusy"));
  assert.ok(fb);
  assert.equal((fb!.body as { items: { id: string }[] }).items[0]!.id, "primary");
});

test("bookSlot writes a viewing event with lead details and SAST times", async () => {
  const calls: Call[] = [];
  const cal = new GoogleCalendarProvider(fakeAuth(calls, []), CFG);
  const slot = candidateSlots(1, new Date())[0]!;
  const ev = await cal.bookSlot(slot, enquiry);

  assert.equal(ev.eventId, "evt-123");
  assert.match(ev.htmlLink!, /calendar\.google\.com/);

  const insert = calls.find((c) => c.url.includes("/events"));
  assert.ok(insert);
  const body = insert!.body as {
    summary: string; description: string;
    start: { dateTime: string; timeZone: string }; end: { dateTime: string; timeZone: string };
  };
  assert.match(body.summary, /Viewing: 3 Bedroom House for Sale in Fourways - Sipho Dlamini/);
  assert.match(body.description, /27825550134/);
  assert.match(body.description, /property24/);
  assert.equal(body.start.timeZone, "Africa/Johannesburg");
  const durMs = new Date(body.end.dateTime).getTime() - new Date(body.start.dateTime).getTime();
  assert.equal(durMs, 30 * 60_000);
});

test("booking write flows through the conversation and lands in the handover note", async () => {
  const { LeadConversation } = await import("../flow/conversation.js");
  const booked: { slot: unknown; enquiry: unknown }[] = [];
  const calendar = {
    getAvailableSlots: async (n: number) => candidateSlots(n),
    bookSlot: async (slot: unknown, enq: unknown) => {
      booked.push({ slot, enquiry: enq });
      return { eventId: "evt-1", htmlLink: "https://calendar.google.com/event?eid=evt-1" };
    },
  };
  const convo = new LeadConversation(enquiry, { agentName: "Thabiso", calendar });
  convo.initialMessages();
  await convo.handleReply("R2.5m, pre-approved");
  const r = await convo.handleReply("1");
  assert.equal(r.state, "BOOKED");
  assert.equal(booked.length, 1);
  assert.match(convo.handoverNote(), /calendar\.google\.com\/event\?eid=evt-1/);
});

test("failed booking write still confirms the lead and flags the agent", async () => {
  const { LeadConversation } = await import("../flow/conversation.js");
  const calendar = {
    getAvailableSlots: async (n: number) => candidateSlots(n),
    bookSlot: async () => { throw new Error("calendar down"); },
  };
  const convo = new LeadConversation(enquiry, { agentName: "Thabiso", calendar });
  convo.initialMessages();
  await convo.handleReply("R2.5m, cash");
  const r = await convo.handleReply("1");
  assert.equal(r.state, "BOOKED");
  assert.match(r.messages[0]!, /booked to view/i); // lead still confirmed
  assert.match(convo.handoverNote(), /calendar write failed/i); // agent flagged
});
