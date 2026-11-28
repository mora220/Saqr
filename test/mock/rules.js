// JS copy of firestore.rules for the mock (keep in sync). Returns an error string, or "" when allowed.
const keysChanged = (a, b) => { const s = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]); return [...s].filter(k => JSON.stringify((a || {})[k]) !== JSON.stringify((b || {})[k])); };
const onlyKeys = (a, b, allowed) => keysChanged(a, b).every(k => allowed.includes(k));

export function check(op, path, before, after, auth, get) {
  const p = path.split("/"), uid = auth && auth.uid, read = op === "get" || op === "list";
  const kid = code => get("kids/" + code);
  const isKidOwner = code => !!uid && !!kid(code) && kid(code).owner === uid;
  const isKidParent = code => !!uid && !!kid(code) && !!(kid(code).parents || {})[uid];
  const deny = m => m || "denied";

  if (p[0] === "classes" && p.length === 2) {
    if (!uid) return "no auth";
    if (read || op === "delete") return before && before.owner === uid ? "" : deny("not owner");
    if (op === "create") return after.owner === uid ? "" : deny("owner mismatch");
    if (op === "update") return before.owner === uid && after.owner === uid ? "" : deny("not owner");
  }
  if ((p[0] === "users" || p[0] === "parents") && p.length === 2) return uid && uid === p[1] ? "" : deny("not self");
  if (p[0] === "kids" && p.length === 2) {
    if (op === "get") return "";
    if (op === "list") return uid && before && before.owner === uid ? "" : deny("list kids");
    if (op === "create") return uid && after.owner === uid ? "" : deny();
    if (op === "delete") return uid && before.owner === uid ? "" : deny();
    if (op === "update") {
      if (uid && before.owner === uid && after.owner === uid) return "";
      if (onlyKeys(before, after, ["look", "lookAt"])) return "";
      if (uid && onlyKeys(before, after, ["parents"]) && onlyKeys(before.parents, after.parents, [uid])) return "";
      return deny("kid update");
    }
  }
  if (p[0] === "threads" && p.length === 2) {
    const code = p[1], member = isKidOwner(code) || isKidParent(code);
    if (op === "get") return member ? "" : deny("not member");
    if (op === "list") return uid && before && before.owner === uid ? "" : deny("list threads");
    if (op === "create") return member && after.owner === kid(code).owner ? "" : deny("thread create");
    if (op === "update") return member && after.owner === before.owner ? "" : deny("thread update");
    if (op === "delete") return isKidOwner(code) ? "" : deny();
  }
  if (p[0] === "threads" && p[2] === "msgs" && p.length === 4) {
    const code = p[1], member = isKidOwner(code) || isKidParent(code);
    if (read) return member ? "" : deny("not member");
    if (op === "create") {
      const d = after;
      if (d.uid !== uid) return "uid mismatch";
      if (typeof d.text !== "string" || !d.text.length || d.text.length > 1000) return "bad text";
      if (typeof d.at !== "number") return "bad at";
      if (d.by === "t" && isKidOwner(code)) return "";
      if (d.by === "p" && isKidParent(code)) return "";
      return "bad role";
    }
    if (op === "delete") return isKidOwner(code) ? "" : deny();
    return deny("msg update");
  }
  return "no rule for " + path;
}
