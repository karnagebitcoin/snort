import sqlite3InitModule, { Database, Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import { EventEmitter } from "eventemitter3";
import { NostrEvent, RelayHandler, RelayHandlerEvents, ReqFilter, unixNowMs } from "./types";

export class SqliteRelay extends EventEmitter<RelayHandlerEvents> implements RelayHandler {
  #sqlite?: Sqlite3Static;
  #log = (...args: any[]) => console.debug(...args);
  #db?: Database;
  #seenInserts = new Set<string>();

  /**
   * Initialize the SQLite driver
   */
  async init(path: string) {
    if (this.#sqlite) return;
    this.#sqlite = await sqlite3InitModule();
    this.#log(`Got SQLite version: ${this.#sqlite.version.libVersion}`);
    await this.#open(path);
    this.#migrate();
  }

  /**
   * Open the database from its path
   */
  async #open(path: string) {
    if (!this.#sqlite) throw new Error("Must call init first");
    if (this.#db) return;

    if ("opfs" in this.#sqlite) {
      try {
        this.#db = new this.#sqlite.oo1.OpfsDb(path, "cw");
        this.#log(`Opened ${this.#db.filename}`);
        this.#db.exec(
          `PRAGMA cache_size=${
            32 * 1024
          }; PRAGMA page_size=8192; PRAGMA journal_mode=MEMORY; PRAGMA temp_store=MEMORY;`,
        );
      } catch (e) {
        // wipe db
        console.error(e);
      }
    } else {
      throw new Error("OPFS not supported!");
    }
  }

  close() {
    this.#db?.close();
    this.#db = undefined;
  }

  /**
   * Do database migration
   */
  #migrate() {
    if (!this.#db) throw new Error("DB must be open");

    this.#db.exec(
      'CREATE TABLE IF NOT EXISTS "__migration" (version INTEGER,migrated NUMERIC, CONSTRAINT "__migration_PK" PRIMARY KEY (version))',
    );
    const res = this.#db.exec("select max(version) from __migration", {
      returnValue: "resultRows",
    });

    const version = (res[0][0] as number | undefined) ?? 0;
    this.#log(`Starting migration from: v${version}`);
    if (version < 1) {
      this.#migrate_v1();
      this.#log("Migrated to v1");
    }
    if (version < 2) {
      this.#migrate_v2();
      this.#log("Migrated to v2");
    }
    if (version < 3) {
      this.#migrate_v3();
      this.#log("Migrated to v3");
    }
  }

  /**
   * Insert an event to the database
   */
  event(ev: NostrEvent) {
    if (this.#insertEvent(this.#db!, ev)) {
      this.#log(`Inserted: kind=${ev.kind},authors=${ev.pubkey},id=${ev.id}`);
      this.emit("event", [ev]);
      return true;
    }
    return false;
  }

  sql(sql: string, params: Array<any>) {
    return this.#db?.selectArrays(sql, params) as Array<Array<string | number>>;
  }

  /**
   * Write multiple events
   */
  eventBatch(evs: Array<NostrEvent>) {
    const start = unixNowMs();
    let eventsInserted: Array<NostrEvent> = [];
    this.#db?.transaction(db => {
      for (const ev of evs) {
        if (this.#insertEvent(db, ev)) {
          eventsInserted.push(ev);
        }
      }
    });
    if (eventsInserted.length > 0) {
      this.#log(`Inserted Batch: ${eventsInserted.length}/${evs.length}, ${(unixNowMs() - start).toLocaleString()}ms`);
      this.emit("event", eventsInserted);
    }
    return eventsInserted.length > 0;
  }

  #deleteById(db: Database, ids: Array<string>) {
    db.exec(`delete from events where id in (${this.#repeatParams(ids.length)})`, {
      bind: ids,
    });
    db.exec(`delete from search_content where id in (${this.#repeatParams(ids.length)})`, {
      bind: ids,
    });
    this.#log("Deleted", ids, db.changes());
  }

  #insertEvent(db: Database, ev: NostrEvent) {
    if (this.#seenInserts.has(ev.id)) return false;

    const legacyReplacable = [0, 3, 41];
    if (legacyReplacable.includes(ev.kind) || (ev.kind >= 10_000 && ev.kind < 20_000)) {
      const oldEvents = db.selectValues("select id from events where kind = ? and pubkey = ? and created <= ?", [
        ev.kind,
        ev.pubkey,
        ev.created_at,
      ]) as Array<string>;
      if (oldEvents.includes(ev.id)) {
        // we already have this event, return
        this.#seenInserts.add(ev.id);
        if (oldEvents.length > 1) {
          const toDelete = oldEvents.filter(a => a !== ev.id);
          this.#deleteById(db, toDelete);
        }
        return false;
      }
    }
    if (ev.kind >= 30_000 && ev.kind < 40_000) {
      const dTag = ev.tags.find(a => a[0] === "d")![1];
      const oldEvents = db.selectValues(
        "select id from events where id in (select id from events, tags where events.id = tags.event_id and tags.key = ? and tags.value = ?)",
        ["d", dTag],
      ) as Array<string>;
      if (oldEvents.includes(ev.id)) {
        // we have this version
        this.#seenInserts.add(ev.id);
        if (oldEvents.length > 1) {
          const toDelete = oldEvents.filter(a => a !== ev.id);
          this.#deleteById(db, toDelete);
        }
        return false;
      }
    }
    db.exec("insert or ignore into events(id, pubkey, created, kind, json) values(?,?,?,?,?)", {
      bind: [ev.id, ev.pubkey, ev.created_at, ev.kind, JSON.stringify(ev)],
    });
    let eventInserted = (this.#db?.changes() as number) > 0;
    if (eventInserted) {
      for (const t of ev.tags.filter(a => a[0].length === 1)) {
        db.exec("insert into tags(event_id, key, value) values(?, ?, ?)", {
          bind: [ev.id, t[0], t[1]],
        });
      }
      this.#insertSearchIndex(db, ev);
    }
    this.#seenInserts.add(ev.id);
    return eventInserted;
  }

  /**
   * Query relay by nostr filter
   */
  req(id: string, req: ReqFilter) {
    const start = unixNowMs();

    const [sql, params] = this.#buildQuery(req);
    const res = this.#db?.selectArrays(sql, params);
    const results = res?.map(a => JSON.parse(a[0] as string) as NostrEvent) ?? [];
    const time = unixNowMs() - start;
    this.#log(`Query ${id} results took ${time.toLocaleString()}ms`);
    return results;
  }

  /**
   * Count results by nostr filter
   */
  count(req: ReqFilter) {
    const start = unixNowMs();
    const [sql, params] = this.#buildQuery(req, true);
    const rows = this.#db?.exec(sql, {
      bind: params,
      returnValue: "resultRows",
    });
    const results = (rows?.at(0)?.at(0) as number | undefined) ?? 0;
    const time = unixNowMs() - start;
    this.#log(`Query count results took ${time.toLocaleString()}ms`);
    return results;
  }

  /**
   * Get a summary about events table
   */
  summary() {
    const res = this.#db?.exec("select kind, count(*) from events group by kind", {
      returnValue: "resultRows",
    });
    return Object.fromEntries(res?.map(a => [String(a[0]), a[1] as number]) ?? []);
  }

  /**
   * Dump the database file
   */
  async dump() {
    const filePath = String(this.#db?.filename ?? "");
    try {
      this.#db?.close();
      this.#db = undefined;
      const dir = await navigator.storage.getDirectory();
      // @ts-expect-error
      for await (const [name, file] of dir) {
        if (`/${name}` === filePath) {
          const fh = await (file as FileSystemFileHandle).getFile();
          const ret = new Uint8Array(await fh.arrayBuffer());
          return ret;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      await this.#open(filePath);
    }
    return new Uint8Array();
  }

  #buildQuery(req: ReqFilter, count = false): [string, Array<any>] {
    const conditions: Array<string> = [];
    const params: Array<any> = [];

    let sql = `select ${count ? "count(json)" : "json"} from events`;
    const tags = Object.entries(req).filter(([k]) => k.startsWith("#"));
    for (const [key, values] of tags) {
      const vArray = values as Array<string>;
      sql += ` inner join tags on events.id = tags.event_id and tags.key = ? and tags.value in (${this.#repeatParams(
        vArray.length,
      )})`;
      params.push(key.slice(1));
      params.push(...vArray);
    }
    if (req.search) {
      sql += " inner join search_content on search_content.id = events.id";
      conditions.push("search_content match ?");
      params.push(req.search.replaceAll(".", "+").replaceAll("@", "+"));
    }
    if (req.ids) {
      conditions.push(`id in (${this.#repeatParams(req.ids.length)})`);
      params.push(...req.ids);
    }
    if (req.authors) {
      conditions.push(`pubkey in (${this.#repeatParams(req.authors.length)})`);
      params.push(...req.authors);
    }
    if (req.kinds) {
      conditions.push(`kind in (${this.#repeatParams(req.kinds.length)})`);
      params.push(...req.kinds);
    }
    if (req.since) {
      conditions.push("created >= ?");
      params.push(req.since);
    }
    if (req.until) {
      conditions.push("created < ?");
      params.push(req.until);
    }
    if (conditions.length > 0) {
      sql += ` where ${conditions.join(" and ")}`;
    }
    if (req.limit) {
      sql += ` order by created desc limit ${req.limit}`;
    }
    return [sql, params];
  }

  #repeatParams(n: number) {
    const ret: Array<string> = [];
    for (let x = 0; x < n; x++) {
      ret.push("?");
    }
    return ret.join(", ");
  }

  #replaceParamsDebug(sql: string, params: Array<number | string>) {
    let res = "";
    let cIdx = 0;
    for (const chr of sql) {
      if (chr === "?") {
        const px = params[cIdx++];
        if (typeof px === "number") {
          res += px.toString();
        } else if (typeof px === "string") {
          res += `'${px}'`;
        }
      } else {
        res += chr;
      }
    }
    return res;
  }

  #migrate_v1() {
    this.#db?.transaction(db => {
      db.exec(
        "CREATE TABLE events (\
        id TEXT(64) PRIMARY KEY, \
        pubkey TEXT(64), \
        created INTEGER, \
        kind INTEGER, \
        json TEXT \
      )",
      );
      db.exec(
        "CREATE TABLE tags (\
        event_id TEXT(64), \
        key TEXT, \
        value TEXT, \
        CONSTRAINT tags_FK FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE \
        )",
      );
      db.exec("CREATE INDEX tags_key_IDX ON tags (key,value)");
      db.exec("insert into __migration values(1, ?)", {
        bind: [new Date().getTime() / 1000],
      });
    });
  }

  #migrate_v2() {
    this.#db?.transaction(db => {
      db.exec("CREATE INDEX pubkey_kind_IDX ON events (pubkey,kind)");
      db.exec("CREATE INDEX pubkey_created_IDX ON events (pubkey,created)");
      db.exec("insert into __migration values(2, ?)", {
        bind: [new Date().getTime() / 1000],
      });
    });
  }

  #insertSearchIndex(db: Database, ev: NostrEvent) {
    if (ev.kind === 0) {
      const profile = JSON.parse(ev.content) as {
        name?: string;
        display_name?: string;
        lud16?: string;
        nip05?: string;
        website?: string;
        about?: string;
      };
      if (profile) {
        const indexContent = [
          profile.name,
          profile.display_name,
          profile.about,
          profile.website,
          profile.lud16,
          profile.nip05,
        ].join(" ");
        db.exec("insert into search_content values(?,?)", {
          bind: [ev.id, indexContent],
        });
      }
    } else if (ev.kind === 1) {
      db.exec("insert into search_content values(?,?)", {
        bind: [ev.id, ev.content],
      });
    }
  }

  #migrate_v3() {
    this.#db?.transaction(db => {
      db.exec("CREATE VIRTUAL TABLE search_content using fts5(id UNINDEXED, content)");
      const events = db.selectArrays("select json from events where kind in (?,?)", [0, 1]);
      for (const json of events) {
        const ev = JSON.parse(json[0] as string) as NostrEvent;
        if (ev) {
          this.#insertSearchIndex(db, ev);
        }
      }
      db.exec("insert into __migration values(3, ?)", {
        bind: [new Date().getTime() / 1000],
      });
    });
  }
}
