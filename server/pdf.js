import zlib from "node:zlib";

// Robust-enough PDF page counter (no dependency). Works for plain PDFs by
// counting page objects / the page-tree /Count, and for PDF 1.5+ files that
// hide page objects inside FlateDecode object streams by inflating those
// streams and looking inside. Falls back to 1 — never throws.

function countPageObjects(text) {
  // /Type /Page  (but NOT /Pages, /PageLabels, ...)
  return (text.match(/\/Type\s*\/Page(?![sA-Za-z])/g) || []).length;
}

function maxCountValue(text) {
  const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  return counts.length ? Math.max(...counts) : 0;
}

export function countPdfPages(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5) {
    return 1;
  }
  const raw = buffer.toString("latin1");
  let pageObjects = countPageObjects(raw);
  let maxCount = maxCountValue(raw);

  // Only dig into compressed streams when the page objects aren't visible in the
  // clear (keeps plain PDFs fast — no inflation at all).
  if (pageObjects === 0) {
    const streamRe = /stream\r?\n/g;
    let match;
    while ((match = streamRe.exec(raw)) !== null) {
      const start = match.index + match[0].length;
      let end = raw.indexOf("endstream", start);
      if (end === -1) continue;
      if (raw[end - 1] === "\n") end -= 1;
      if (raw[end - 1] === "\r") end -= 1;
      if (end <= start) continue;

      const chunk = buffer.subarray(start, end);
      let inflated;
      try {
        inflated = zlib.inflateSync(chunk);
      } catch {
        try {
          inflated = zlib.inflateRawSync(chunk);
        } catch {
          inflated = null;
        }
      }
      if (inflated) {
        const text = inflated.toString("latin1");
        pageObjects += countPageObjects(text);
        maxCount = Math.max(maxCount, maxCountValue(text));
      }
    }
  }

  return Math.max(pageObjects, maxCount, 1);
}
