/**
 * One fresh Room per chat. The lobby run is a template (instruction, tools, pins).
 * User/assistant/tool turns are not copied.
 */
import type { Harness } from "../harness.ts";
import type { Tool } from "../tools.ts";
import { Room } from "./room.ts";

const CAP = 64;
const ID_OK = /^[a-zA-Z0-9_-]{1,80}$/;

export const SESSION_COOKIE = "wa_session";

export class Sessions {
  private readonly rooms = new Map<string, Room>();
  private readonly order: string[] = [];
  last: Room | undefined;
  private seq = 0;

  constructor(
    private readonly harness: Harness,
    readonly lobby: Room,
  ) {}

  /** Reuse id if this chat already exists; otherwise start a new context. */
  open(id?: string | null): { id: string; room: Room } {
    const sid = sanitize(id) || this.nextId();
    let room = this.rooms.get(sid);
    if (!room) {
      room = cloneRoom(this.harness, this.lobby);
      this.rooms.set(sid, room);
      this.order.push(sid);
      this.evict();
    }
    this.last = room;
    return { id: sid, room };
  }

  get(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  private nextId(): string {
    return "c" + ++this.seq;
  }

  private evict(): void {
    while (this.rooms.size > CAP) {
      const old = this.order.shift();
      if (old) this.rooms.delete(old);
    }
  }
}

export function cloneRoom(harness: Harness, src: Room): Room {
  const ctx = src.run.getContext();
  const instruction = ctx.find((m) => m.role === "system")?.content;
  const pins = ctx.filter((m) => m.role === "pin");
  const tools: Tool[] = src.run.tools.slice();
  const run = harness.create({
    model: src.run.getModelBinding() ?? undefined,
    instruction,
    tools,
  });
  for (const pin of pins) run.inject({ vars: pin.content });
  return new Room(harness, { run });
}

export function sanitize(id?: string | null): string | undefined {
  if (!id) return undefined;
  const s = id.trim();
  return ID_OK.test(s) ? s : undefined;
}

/** Body, then query, then X-Session-Id / Mcp-Session-Id, then wa_session cookie. */
export function readSessionId(req: Request, bodySession?: string | null): string | undefined {
  const fromBody = sanitize(bodySession);
  if (fromBody) return fromBody;
  try {
    const fromQuery = sanitize(new URL(req.url).searchParams.get("session"));
    if (fromQuery) return fromQuery;
  } catch {
    /* ignore */
  }
  const fromHeader = sanitize(req.headers.get("x-session-id") || req.headers.get("mcp-session-id"));
  if (fromHeader) return fromHeader;
  return sanitize(cookieValue(req, SESSION_COOKIE));
}

export function sessionCookie(id: string): string {
  return `${SESSION_COOKIE}=${id}; Path=/; SameSite=Lax`;
}

function cookieValue(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}
