#!/usr/bin/env python3
import json
import os
import sqlite3
from contextlib import closing
from datetime import date, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

PORT = int(os.environ.get("FAVORITES_PORT", "9136"))
DB_PATH = os.environ.get("FAVORITES_DB_PATH", "/home/lampac/data/favorites.db")


def utc_now():
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def ensure_dir(path):
    folder = os.path.dirname(path)
    if folder and not os.path.exists(folder):
        os.makedirs(folder, exist_ok=True)


def db():
    ensure_dir(DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    with closing(db()) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_key TEXT NOT NULL,
                tmdb_id INTEGER NOT NULL,
                media_type TEXT NOT NULL,
                source TEXT,
                title TEXT,
                original_title TEXT,
                poster TEXT,
                backdrop TEXT,
                year TEXT,
                added_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                tracking_enabled INTEGER NOT NULL DEFAULT 0,
                UNIQUE(user_key, tmdb_id, media_type)
            );

            CREATE TABLE IF NOT EXISTS favorite_series_state (
                favorite_id INTEGER PRIMARY KEY,
                aired_episodes INTEGER,
                next_air_date TEXT,
                next_episode_season INTEGER,
                next_episode_number INTEGER,
                next_season_number INTEGER,
                last_episode_season INTEGER,
                last_episode_number INTEGER,
                series_status TEXT,
                state_kind TEXT,
                state_main TEXT,
                state_sub TEXT,
                state_title TEXT,
                last_sync_at TEXT,
                last_notified_stage TEXT,
                last_notified_target TEXT,
                FOREIGN KEY(favorite_id) REFERENCES favorites(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_favorites_user_updated
                ON favorites(user_key, updated_at DESC);

            CREATE INDEX IF NOT EXISTS idx_favorites_user_type
                ON favorites(user_key, media_type);
            """
        )
        conn.commit()


def row_to_dict(row):
    if row is None:
        return None
    return {key: row[key] for key in row.keys()}


def favorite_payload(row, state_row=None):
    item = row_to_dict(row)
    if not item:
        return None
    item["tracking_enabled"] = bool(item.get("tracking_enabled"))
    item["series_state"] = row_to_dict(state_row) if state_row else None
    return item


def build_target(state):
    if not state:
        return None
    air_date = (state.get("next_air_date") or "").strip()
    season = state.get("next_episode_season")
    episode = state.get("next_episode_number")
    if not air_date or not season or not episode:
        return None
    return f"{air_date}:S{season}E{episode}"


def is_trackable_state(state):
    if not state:
        return False
    return (state.get("state_kind") or "").strip().lower() in ("next", "season")


def get_favorite(conn, user_key, tmdb_id, media_type):
    return conn.execute(
        "SELECT * FROM favorites WHERE user_key = ? AND tmdb_id = ? AND media_type = ?",
        (user_key, tmdb_id, media_type),
    ).fetchone()


def get_state(conn, favorite_id):
    return conn.execute(
        "SELECT * FROM favorite_series_state WHERE favorite_id = ?",
        (favorite_id,),
    ).fetchone()


def upsert_favorite(conn, user_key, item):
    now = utc_now()
    tmdb_id = int(item.get("tmdb_id"))
    media_type = (item.get("media_type") or "").strip().lower()
    current = get_favorite(conn, user_key, tmdb_id, media_type)
    requested_tracking = item.get("tracking_enabled")
    if requested_tracking is None:
        tracking_enabled = int(current["tracking_enabled"]) if current else 0
    else:
        tracking_enabled = int(bool(requested_tracking))
    conn.execute(
        """
        INSERT INTO favorites (
            user_key, tmdb_id, media_type, source, title, original_title,
            poster, backdrop, year, added_at, updated_at, tracking_enabled
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_key, tmdb_id, media_type) DO UPDATE SET
            source = excluded.source,
            title = excluded.title,
            original_title = excluded.original_title,
            poster = excluded.poster,
            backdrop = excluded.backdrop,
            year = excluded.year,
            updated_at = excluded.updated_at,
            tracking_enabled = excluded.tracking_enabled
        """,
        (
            user_key,
            tmdb_id,
            media_type,
            item.get("source") or "tmdb",
            item.get("title") or "",
            item.get("original_title") or "",
            item.get("poster") or "",
            item.get("backdrop") or "",
            item.get("year") or "",
            now,
            now,
            tracking_enabled,
        ),
    )
    conn.commit()
    return get_favorite(conn, user_key, tmdb_id, media_type)


def set_tracking(conn, user_key, tmdb_id, media_type, enabled, item=None, state=None):
    favorite = get_favorite(conn, user_key, tmdb_id, media_type)

    if enabled and not favorite:
        if not item:
            raise ValueError("item is required to enable tracking")
        item = dict(item)
        item["tracking_enabled"] = True
        favorite = upsert_favorite(conn, user_key, item)
    elif not favorite:
        return None

    if not enabled:
        conn.execute(
            "DELETE FROM favorites WHERE id = ?",
            (favorite["id"],),
        )
        conn.commit()
        return None

    conn.execute(
        "UPDATE favorites SET tracking_enabled = ?, updated_at = ? WHERE id = ?",
        (1 if enabled else 0, utc_now(), favorite["id"]),
    )

    if state and favorite["media_type"] == "tv":
        save_state(conn, favorite["id"], state)
    else:
        conn.commit()

    favorite = get_favorite(conn, user_key, tmdb_id, media_type)
    return favorite_payload(favorite, get_state(conn, favorite["id"]))


def save_state(conn, favorite_id, state):
    previous = get_state(conn, favorite_id)
    target = build_target(state)
    last_notified_stage = previous["last_notified_stage"] if previous else None
    last_notified_target = previous["last_notified_target"] if previous else None
    if target != last_notified_target:
        last_notified_stage = None
        last_notified_target = None
    conn.execute(
        """
        INSERT INTO favorite_series_state (
            favorite_id, aired_episodes, next_air_date, next_episode_season,
            next_episode_number, next_season_number, last_episode_season,
            last_episode_number, series_status, state_kind, state_main, state_sub,
            state_title, last_sync_at, last_notified_stage, last_notified_target
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(favorite_id) DO UPDATE SET
            aired_episodes = excluded.aired_episodes,
            next_air_date = excluded.next_air_date,
            next_episode_season = excluded.next_episode_season,
            next_episode_number = excluded.next_episode_number,
            next_season_number = excluded.next_season_number,
            last_episode_season = excluded.last_episode_season,
            last_episode_number = excluded.last_episode_number,
            series_status = excluded.series_status,
            state_kind = excluded.state_kind,
            state_main = excluded.state_main,
            state_sub = excluded.state_sub,
            state_title = excluded.state_title,
            last_sync_at = excluded.last_sync_at,
            last_notified_stage = excluded.last_notified_stage,
            last_notified_target = excluded.last_notified_target
        """,
        (
            favorite_id,
            state.get("aired_episodes"),
            state.get("next_air_date"),
            state.get("next_episode_season"),
            state.get("next_episode_number"),
            state.get("next_season_number"),
            state.get("last_episode_season"),
            state.get("last_episode_number"),
            state.get("series_status"),
            state.get("state_kind"),
            state.get("state_main"),
            state.get("state_sub"),
            state.get("state_title"),
            utc_now(),
            last_notified_stage,
            last_notified_target or target,
        ),
    )
    conn.commit()


def require_user_key(value):
    value = (value or "").strip()
    if not value:
        raise ValueError("user_key is required")
    return value


class ApiHandler(BaseHTTPRequestHandler):
    server_version = "FavoritesSync/1.0"

    def _send(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def _ok(self, payload):
        self._send(200, payload)

    def _error(self, status, message):
        self._send(status, {"ok": False, "error": message})

    def _json_body(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length > 0 else b"{}"
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))

    def do_OPTIONS(self):
        self._send(200, {"ok": True})

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        try:
            if path == "/health":
                return self._ok({"ok": True, "service": "favorites_sync"})

            if path == "/api/favorites/list":
                user_key = require_user_key(query.get("user_key", [""])[0])
                with closing(db()) as conn:
                    rows = conn.execute(
                        """
                        SELECT f.*, s.aired_episodes, s.next_air_date, s.next_episode_season,
                               s.next_episode_number, s.next_season_number, s.last_episode_season,
                               s.last_episode_number, s.series_status, s.state_kind, s.state_main,
                               s.state_sub, s.state_title, s.last_sync_at, s.last_notified_stage,
                               s.last_notified_target
                        FROM favorites f
                        LEFT JOIN favorite_series_state s ON s.favorite_id = f.id
                        WHERE f.user_key = ?
                        ORDER BY f.updated_at DESC, f.id DESC
                        """,
                        (user_key,),
                    ).fetchall()
                    items = []
                    for row in rows:
                        favorite = {k: row[k] for k in row.keys() if k in (
                            "id", "user_key", "tmdb_id", "media_type", "source", "title",
                            "original_title", "poster", "backdrop", "year", "added_at",
                            "updated_at", "tracking_enabled"
                        )}
                        favorite["tracking_enabled"] = bool(favorite["tracking_enabled"])
                        if row["state_kind"] is not None or row["aired_episodes"] is not None:
                            favorite["series_state"] = {
                                "aired_episodes": row["aired_episodes"],
                                "next_air_date": row["next_air_date"],
                                "next_episode_season": row["next_episode_season"],
                                "next_episode_number": row["next_episode_number"],
                                "next_season_number": row["next_season_number"],
                                "last_episode_season": row["last_episode_season"],
                                "last_episode_number": row["last_episode_number"],
                                "series_status": row["series_status"],
                                "state_kind": row["state_kind"],
                                "state_main": row["state_main"],
                                "state_sub": row["state_sub"],
                                "state_title": row["state_title"],
                                "last_sync_at": row["last_sync_at"],
                                "last_notified_stage": row["last_notified_stage"],
                                "last_notified_target": row["last_notified_target"],
                            }
                        else:
                            favorite["series_state"] = None
                        items.append(favorite)
                    return self._ok({"ok": True, "items": items})

            if path == "/api/favorites/tracked":
                user_key = require_user_key(query.get("user_key", [""])[0])
                with closing(db()) as conn:
                    rows = conn.execute(
                        "SELECT * FROM favorites WHERE user_key = ? AND media_type = 'tv' AND tracking_enabled = 1 ORDER BY updated_at DESC, id DESC",
                        (user_key,),
                    ).fetchall()
                    items = [favorite_payload(row) for row in rows]
                    return self._ok({"ok": True, "items": items})

            if path == "/api/favorites/upcoming":
                user_key = require_user_key(query.get("user_key", [""])[0])
                with closing(db()) as conn:
                    rows = conn.execute(
                        """
                        SELECT f.*, s.aired_episodes, s.next_air_date, s.next_episode_season,
                               s.next_episode_number, s.next_season_number, s.last_episode_season,
                               s.last_episode_number, s.series_status, s.state_kind, s.state_main,
                               s.state_sub, s.state_title, s.last_sync_at, s.last_notified_stage,
                               s.last_notified_target
                        FROM favorites f
                        JOIN favorite_series_state s ON s.favorite_id = f.id
                        WHERE f.user_key = ? AND f.media_type = 'tv' AND f.tracking_enabled = 1
                              AND s.state_kind IN ('next', 'season')
                        ORDER BY
                            CASE WHEN s.next_air_date IS NULL OR s.next_air_date = '' THEN 1 ELSE 0 END,
                            s.next_air_date ASC,
                            f.updated_at DESC
                        """,
                        (user_key,),
                    ).fetchall()
                    items = []
                    for row in rows:
                        favorite = {k: row[k] for k in row.keys() if k in (
                            "id", "user_key", "tmdb_id", "media_type", "source", "title",
                            "original_title", "poster", "backdrop", "year", "added_at",
                            "updated_at", "tracking_enabled"
                        )}
                        favorite["tracking_enabled"] = bool(favorite["tracking_enabled"])
                        favorite["series_state"] = {
                            "aired_episodes": row["aired_episodes"],
                            "next_air_date": row["next_air_date"],
                            "next_episode_season": row["next_episode_season"],
                            "next_episode_number": row["next_episode_number"],
                            "next_season_number": row["next_season_number"],
                            "last_episode_season": row["last_episode_season"],
                            "last_episode_number": row["last_episode_number"],
                            "series_status": row["series_status"],
                            "state_kind": row["state_kind"],
                            "state_main": row["state_main"],
                            "state_sub": row["state_sub"],
                            "state_title": row["state_title"],
                            "last_sync_at": row["last_sync_at"],
                            "last_notified_stage": row["last_notified_stage"],
                            "last_notified_target": row["last_notified_target"],
                        }
                        items.append(favorite)
                    return self._ok({"ok": True, "items": items})

            if path == "/api/favorites/check":
                user_key = require_user_key(query.get("user_key", [""])[0])
                tmdb_id = int(query.get("tmdb_id", ["0"])[0])
                media_type = (query.get("media_type", [""])[0] or "").strip().lower()
                with closing(db()) as conn:
                    favorite = get_favorite(conn, user_key, tmdb_id, media_type)
                    if not favorite:
                        return self._ok({"ok": True, "exists": False})
                    state = get_state(conn, favorite["id"])
                    return self._ok({"ok": True, "exists": True, "item": favorite_payload(favorite, state)})

            if path == "/api/favorites/reminders":
                user_key = require_user_key(query.get("user_key", [""])[0])
                today_str = (query.get("today", [""])[0] or "").strip() or date.today().isoformat()
                today_obj = datetime.strptime(today_str, "%Y-%m-%d").date()
                with closing(db()) as conn:
                    rows = conn.execute(
                        """
                        SELECT f.title, f.tmdb_id, s.next_air_date, s.next_episode_season,
                               s.next_episode_number, s.last_notified_stage, s.last_notified_target
                        FROM favorites f
                        JOIN favorite_series_state s ON s.favorite_id = f.id
                        WHERE f.user_key = ? AND f.media_type = 'tv' AND f.tracking_enabled = 1
                              AND s.state_kind = 'next' AND s.next_air_date IS NOT NULL AND s.next_air_date != ''
                        """,
                        (user_key,),
                    ).fetchall()
                    items = []
                    for row in rows:
                        air_date = datetime.strptime(row["next_air_date"], "%Y-%m-%d").date()
                        days_left = (air_date - today_obj).days
                        stage = None
                        if days_left == 2:
                            stage = "d2"
                            message = f"Через 2 дня выйдет новая серия: \"{row['title']}\" (S{row['next_episode_season']}E{row['next_episode_number']})"
                        elif days_left == 1:
                            stage = "d1"
                            message = f"Завтра новая серия: \"{row['title']}\" (S{row['next_episode_season']}E{row['next_episode_number']})"
                        elif days_left == 0:
                            stage = "d0"
                            message = f"Сегодня выходит новая серия: \"{row['title']}\" (S{row['next_episode_season']}E{row['next_episode_number']})"
                        else:
                            continue
                        target = f"{row['next_air_date']}:S{row['next_episode_season']}E{row['next_episode_number']}"
                        if row["last_notified_target"] == target and row["last_notified_stage"] == stage:
                            continue
                        items.append({
                            "tmdb_id": row["tmdb_id"],
                            "title": row["title"],
                            "air_date": row["next_air_date"],
                            "season": row["next_episode_season"],
                            "episode": row["next_episode_number"],
                            "days_left": days_left,
                            "stage": stage,
                            "target": target,
                            "message": message,
                        })
                    items.sort(key=lambda item: (item["days_left"], item["title"].lower()))
                    return self._ok({"ok": True, "items": items})

            return self._error(404, "not found")
        except ValueError as ex:
            return self._error(400, str(ex))
        except Exception as ex:
            return self._error(500, str(ex))

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            payload = self._json_body()

            if path == "/api/favorites/add":
                user_key = require_user_key(payload.get("user_key"))
                item = payload.get("item") or {}
                if not item.get("tmdb_id") or not item.get("media_type"):
                    raise ValueError("item.tmdb_id and item.media_type are required")
                with closing(db()) as conn:
                    favorite = upsert_favorite(conn, user_key, item)
                    state = payload.get("state")
                    if state and favorite["media_type"] == "tv":
                        save_state(conn, favorite["id"], state)
                    state_row = get_state(conn, favorite["id"])
                    return self._ok({"ok": True, "item": favorite_payload(favorite, state_row)})

            if path == "/api/favorites/remove":
                user_key = require_user_key(payload.get("user_key"))
                tmdb_id = int(payload.get("tmdb_id") or 0)
                media_type = (payload.get("media_type") or "").strip().lower()
                with closing(db()) as conn:
                    conn.execute(
                        "DELETE FROM favorites WHERE user_key = ? AND tmdb_id = ? AND media_type = ?",
                        (user_key, tmdb_id, media_type),
                    )
                    conn.commit()
                    return self._ok({"ok": True})

            if path == "/api/favorites/sync_series_state":
                user_key = require_user_key(payload.get("user_key"))
                items = payload.get("items")
                if items is None:
                    items = [payload]
                updated = 0
                with closing(db()) as conn:
                    for entry in items:
                        tmdb_id = int(entry.get("tmdb_id") or 0)
                        media_type = (entry.get("media_type") or "tv").strip().lower()
                        state = entry.get("state") or {}
                        favorite = get_favorite(conn, user_key, tmdb_id, media_type)
                        if not favorite:
                            continue
                        save_state(conn, favorite["id"], state)
                        updated += 1
                    return self._ok({"ok": True, "updated": updated})

            if path == "/api/favorites/set_tracking":
                user_key = require_user_key(payload.get("user_key"))
                tmdb_id = int(payload.get("tmdb_id") or 0)
                media_type = (payload.get("media_type") or "tv").strip().lower()
                enabled = bool(payload.get("enabled"))
                item = payload.get("item") or {}
                state = payload.get("state") or {}

                if media_type != "tv":
                    raise ValueError("tracking is available only for tv")
                if enabled and not is_trackable_state(state):
                    raise ValueError("tracking is available only for series with upcoming episodes or seasons")

                with closing(db()) as conn:
                    favorite = set_tracking(conn, user_key, tmdb_id, media_type, enabled, item=item, state=state)
                    return self._ok({"ok": True, "item": favorite})

            if path == "/api/favorites/mark_notified":
                user_key = require_user_key(payload.get("user_key"))
                tmdb_id = int(payload.get("tmdb_id") or 0)
                media_type = (payload.get("media_type") or "tv").strip().lower()
                target = (payload.get("target") or "").strip()
                stage = (payload.get("stage") or "").strip()
                with closing(db()) as conn:
                    favorite = get_favorite(conn, user_key, tmdb_id, media_type)
                    if not favorite:
                        raise ValueError("favorite not found")
                    conn.execute(
                        "UPDATE favorite_series_state SET last_notified_stage = ?, last_notified_target = ? WHERE favorite_id = ?",
                        (stage or None, target or None, favorite["id"]),
                    )
                    conn.commit()
                    return self._ok({"ok": True})

            return self._error(404, "not found")
        except ValueError as ex:
            return self._error(400, str(ex))
        except Exception as ex:
            return self._error(500, str(ex))

    def log_message(self, format, *args):
        return


def main():
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ApiHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
