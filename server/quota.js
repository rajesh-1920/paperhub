// Per-user storage quota helpers. A user's limit comes from their own
// storage.limitBytes, else meta.quotaDefaults.limitBytes, else a default.

// Unlimited by default: a user is only capped if an admin sets an explicit
// per-user storage.limitBytes or meta.quotaDefaults.limitBytes.
export const DEFAULT_QUOTA_BYTES = Number.MAX_SAFE_INTEGER;

export function quotaLimitFor(dataset, ownerId) {
  const owner = (dataset.users || []).find((u) => u.id === ownerId);
  const userLimit = owner && owner.storage ? owner.storage.limitBytes : undefined;
  const metaLimit =
    dataset.meta && dataset.meta.quotaDefaults ? dataset.meta.quotaDefaults.limitBytes : undefined;
  const limit = userLimit != null ? userLimit : metaLimit != null ? metaLimit : DEFAULT_QUOTA_BYTES;
  return Number(limit);
}

// Bytes used by a user's non-trashed files (optionally excluding one file).
export function usedBytesFor(dataset, ownerId, excludeFileId) {
  return (dataset.files || [])
    .filter((f) => f.ownerId === ownerId && !f.deletedAt && f.id !== excludeFileId)
    .reduce((sum, f) => sum + Number(f.size || 0), 0);
}

// Would writing `addBytes` to `fileId` push its owner over quota?
export function wouldExceedQuota(dataset, fileId, addBytes) {
  const file = (dataset.files || []).find((f) => f.id === fileId);
  if (!file || !file.ownerId) {
    return false; // no owner to bill (e.g. ad-hoc content) — don't block
  }
  const limit = quotaLimitFor(dataset, file.ownerId);
  const used = usedBytesFor(dataset, file.ownerId, fileId);
  return used + Number(addBytes || 0) > limit;
}
