// Per-resource authorization. Today: the owner or an admin may access a
// resource. The sharing phase layers ACL grants, share links and team
// membership on top of this same helper, so routes call canAccessResource()
// rather than checking ownerId directly.

export function isOwner(user, resource) {
  return !!user && !!resource && !!resource.ownerId && resource.ownerId === user.id;
}

export function canAccessResource(user, resource) {
  if (!user || !resource) {
    return false;
  }
  if (user.role === "admin") {
    return true;
  }
  return isOwner(user, resource);
}

// Express helper: 404 (not 403) when a resource is missing or inaccessible, so
// existence isn't leaked to users who can't see it.
export function requireResourceAccess(req, res, resource) {
  if (!resource || !canAccessResource(req.user, resource)) {
    res.status(404).json({ error: "Not found" });
    return false;
  }
  return true;
}
