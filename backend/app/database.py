import sqlite3
import json
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

    def init_schema(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Meetings Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                date TEXT NOT NULL,
                turns_json TEXT NOT NULL,
                status TEXT DEFAULT 'STAGED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # Decisions Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS decisions (
                id TEXT PRIMARY KEY,
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

            # Action Items Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS action_items (
                id TEXT PRIMARY KEY,
                meeting_id TEXT NOT NULL,
                task TEXT NOT NULL,
                assignee TEXT NOT NULL,
                deadline TEXT,
                priority TEXT DEFAULT 'medium',
                turn_index INTEGER NOT NULL,
                verbatim_quote TEXT NOT NULL,
                is_approved INTEGER DEFAULT 1,
                external_issue_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id)
            )
            """)

            # Conflicts Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS conflicts (
                id TEXT PRIMARY KEY,
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
            conn.commit()

    # --- Meetings ---
    def save_meeting(self, meeting_id: str, title: str, date: str, turns: List[Dict[str, Any]]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO meetings (id, title, date, turns_json)
            VALUES (?, ?, ?, ?)
            """, (meeting_id, title, date, json.dumps(turns)))
            conn.commit()

    def get_meeting(self, meeting_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,))
            row = cursor.fetchone()
            if not row:
                return None
            data = dict(row)
            data["turns"] = json.loads(data["turns_json"])
            return data

    def list_meetings(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, date, status, created_at FROM meetings ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]

    def delete_meeting(self, meeting_id: str):
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
    def save_decisions(self, decisions: List[Dict[str, Any]]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            for d in decisions:
                cursor.execute("""
                INSERT OR REPLACE INTO decisions (
                    id, meeting_id, topic, statement, speaker, turn_index, verbatim_quote,
                    status, superseded_by_id, embedding_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    d["id"], d.get("meeting_id"), d["topic"], d["statement"], d["speaker"],
                    d["turn_index"], d["verbatim_quote"], d.get("status", "ACTIVE"),
                    d.get("superseded_by_id"), json.dumps(d.get("embedding", []))
                ))
            conn.commit()

    def get_decisions_by_meeting(self, meeting_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM decisions WHERE meeting_id = ?", (meeting_id,))
            return [dict(row) for row in cursor.fetchall()]

    def get_all_active_decisions(self, exclude_meeting_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT d.*, m.title as meeting_title, m.date as meeting_date FROM decisions d JOIN meetings m ON d.meeting_id = m.id WHERE d.status = 'ACTIVE'"
            params = []
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

    # --- Action Items ---
    def save_action_items(self, action_items: List[Dict[str, Any]]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            for a in action_items:
                cursor.execute("""
                INSERT OR REPLACE INTO action_items (
                    id, meeting_id, task, assignee, deadline, priority, turn_index,
                    verbatim_quote, is_approved, external_issue_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    a["id"], a.get("meeting_id"), a["task"], a["assignee"], a.get("deadline"),
                    a.get("priority", "medium"), a["turn_index"], a["verbatim_quote"],
                    1 if a.get("is_approved", True) else 0, a.get("external_issue_url")
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

    def get_all_active_tasks(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT a.*, m.title as meeting_title 
            FROM action_items a 
            JOIN meetings m ON a.meeting_id = m.id 
            ORDER BY a.deadline ASC
            """)
            rows = cursor.fetchall()
            return [{**dict(r), "is_approved": bool(r["is_approved"])} for r in rows]

    # --- Conflicts ---
    def save_conflicts(self, conflicts: List[Dict[str, Any]]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            for c in conflicts:
                cursor.execute("""
                INSERT OR REPLACE INTO conflicts (
                    id, meeting_id, candidate_decision_id, historical_decision_id,
                    historical_meeting_title, historical_statement, historical_quote,
                    candidate_quote, conflict_type, reasoning, confidence, resolved, resolution_choice
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    c["id"], c.get("meeting_id"), c["candidate_decision_id"], c["historical_decision_id"],
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

