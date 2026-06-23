import crypto from "node:crypto";

// Append-only audit log. Entries live in dataset.auditLog (a server-only
// collection stripped from client reads). Capped so the whole-dataset payload
// can't grow without bound until a paginated audit API lands.

const MAX_AUDIT_ENTRIES = 1000;

export function recordAudit(dataset, event) {
  dataset.auditLog = dataset.auditLog || [];
  dataset.auditLog.push({
    id: `evt-${crypto.randomBytes(6).toString("hex")}`,
    ts: new Date().toISOString(),
    actorId: event.actorId || null,
    actorName: event.actorName || null,
    actorRole: event.actorRole || null,
    action: event.action,
    resourceType: event.resourceType || "auth",
    resourceId: event.resourceId || null,
    resourceName: event.resourceName || null,
    metadata: event.metadata || {},
    ip: event.ip || null,
  });
  if (dataset.auditLog.length > MAX_AUDIT_ENTRIES) {
    dataset.auditLog.splice(0, dataset.auditLog.length - MAX_AUDIT_ENTRIES);
  }
  return dataset;
}
