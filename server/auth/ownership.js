// Per-resource authorization. Today: the owner or an admin may access a
// resource. The sharing phase layers ACL grants, share links and team
// membership on top of this same helper, so routes call canAccessResource()
// rather than checking ownerId directly.

export function isOwner(user, resource) {
  return !!user && !!resource && !!resource.ownerId && resource.ownerId === user.id;
}

function grantActive(grant) {
  if (!grant) return false;
  if (grant.revoked) return false;
  if (grant.expiresAt && new Date(grant.expiresAt).getTime() < Date.now()) return false;
  return true;
}

// Does an ACL on the resource grant this user (directly, by role, or by team)
// access? teamIds is the set of teams the user belongs to (optional).
export function aclGrantsAccess(user, resource, teamIds = []) {
  const teams = new Set(teamIds);
  return (Array.isArray(resource.acl) ? resource.acl : []).some((grant) => {
    if (!grantActive(grant)) return false;
    if (grant.principalType === "user") return grant.principalId === user.id;
    if (grant.principalType === "role") return grant.principalId === user.role;
    if (grant.principalType === "team") return teams.has(grant.principalId);
    return false;
  });
}

export function canAccessResource(user, resource, teamIds = []) {
  if (!user || !resource) {
    return false;
  }
  if (user.role === "admin") {
    return true;
  }
  if (isOwner(user, resource)) {
    return true;
  }
  return aclGrantsAccess(user, resource, teamIds);
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
