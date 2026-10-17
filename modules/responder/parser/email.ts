import type { ParsedEmail } from "./types.js";

/** Minimal MIME reader: enough for portal alert mail (text/plain, text/html, multipart/alternative, base64/quoted-printable). */

function unfoldHeaders(raw: string): string[] {
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (/^[ \t]/.test(line) && out.length > 0) {
      out[out.length - 1] += " " + line.trim();
    } else {
      out.push(line);
    }
  }
  return out;
}

export function parseHeaders(headerBlock: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of unfoldHeaders(headerBlock)) {
    const m = /^([^:]+):\s*(.*)$/.exec(line);
    if (m) headers[m[1]!.trim().toLowerCase()] = m[2]!.trim();
  }
  return headers;
}

function decodeQuotedPrintable(s: string): string {
  return s
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

function decodeBody(body: string, encoding: string | undefined): string {
  const enc = (encoding ?? "").toLowerCase().trim();
  if (enc === "base64") {
    return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
  }
  if (enc === "quoted-printable") {
    return Buffer.from(decodeQuotedPrintable(body), "latin1").toString("utf8");
  }
  return body;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface Part {
  contentType: string;
  transferEncoding?: string;
  body: string;
}

function splitParts(raw: string, headers: Record<string, string>): Part[] {
  const ct = headers["content-type"] ?? "text/plain";
  const boundaryMatch = /boundary="?([^";]+)"?/i.exec(ct);
  if (!boundaryMatch) {
    return [{ contentType: ct, transferEncoding: headers["content-transfer-encoding"], body: raw }];
  }
  const boundary = boundaryMatch[1]!;
  const segments = raw.split("--" + boundary);
  const parts: Part[] = [];
  for (const seg of segments) {
    const trimmed = seg.replace(/^\r?\n/, "").replace(/--\s*$/, "");
    if (!trimmed.trim() || trimmed.trim() === "--") continue;
    const sep = trimmed.search(/\r?\n\r?\n/);
    if (sep === -1) continue;
    const partHeaders = parseHeaders(trimmed.slice(0, sep));
    const partBody = trimmed.slice(sep).replace(/^(\r?\n){2}/, "");
    const pct = partHeaders["content-type"] ?? "text/plain";
    if (/^multipart\//i.test(pct)) {
      parts.push(...splitParts(trimmed, partHeaders));
    } else {
      parts.push({ contentType: pct, transferEncoding: partHeaders["content-transfer-encoding"], body: partBody });
    }
  }
  return parts;
}

export function parseEmail(raw: string): ParsedEmail {
  const sep = raw.search(/\r?\n\r?\n/);
  const headerBlock = sep === -1 ? raw : raw.slice(0, sep);
  const bodyRaw = sep === -1 ? "" : raw.slice(sep).replace(/^(\r?\n){2}/, "");
  const headers = parseHeaders(headerBlock);

  const parts = splitParts(bodyRaw, headers);
  const plain = parts.find((p) => /^text\/plain/i.test(p.contentType));
  const html = parts.find((p) => /^text\/html/i.test(p.contentType));

  const plainText = plain ? decodeBody(plain.body, plain.transferEncoding).trim() : "";
  const htmlText = html ? htmlToText(decodeBody(html.body, html.transferEncoding)).trim() : "";
  let text = "";
  if (htmlText.length > plainText.length * 2) {
    // Plain part is a stub ("view in an HTML-capable client") - use the HTML.
    text = htmlText;
  } else {
    text = plainText || htmlText;
  }
  if (!text && parts[0]) {
    text = decodeBody(parts[0].body, parts[0].transferEncoding);
  }

  return {
    headers,
    subject: headers["subject"] ?? "",
    from: headers["from"] ?? "",
    text: text.trim(),
  };
}
