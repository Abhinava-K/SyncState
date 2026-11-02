import sqlite3
import json
import uuid
import hashlib
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.config import settings

class Database:
    def __init__(self, db_path: str = settings.DATABASE_PATH):
        self.db_path = db_path
        self.init_schema()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _hash_password(self, password: str, salt: Optional[str] = None) -> tuple[str, str]:
        if not salt:
            salt = os.urandom(16).hex()
        hashed = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
        return hashed, salt

    def init_schema(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Users Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                avatar_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 2. Workspaces Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                owner_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users (id)
            )
            """)

            # 3. Workspace Members Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS workspace_members (
                workspace_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                PRIMARY KEY (workspace_id, user_id),
                FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """)

            # 4. Meetings Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                workspace_id TEXT DEFAULT 'ws_default',
                title TEXT NOT NULL,
                date TEXT NOT NULL,
                turns_json TEXT NOT NULL,
                status TEXT DEFAULT 'STAGED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 5. Decisions Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS decisions (
                id TEXT PRIMARY KEY,
                workspace_id TEXT DEFAULT 'ws_default',
                meeting_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                statement TEXT NOT NULL,
                speaker TEXT NOT NULL,
                turn_index INTEGER NOT NULL,
                verbatim_quote TEXT NOT NULL,
                status TEXT DEFAULT 'ACTIVE',
                superseded_by_id TEXT,
                embedding_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id)
            )
            """)

            # 6. Action Items Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS action_items (
                id TEXT PRIMARY KEY,
                workspace_id TEXT DEFAULT 'ws_default',
                meeting_id TEXT NOT NULL,
                task TEXT NOT NULL,
                assignee TEXT NOT NULL,
                deadline TEXT,
                priority TEXT DEFAULT 'medium',
                turn_index INTEGER NOT NULL,
                verbatim_quote TEXT NOT NULL,
                is_approved INTEGER DEFAULT 1,
                status TEXT DEFAULT 'RUNNING',
                parent_action_id TEXT,
                closed_in_meeting_id TEXT,
                external_issue_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id)
            )
            """)

            # 7. Action History Audit Trail (Cross-Meeting Lineage)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS action_history (
                id TEXT PRIMARY KEY,
                action_id TEXT NOT NULL,
                workspace_id TEXT DEFAULT 'ws_default',
                meeting_id TEXT NOT NULL,
                meeting_title TEXT NOT NULL,
                meeting_date TEXT,
                event_type TEXT NOT NULL,
                assignee TEXT NOT NULL,
                previous_assignee TEXT,
                change_summary TEXT NOT NULL,
                verbatim_quote TEXT,
                speaker TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (action_id) REFERENCES action_items (id),
                FOREIGN KEY (meeting_id) REFERENCES meetings (id)
            )
            """)

            # 8. Conflicts Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS conflicts (
                id TEXT PRIMARY KEY,
                workspace_id TEXT DEFAULT 'ws_default',
                meeting_id TEXT NOT NULL,
                candidate_decision_id TEXT NOT NULL,
                historical_decision_id TEXT NOT NULL,
                historical_meeting_title TEXT NOT NULL,
                historical_statement TEXT NOT NULL,
                historical_quote TEXT NOT NULL,
                candidate_quote TEXT NOT NULL,
                conflict_type TEXT NOT NULL,
                reasoning TEXT NOT NULL,
                confidence REAL NOT NULL,
                resolved INTEGER DEFAULT 0,
                resolution_choice TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id)
            )
            """)

            # Column migrations for existing tables if workspace_id column doesn't exist
            tables = ['meetings', 'decisions', 'action_items', 'conflicts', 'action_history']
            for tbl in tables:
                cursor.execute(f"PRAGMA table_info({tbl})")
                cols = [row["name"] for row in cursor.fetchall()]
                if cols and "workspace_id" not in cols:
                    cursor.execute(f"ALTER TABLE {tbl} ADD COLUMN workspace_id TEXT DEFAULT 'ws_default'")

            # Column migrations for action_items status and lineage
            cursor.execute("PRAGMA table_info(action_items)")
            ai_cols = [row["name"] for row in cursor.fetchall()]
            if "status" not in ai_cols:
                cursor.execute("ALTER TABLE action_items ADD COLUMN status TEXT DEFAULT 'RUNNING'")
            if "parent_action_id" not in ai_cols:
                cursor.execute("ALTER TABLE action_items ADD COLUMN parent_action_id TEXT")
            if "closed_in_meeting_id" not in ai_cols:
                cursor.execute("ALTER TABLE action_items ADD COLUMN closed_in_meeting_id TEXT")

            # Seed default demo account & workspace
            cursor.execute("SELECT id FROM users WHERE email = 'demo@syncstate.io'")
            if not cursor.fetchone():
                user_id = "user_demo"
                pwd_hash, salt = self._hash_password("syncstate123")
                cursor.execute("""
                INSERT INTO users (id, email, name, password_hash, salt)
                VALUES (?, ?, ?, ?, ?)
                """, (user_id, "demo@syncstate.io", "Abhinava K (Architect)", pwd_hash, salt))

                cursor.execute("""
                INSERT OR IGNORE INTO workspaces (id, name, slug, owner_id)
                VALUES (?, ?, ?, ?)
                """, ("ws_default", "Core Engineering Team", "core-eng", user_id))

                cursor.execute("""
                INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role)
                VALUES (?, ?, ?)
                """, ("ws_default", user_id, "admin"))

            conn.commit()

    # --- Auth & Workspace Methods ---
    def create_user(self, email: str, name: str, password: str, org_name: str = "Engineering Org") -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE email = ?", (email.lower(),))
            if cursor.fetchone():
                raise ValueError("An account with this email already exists.")

            user_id = f"user_{uuid.uuid4().hex[:8]}"
            pwd_hash, salt = self._hash_password(password)
            cursor.execute("""
            INSERT INTO users (id, email, name, password_hash, salt)
            VALUES (?, ?, ?, ?, ?)
            """, (user_id, email.lower(), name, pwd_hash, salt))

            # Create default workspace for this user
            ws_slug = "".join(c for c in org_name.lower().replace(" ", "-") if c.isalnum() or c == '-') or "team"
            ws_slug = f"{ws_slug}-{uuid.uuid4().hex[:4]}"
            ws_id = f"ws_{uuid.uuid4().hex[:8]}"

            cursor.execute("""
            INSERT INTO workspaces (id, name, slug, owner_id)
            VALUES (?, ?, ?, ?)
            """, (ws_id, org_name, ws_slug, user_id))

            cursor.execute("""
            INSERT INTO workspace_members (workspace_id, user_id, role)
            VALUES (?, ?, ?)
            """, (ws_id, user_id, "admin"))

            conn.commit()
            return {
                "user": {"id": user_id, "email": email.lower(), "name": name},
                "active_workspace": {"id": ws_id, "name": org_name, "slug": ws_slug, "role": "admin"},
                "workspaces": [{"id": ws_id, "name": org_name, "slug": ws_slug, "role": "admin"}]
            }

    def verify_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
            row = cursor.fetchone()
            if not row:
                return None
            user_data = dict(row)
            check_hash, _ = self._hash_password(password, user_data["salt"])
            if check_hash != user_data["password_hash"]:
                return None

            # Get user's workspaces
            workspaces = self.get_user_workspaces(user_data["id"])
            active_ws = workspaces[0] if workspaces else {"id": "ws_default", "name": "Default Workspace", "slug": "default", "role": "admin"}

            return {
                "user": {"id": user_data["id"], "email": user_data["email"], "name": user_data["name"]},
                "active_workspace": active_ws,
                "workspaces": workspaces
            }

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, name, avatar_url FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if not row:
                return None
            user_data = dict(row)
            workspaces = self.get_user_workspaces(user_id)
            active_ws = workspaces[0] if workspaces else {"id": "ws_default", "name": "Default Workspace", "slug": "default", "role": "admin"}
            return {
                "user": user_data,
                "active_workspace": active_ws,
                "workspaces": workspaces
            }

    def get_user_workspaces(self, user_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT w.id, w.name, w.slug, wm.role
            FROM workspaces w
            JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id = ?
            ORDER BY w.created_at ASC
            """, (user_id,))
            return [dict(r) for r in cursor.fetchall()]

    def create_workspace(self, name: str, user_id: str) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            ws_slug = "".join(c for c in name.lower().replace(" ", "-") if c.isalnum() or c == '-') or "workspace"
            ws_slug = f"{ws_slug}-{uuid.uuid4().hex[:4]}"
            ws_id = f"ws_{uuid.uuid4().hex[:8]}"
            cursor.execute("""
            INSERT INTO workspaces (id, name, slug, owner_id)
            VALUES (?, ?, ?, ?)
            """, (ws_id, name, ws_slug, user_id))
            cursor.execute("""
            INSERT INTO workspace_members (workspace_id, user_id, role)
            VALUES (?, ?, ?)
            """, (ws_id, user_id, "admin"))
            conn.commit()
            return {"id": ws_id, "name": name, "slug": ws_slug, "role": "admin"}

    # --- Meetings ---
    def save_meeting(self, meeting_id: str, title: str, date: str, turns: List[Dict[str, Any]], workspace_id: str = "ws_default"):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO meetings (id, workspace_id, title, date, turns_json)
            VALUES (?, ?, ?, ?, ?)
            """, (meeting_id, workspace_id, title, date, json.dumps(turns)))
            conn.commit()

    def get_meeting(self, meeting_id: str, workspace_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if workspace_id:
                cursor.execute("SELECT * FROM meetings WHERE id = ? AND workspace_id = ?", (meeting_id, workspace_id))
            else:
                cursor.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,))
            row = cursor.fetchone()
            if not row:
                return None
            data = dict(row)
            data["turns"] = json.loads(data["turns_json"])
            return data

    def list_meetings(self, workspace_id: str = "ws_default") -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT id, workspace_id, title, date, status, created_at 
            FROM meetings 
            WHERE workspace_id = ? 
            ORDER BY created_at DESC
            """, (workspace_id,))
            return [dict(row) for row in cursor.fetchall()]

    def delete_meeting(self, meeting_id: str, workspace_id: Optional[str] = None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            DELETE FROM conflicts 
            WHERE meeting_id = ? 
               OR candidate_decision_id IN (SELECT id FROM decisions WHERE meeting_id = ?) 
               OR historical_decision_id IN (SELECT id FROM decisions WHERE meeting_id = ?)
            """, (meeting_id, meeting_id, meeting_id))
            cursor.execute("DELETE FROM action_items WHERE meeting_id = ?", (meeting_id,))
            cursor.execute("DELETE FROM decisions WHERE meeting_id = ?", (meeting_id,))
            cursor.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
            conn.commit()

    # --- Decisions ---
    def save_decisions(self, decisions: List[Dict[str, Any]], workspace_id: str = "ws_default"):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            for d in decisions:
                cursor.execute("""
                INSERT OR REPLACE INTO decisions (
                    id, workspace_id, meeting_id, topic, statement, speaker, turn_index, verbatim_quote,
                    status, superseded_by_id, embedding_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    d["id"], workspace_id, d.get("meeting_id"), d["topic"], d["statement"], d["speaker"],
                    d["turn_index"], d["verbatim_quote"], d.get("status", "ACTIVE"),
                    d.get("superseded_by_id"), json.dumps(d.get("embedding", []))
                ))
            conn.commit()

    def get_decisions_by_meeting(self, meeting_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM decisions WHERE meeting_id = ?", (meeting_id,))
            return [dict(row) for row in cursor.fetchall()]

    def get_all_active_decisions(self, exclude_meeting_id: Optional[str] = None, workspace_id: str = "ws_default") -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = """
            SELECT d.*, m.title as meeting_title, m.date as meeting_date 
            FROM decisions d 
            JOIN meetings m ON d.meeting_id = m.id 
            WHERE d.status = 'ACTIVE' AND d.workspace_id = ?
            """
            params = [workspace_id]
            if exclude_meeting_id:
                query += " AND d.meeting_id != ?"
                params.append(exclude_meeting_id)
            cursor.execute(query, params)
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                if item.get("embedding_json"):
                    item["embedding"] = json.loads(item["embedding_json"])
                results.append(item)
            return results

    def update_decision_status(self, decision_id: str, status: str, superseded_by_id: Optional[str] = None, statement: Optional[str] = None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if statement:
                cursor.execute("""
                UPDATE decisions SET status = ?, superseded_by_id = ?, statement = ? WHERE id = ?
                """, (status, superseded_by_id, statement, decision_id))
            else:
                cursor.execute("""
                UPDATE decisions SET status = ?, superseded_by_id = ? WHERE id = ?
                """, (status, superseded_by_id, decision_id))
            conn.commit()

    # --- Action Items & Cross-Meeting Lineage ---
    def save_action_items(self, action_items: List[Dict[str, Any]], workspace_id: str = "ws_default"):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            for a in action_items:
                status = a.get("status", "RUNNING")
                parent_action_id = a.get("parent_action_id")
                closed_in_meeting_id = a.get("closed_in_meeting_id")

                cursor.execute("""
                INSERT OR REPLACE INTO action_items (
                    id, workspace_id, meeting_id, task, assignee, deadline, priority, turn_index,
                    verbatim_quote, is_approved, status, parent_action_id, closed_in_meeting_id, external_issue_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    a["id"], workspace_id, a.get("meeting_id"), a["task"], a["assignee"], a.get("deadline"),
                    a.get("priority", "medium"), a.get("turn_index", 0), a.get("verbatim_quote", ""),
                    1 if a.get("is_approved", True) else 0,
                    status, parent_action_id, closed_in_meeting_id, a.get("external_issue_url")
                ))

                # Automatically record initial CREATED event in action_history if none exists yet
                cursor.execute("SELECT id FROM action_history WHERE action_id = ? AND event_type = 'CREATED'", (a["id"],))
                if not cursor.fetchone() and a.get("meeting_id"):
                    cursor.execute("SELECT title, date FROM meetings WHERE id = ?", (a["meeting_id"],))
                    m_row = cursor.fetchone()
                    m_title = m_row["title"] if m_row else "Meeting"
                    m_date = m_row["date"] if m_row else ""
                    hist_id = f"hist_{uuid.uuid4().hex[:8]}"
                    cursor.execute("""
                    INSERT INTO action_history (
                        id, action_id, workspace_id, meeting_id, meeting_title, meeting_date,
                        event_type, assignee, change_summary, verbatim_quote, speaker
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        hist_id, a["id"], workspace_id, a["meeting_id"], m_title, m_date,
                        "CREATED", a["assignee"], f"Initial action assigned to {a['assignee']}: {a['task']}",
                        a.get("verbatim_quote", ""), a["assignee"]
                    ))

            conn.commit()

    def get_action_items_by_meeting(self, meeting_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM action_items WHERE meeting_id = ?", (meeting_id,))
            rows = cursor.fetchall()
            return [{**dict(r), "is_approved": bool(r["is_approved"])} for r in rows]

    def update_action_item(self, action_id: str, updates: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            fields = []
            params = []
            for k, v in updates.items():
                if k == "is_approved":
                    fields.append(f"{k} = ?")
                    params.append(1 if v else 0)
                else:
                    fields.append(f"{k} = ?")
                    params.append(v)
            params.append(action_id)
            query = f"UPDATE action_items SET {', '.join(fields)} WHERE id = ?"
            cursor.execute(query, params)
            conn.commit()

    def record_action_history_event(
        self,
        action_id: str,
        meeting_id: str,
        event_type: str,
        assignee: str,
        change_summary: str,
        workspace_id: str = "ws_default",
        meeting_title: Optional[str] = None,
        meeting_date: Optional[str] = None,
        previous_assignee: Optional[str] = None,
        verbatim_quote: Optional[str] = None,
        speaker: Optional[str] = None
    ) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if not meeting_title:
                cursor.execute("SELECT title, date FROM meetings WHERE id = ?", (meeting_id,))
                m_row = cursor.fetchone()
                if m_row:
                    meeting_title = m_row["title"]
                    meeting_date = m_row["date"]
                else:
                    meeting_title = "Meeting"

            hist_id = f"hist_{uuid.uuid4().hex[:8]}"
            cursor.execute("""
            INSERT INTO action_history (
                id, action_id, workspace_id, meeting_id, meeting_title, meeting_date,
                event_type, assignee, previous_assignee, change_summary, verbatim_quote, speaker
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                hist_id, action_id, workspace_id, meeting_id, meeting_title, meeting_date,
                event_type, assignee, previous_assignee, change_summary, verbatim_quote, speaker
            ))
            conn.commit()
            return {
                "id": hist_id,
                "action_id": action_id,
                "meeting_id": meeting_id,
                "meeting_title": meeting_title,
                "meeting_date": meeting_date,
                "event_type": event_type,
                "assignee": assignee,
                "previous_assignee": previous_assignee,
                "change_summary": change_summary,
                "verbatim_quote": verbatim_quote,
                "speaker": speaker
            }

    def get_action_history(self, action_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT * FROM action_history 
            WHERE action_id = ? 
            ORDER BY created_at ASC
            """, (action_id,))
            return [dict(r) for r in cursor.fetchall()]

    def get_action_history_by_meeting(self, meeting_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT h.*, a.task as task_title, a.status as current_status
            FROM action_history h
            LEFT JOIN action_items a ON h.action_id = a.id
            WHERE h.meeting_id = ?
            ORDER BY h.created_at ASC
            """, (meeting_id,))
            return [dict(r) for r in cursor.fetchall()]

    def get_actions_closed_in_meeting(self, meeting_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT a.*, m.title as origin_meeting_title, m.date as origin_meeting_date
            FROM action_items a
            LEFT JOIN meetings m ON a.meeting_id = m.id
            WHERE a.closed_in_meeting_id = ?
            """, (meeting_id,))
            return [dict(r) for r in cursor.fetchall()]

    def get_action_lineage(self, workspace_id: str = "ws_default") -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT a.*, m.title as origin_meeting_title, m.date as origin_meeting_date
            FROM action_items a
            LEFT JOIN meetings m ON a.meeting_id = m.id
            WHERE a.workspace_id = ?
            ORDER BY a.created_at DESC
            """, (workspace_id,))
            rows = cursor.fetchall()
            
            actions = []
            for r in rows:
                item = dict(r)
                item["is_approved"] = bool(item.get("is_approved", 1))
                item["status"] = item.get("status") or "RUNNING"
                
                # Fetch history timeline for this action
                cursor.execute("""
                SELECT * FROM action_history 
                WHERE action_id = ? 
                ORDER BY created_at ASC
                """, (item["id"],))
                item["history"] = [dict(h) for h in cursor.fetchall()]
                actions.append(item)

            total = len(actions)
            running = sum(1 for a in actions if a["status"] == "RUNNING")
            closed = sum(1 for a in actions if a["status"] == "CLOSED")
            blocked = sum(1 for a in actions if a["status"] == "BLOCKED")

            return {
                "actions": actions,
                "total_actions": total,
                "running_count": running,
                "closed_count": closed,
                "blocked_count": blocked
            }

    def update_action_status(
        self,
        action_id: str,
        status: str,
        meeting_id: Optional[str] = None,
        note: Optional[str] = None,
        workspace_id: str = "ws_default"
    ) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM action_items WHERE id = ?", (action_id,))
            row = cursor.fetchone()
            if not row:
                raise ValueError("Action item not found.")
            act = dict(row)

            old_status = act.get("status", "RUNNING")
            closed_in = meeting_id if status == "CLOSED" else None
            
            cursor.execute("""
            UPDATE action_items 
            SET status = ?, closed_in_meeting_id = ? 
            WHERE id = ?
            """, (status, closed_in, action_id))

            # Record event in action_history
            m_id = meeting_id or act.get("meeting_id")
            cursor.execute("SELECT title, date FROM meetings WHERE id = ?", (m_id,))
            m_row = cursor.fetchone()
            m_title = m_row["title"] if m_row else "Current Workspace Session"
            m_date = m_row["date"] if m_row else ""

            event_type = "COMPLETED" if status == "CLOSED" else ("BLOCKED" if status == "BLOCKED" else "REOPENED")
            change_summary = note or f"Status transitioned from {old_status} to {status}."

            hist_id = f"hist_{uuid.uuid4().hex[:8]}"
            cursor.execute("""
            INSERT INTO action_history (
                id, action_id, workspace_id, meeting_id, meeting_title, meeting_date,
                event_type, assignee, change_summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                hist_id, action_id, workspace_id, m_id, m_title, m_date,
                event_type, act["assignee"], change_summary
            ))

            conn.commit()
            return {"status": "success", "action_id": action_id, "new_status": status}

    def seed_action_lineage_demo(self, workspace_id: str = "ws_default") -> Dict[str, Any]:
        """
        Seeds the exact 3-meeting lifecycle described by the user:
        - Meeting 1 (Oct 12): "Database Architecture Planning" -> Action 1 assigned to Alex ("Define database schema").
        - Meeting 2 (Oct 19): "Schema Iteration & Analytics Sync" -> Action 1 modified with new requirements.
        - Meeting 3 (Oct 26): "Database Sign-off & Implementation" -> Action 1 marked CLOSED.
                              Follow-up Action 2 assigned to Bobby ("Implement database schema in PostgreSQL").
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Meeting 1
            m1_id = f"mtg_seq_1_{uuid.uuid4().hex[:6]}"
            m1_turns = [
                {"turn_index": 0, "speaker": "Alex", "timestamp": "00:01:10", "text": "We chose PostgreSQL for our database architecture and we are standardizing on it."},
                {"turn_index": 1, "speaker": "Sarah", "timestamp": "00:02:00", "text": "Alex, can you take ownership of defining the database schema specifications?"},
                {"turn_index": 2, "speaker": "Alex", "timestamp": "00:02:45", "text": "I will take responsibility for defining the core database schema by Friday."}
            ]
            cursor.execute("""
            INSERT OR REPLACE INTO meetings (id, workspace_id, title, date, turns_json, status)
            VALUES (?, ?, ?, ?, ?, 'COMMITTED')
            """, (m1_id, workspace_id, "Meeting 1: Database Architecture Planning", "2026-10-12", json.dumps(m1_turns)))

            # Meeting 2
            m2_id = f"mtg_seq_2_{uuid.uuid4().hex[:6]}"
            m2_turns = [
                {"turn_index": 0, "speaker": "Priya", "timestamp": "00:01:05", "text": "Let's review our progress on the database schema from last week."},
                {"turn_index": 1, "speaker": "Sarah", "timestamp": "00:02:20", "text": "Based on our new real-time analytics requirements, we need to redefine Alex's database schema to include JSONB columns and UUID keys."},
                {"turn_index": 2, "speaker": "Alex", "timestamp": "00:03:15", "text": "Understood, I am modifying the database schema draft to support JSONB payloads and secondary indexing."}
            ]
            cursor.execute("""
            INSERT OR REPLACE INTO meetings (id, workspace_id, title, date, turns_json, status)
            VALUES (?, ?, ?, ?, ?, 'COMMITTED')
            """, (m2_id, workspace_id, "Meeting 2: Schema Iteration & Requirements Sync", "2026-10-19", json.dumps(m2_turns)))

            # Meeting 3
            m3_id = f"mtg_seq_3_{uuid.uuid4().hex[:6]}"
            m3_turns = [
                {"turn_index": 0, "speaker": "Alex", "timestamp": "00:01:30", "text": "Defining the core database schema is officially complete and passed all architectural reviews."},
                {"turn_index": 1, "speaker": "Priya", "timestamp": "00:02:10", "text": "Great work Alex! Now that the schema is locked, Bobby, please take the approved schema and implement it in our PostgreSQL backend microservice."},
                {"turn_index": 2, "speaker": "Bobby", "timestamp": "00:02:50", "text": "I will implement the database schema in the PostgreSQL backend by next Tuesday."}
            ]
            cursor.execute("""
            INSERT OR REPLACE INTO meetings (id, workspace_id, title, date, turns_json, status)
            VALUES (?, ?, ?, ?, ?, 'COMMITTED')
            """, (m3_id, workspace_id, "Meeting 3: Database Sign-off & Implementation Handoff", "2026-10-26", json.dumps(m3_turns)))

            # Action 1 (Alex - Define Schema) -> CLOSED
            act1_id = f"act_schema_alex_{uuid.uuid4().hex[:6]}"
            cursor.execute("""
            INSERT OR REPLACE INTO action_items (
                id, workspace_id, meeting_id, task, assignee, deadline, priority, turn_index,
                verbatim_quote, is_approved, status, closed_in_meeting_id, external_issue_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CLOSED', ?, ?)
            """, (
                act1_id, workspace_id, m1_id, "Define core database schema", "Alex", "2026-10-16",
                "high", 2, "I will take responsibility for defining the core database schema by Friday.",
                1, m3_id, "https://linear.app/syncstate/issue/SYN-101"
            ))

            # Action 1 History (3 Events across Meetings 1, 2, 3)
            cursor.execute("""
            INSERT INTO action_history (id, action_id, workspace_id, meeting_id, meeting_title, meeting_date, event_type, assignee, change_summary, verbatim_quote, speaker)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"h1_{uuid.uuid4().hex[:6]}", act1_id, workspace_id, m1_id,
                "Meeting 1: Database Architecture Planning", "2026-10-12",
                "CREATED", "Alex", "Initial deliverable assigned to Alex: Define core database schema",
                "I will take responsibility for defining the core database schema by Friday.", "Alex"
            ))

            cursor.execute("""
            INSERT INTO action_history (id, action_id, workspace_id, meeting_id, meeting_title, meeting_date, event_type, assignee, change_summary, verbatim_quote, speaker)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"h2_{uuid.uuid4().hex[:6]}", act1_id, workspace_id, m2_id,
                "Meeting 2: Schema Iteration & Requirements Sync", "2026-10-19",
                "MODIFIED", "Alex", "Redefined schema based on new requirements: added JSONB columns & UUID keys.",
                "Understood, I am modifying the database schema draft to support JSONB payloads and secondary indexing.", "Alex"
            ))

            cursor.execute("""
            INSERT INTO action_history (id, action_id, workspace_id, meeting_id, meeting_title, meeting_date, event_type, assignee, change_summary, verbatim_quote, speaker)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"h3_{uuid.uuid4().hex[:6]}", act1_id, workspace_id, m3_id,
                "Meeting 3: Database Sign-off & Implementation Handoff", "2026-10-26",
                "COMPLETED", "Alex", "Defining schema is complete and officially signed off by tech leads.",
                "Defining the core database schema is officially complete and passed all architectural reviews.", "Alex"
            ))

            # Action 2 (Bobby - Implement Schema) -> RUNNING (Parent is Action 1)
            act2_id = f"act_impl_bobby_{uuid.uuid4().hex[:6]}"
            cursor.execute("""
            INSERT OR REPLACE INTO action_items (
                id, workspace_id, meeting_id, task, assignee, deadline, priority, turn_index,
                verbatim_quote, is_approved, status, parent_action_id, external_issue_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RUNNING', ?, ?)
            """, (
                act2_id, workspace_id, m3_id, "Implement database schema in PostgreSQL backend", "Bobby", "2026-11-03",
                "urgent", 2, "I will implement the database schema in the PostgreSQL backend by next Tuesday.",
                1, act1_id, "https://linear.app/syncstate/issue/SYN-102"
            ))

            cursor.execute("""
            INSERT INTO action_history (id, action_id, workspace_id, meeting_id, meeting_title, meeting_date, event_type, assignee, previous_assignee, change_summary, verbatim_quote, speaker)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"h4_{uuid.uuid4().hex[:6]}", act2_id, workspace_id, m3_id,
                "Meeting 3: Database Sign-off & Implementation Handoff", "2026-10-26",
                "HANDED_OFF", "Bobby", "Alex", "Follow-up implementation assigned to Bobby after Alex completed schema design.",
                "I will implement the database schema in the PostgreSQL backend by next Tuesday.", "Bobby"
            ))

            conn.commit()
            return {
                "status": "success",
                "message": "Seeded 3-Meeting Action Lineage Journey (Meeting 1 -> Meeting 2 -> Meeting 3)",
                "action_completed": act1_id,
                "action_followup": act2_id,
                "meetings": [m1_id, m2_id, m3_id]
            }

    def get_all_active_tasks(self, workspace_id: str = "ws_default") -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT a.*, m.title as meeting_title 
            FROM action_items a 
            JOIN meetings m ON a.meeting_id = m.id 
            WHERE a.workspace_id = ?
            ORDER BY a.deadline ASC
            """, (workspace_id,))
            rows = cursor.fetchall()
            return [{**dict(r), "is_approved": bool(r["is_approved"])} for r in rows]

    # --- Conflicts ---
    def save_conflicts(self, conflicts: List[Dict[str, Any]], workspace_id: str = "ws_default"):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            for c in conflicts:
                cursor.execute("""
                INSERT OR REPLACE INTO conflicts (
                    id, workspace_id, meeting_id, candidate_decision_id, historical_decision_id,
                    historical_meeting_title, historical_statement, historical_quote,
                    candidate_quote, conflict_type, reasoning, confidence, resolved, resolution_choice
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    c["id"], workspace_id, c.get("meeting_id"), c["candidate_decision_id"], c["historical_decision_id"],
                    c["historical_meeting_title"], c["historical_statement"], c["historical_quote"],
                    c["candidate_quote"], c["conflict_type"], c["reasoning"], c["confidence"],
                    1 if c.get("resolved", False) else 0, c.get("resolution_choice")
                ))
            conn.commit()

    def get_conflicts_by_meeting(self, meeting_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM conflicts WHERE meeting_id = ?", (meeting_id,))
            rows = cursor.fetchall()
            return [{**dict(r), "resolved": bool(r["resolved"])} for r in rows]

    def resolve_conflict(self, conflict_id: str, choice: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE conflicts SET resolved = 1, resolution_choice = ? WHERE id = ?
            """, (choice, conflict_id))
            conn.commit()

db = Database()
