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
      if (onlyKeys(before, after, ["req"])) {
        const q = after.req;
        if (q === undefined) return "";
        const ok = Object.keys(q).every(k => ["id", "t", "e", "c", "at"].includes(k)) && typeof q.t === "string" && q.t.length <= 40 && typeof q.e === "string" && q.e.length <= 12 && Number.isInteger(q.c) && q.c <= (before.balance || 0);
        return ok ? "" : "bad req";
      }
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
  if (p[0] === "hw" && p.length === 2) {
    if (op === "get") return "";
    if (op === "list") return uid && before && before.owner === uid ? "" : deny("list hw");
    if (op === "create") return uid && after.owner === uid ? "" : deny("hw create");
    if (op === "update") return uid && before.owner === uid && after.owner === uid ? "" : deny();
    if (op === "delete") return uid && before.owner === uid ? "" : deny();
  }
  if (p[0] === "subs" && p.length === 2) {
    if (op === "get") return "";
    if (op === "list") return uid && before && before.owner === uid ? "" : deny("list subs");
    if (op === "create") {
      const d = after, hw = get("hw/" + d.hw), k = kid(d.code);
      const allowed = ["owner", "hw", "cid", "code", "name", "ans", "score", "total", "at", "awarded"];
      if (p[1] !== d.hw + "_" + d.code) return "bad id";
      if (!Object.keys(d).every(x => allowed.includes(x))) return "extra keys";
      if (!hw) return "no hw"; if (hw.owner !== d.owner) return "owner"; if (hw.cid !== d.cid) return "cid";
      if (Date.now() > hw.due) return "past due";
      if (!k || k.cid !== d.cid) return "kid cid";
      if (d.awarded !== false) return "awarded";
      if (!Array.isArray(d.ans) || d.ans.length > 100) return "ans";
      if (typeof d.name !== "string" || d.name.length > 40) return "name";
      return "";
    }
    if (op === "update") return uid && before.owner === uid && onlyKeys(before, after, ["awarded", "pts"]) ? "" : deny("sub update");
    if (op === "delete") return uid && before.owner === uid ? "" : deny();
  }
  if (p[0] === "boards" && p.length === 2) {
    if (op === "get") return "";
    if (op === "create") { const c = get("classes/" + p[1]); return uid && after.owner === uid && c && c.owner === uid ? "" : deny("board create"); }
    if (op === "update") return uid && before.owner === uid && after.owner === uid ? "" : deny();
    if (op === "delete") return uid && before.owner === uid ? "" : deny();
    return deny();
  }
  return "no rule for " + path;
}
