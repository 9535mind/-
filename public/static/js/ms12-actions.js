/* auto-generated: scripts/build-ms12-actions.mjs — do not edit by hand */
"use strict";
(() => {
  // src/actions/meeting.actions.ts
  async function safeJson(r) {
    try {
      return await r.json();
    } catch {
      return null;
    }
  }
  async function createMeeting(input = {}) {
    console.log("[MS12 ACTION] createMeeting called", input);
    const title = input.title != null ? String(input.title).trim() : "";
    if (!title) {
      if (typeof location !== "undefined") {
        location.assign("/app/meeting/new");
      }
      return { kind: "navigate", path: "/app/meeting/new" };
    }
    const body = { title };
    const dn = input.displayName != null ? String(input.displayName).trim() : "";
    if (dn) body.displayName = dn;
    const t0 = input.type != null ? String(input.type).trim() : "";
    if (t0) body.type = t0;
    const r = await fetch("/api/ms12/meetings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (r.status === 401 || r.status === 403) {
      return {
        kind: "error",
        error: "\uD68C\uC758\uB97C \uB9CC\uB4E4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
      };
    }
    const j = await safeJson(r);
    if (j?.success && j?.data?.id) {
      const w = typeof window !== "undefined" ? window : null;
      if (w?.__ms12RecordMeetingLocal) {
        try {
          w.__ms12RecordMeetingLocal(j.data);
        } catch {
        }
      }
      if (typeof location !== "undefined") {
        location.assign("/app/room/" + encodeURIComponent(String(j.data.id)));
      }
      return { kind: "created", j };
    }
    return { kind: "error", j: j ?? void 0, error: j?.error };
  }
  async function joinMeeting(code, displayName) {
    console.log(
      "[MS12 ACTION] joinMeeting called",
      code && String(code).trim() || "(no code)"
    );
    const c0 = code && String(code).trim() || "";
    if (!c0) {
      if (typeof location !== "undefined") {
        location.assign("/app/join");
      }
      return { kind: "navigate", path: "/app/join" };
    }
    const joinBody = { meetingCode: c0 };
    const dn2 = displayName != null ? String(displayName).trim() : "";
    if (dn2) joinBody.displayName = dn2;
    const r = await fetch("/api/ms12/meetings/join", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(joinBody)
    });
    const j = await safeJson(r);
    if (j?.success && j?.data?.id) {
      const w = typeof window !== "undefined" ? window : null;
      if (w?.__ms12RecordMeetingLocal) {
        try {
          w.__ms12RecordMeetingLocal(j.data);
        } catch {
        }
      }
      if (typeof location !== "undefined") {
        location.assign("/app/room/" + encodeURIComponent(String(j.data.id)));
      }
      return { kind: "joined", j };
    }
    const msg = j && (j.error || j.message) || "\uC785\uC7A5\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
    return { kind: "error", j: j ?? void 0, error: j?.error, message: String(msg) };
  }
  function openMeeting(id) {
    const sid = String(id || "").trim();
    if (!sid || typeof location === "undefined") return;
    location.assign("/app/room/" + encodeURIComponent(sid));
  }
  function openAppPath(path) {
    if (typeof location === "undefined") return;
    const p = String(path || "").trim();
    if (p.startsWith("/app/")) {
      location.assign(p);
    }
  }

  // src/actions/record.actions.ts
  async function saveRecord(meetingId, content, extra) {
    const roomId = extra?.roomId != null && String(extra.roomId).trim() || String(meetingId || "").trim();
    const raw = String(content ?? "");
    const title = extra?.title != null && String(extra.title).trim() || (roomId ? `\uD68C\uC758 \uAE30\uB85D (${roomId.slice(0, 8)})` : "\uD68C\uC758 \uAE30\uB85D");
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const meetingDate = extra?.meetingDate != null && String(extra.meetingDate).trim() || today;
    const r = await fetch("/api/ms12/meeting-records", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: roomId || null,
        title,
        meetingDate: meetingDate.slice(0, 10),
        rawNotes: raw
      })
    });
    return safeJson2(r);
  }
  async function safeJson2(r) {
    try {
      return await r.json();
    } catch {
      return null;
    }
  }
  async function getRecentRecords(options) {
    console.log("[MS12 ACTION] getRecentRecords called");
    const limit = options?.limit != null ? Math.min(100, Math.max(1, options.limit)) : 20;
    const offset = options?.offset != null ? Math.max(0, options.offset) : 0;
    const q = new URLSearchParams();
    q.set("limit", String(limit));
    q.set("offset", String(offset));
    q.set("sort", "updated_desc");
    const r = await fetch("/api/ms12/meeting-records?" + q.toString(), { credentials: "include" });
    return safeJson2(r);
  }
  async function openRecordsList() {
    const j = await getRecentRecords({ limit: 20 });
    if (typeof location !== "undefined") {
      location.assign("/app/records");
    }
    return j;
  }

  // src/actions/user.actions.ts
  async function getCurrentUser() {
    return fetch("/api/auth/me", { credentials: "include" });
  }
  function isLoggedInMePayload(j) {
    if (j == null || typeof j !== "object") return false;
    const o = j;
    if (o.success !== true) return false;
    const d = o.data;
    if (d == null || typeof d !== "object" || Array.isArray(d)) return false;
    const rec = d;
    if (rec.type === "guest") return false;
    const id = rec.id;
    if (id == null || id === "") return false;
    if (typeof id === "number" && Number.isFinite(id) && id >= 1) return true;
    const s = String(id).trim();
    if (!/^\d+$/.test(s)) return false;
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 1;
  }
  function getDisplayName(user) {
    if (!user || typeof user !== "object") return "\uC774\uC6A9\uC790";
    const n = user.name != null ? String(user.name).trim() : "";
    const c = user.company_name != null ? String(user.company_name).trim() : "";
    if (n && c) {
      return `${n} \xB7 ${c}`;
    }
    const em = user.email != null ? String(user.email).trim() : "";
    return n || c || em || "\uC774\uC6A9\uC790";
  }

  // src/jarvis/jarvis-router.ts
  function extractCode(text) {
    const t = (text || "").trim();
    const m = t.match(/([A-Za-z0-9][A-Za-z0-9-]{3,})/);
    return m ? m[1] : "";
  }
  async function handleCommand(text) {
    const t = (text || "").trim();
    if (t.includes("\uD68C\uC758 \uC2DC\uC791")) {
      return createMeeting({});
    }
    if (t.includes("\uD68C\uC758 \uCC38\uC5EC")) {
      return joinMeeting(extractCode(t) || void 0);
    }
    if (t.includes("\uAE30\uB85D \uBCF4\uC5EC\uC918") || t.includes("\uAE30\uB85D \uBCF4\uAE30")) {
      return getRecentRecords();
    }
    return { kind: "unhandled", text: t };
  }

  // src/lib/ms12-plan.ts
  function getMs12Capabilities(plan) {
    if (plan === "pro") {
      return {
        meetingDurationSec: null,
        // unlimited
        maxRecords: Infinity,
        canDownload: true,
        canUseAI: true
      };
    }
    return {
      meetingDurationSec: 30 * 60,
      maxRecords: 3,
      canDownload: false,
      canUseAI: false
    };
  }

  // src/browser/ms12-actions.entry.ts
  var Ms12Actions = {
    createMeeting,
    joinMeeting,
    openMeeting,
    openAppPath,
    getRecentRecords,
    openRecordsList,
    saveRecord,
    getCurrentUser,
    getDisplayName,
    isLoggedInMePayload,
    jarvisExtractCode: extractCode,
    handleCommand,
    getMs12Capabilities
  };
  if (typeof globalThis !== "undefined") {
    ;
    globalThis.Ms12Actions = Ms12Actions;
  }
})();
