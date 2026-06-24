import test from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { countPdfPages } from "../server/pdf.js";

test("countPdfPages: plain (uncompressed) PDF counts page objects", () => {
  const pdf = Buffer.from(
    "%PDF-1.4\n" +
      "3 0 obj <</Type /Page>> endobj\n" +
      "4 0 obj <</Type /Page>> endobj\n" +
      "5 0 obj <</Type /Pages /Count 2>> endobj\n" +
      "%%EOF",
    "latin1",
  );
  assert.equal(countPdfPages(pdf), 2);
});

test("countPdfPages: compressed object stream (PDF 1.5+) is inflated", () => {
  // Real-world PDFs hide page objects inside a FlateDecode object stream — the
  // exact case the client-side regex can't see and that showed "1 page".
  const inner = "<</Type /Page>> <</Type /Page>> <</Type /Page>> <</Type /Pages /Count 3>>";
  const deflated = zlib.deflateSync(Buffer.from(inner, "latin1"));
  const pdf = Buffer.concat([
    Buffer.from(
      `%PDF-1.5\n10 0 obj <</Type /ObjStm /Filter /FlateDecode /Length ${deflated.length}>> stream\n`,
      "latin1",
    ),
    deflated,
    Buffer.from("\nendstream endobj\n%%EOF", "latin1"),
  ]);
  assert.equal(countPdfPages(pdf), 3);
});

test("countPdfPages: never throws, falls back to 1 on garbage", () => {
  assert.equal(countPdfPages(Buffer.from("not a pdf at all")), 1);
  assert.equal(countPdfPages(Buffer.alloc(0)), 1);
  assert.equal(countPdfPages(null), 1);
});
