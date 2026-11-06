from datetime import datetime, timedelta
import re
from typing import List, Dict, Any
from app.database import db
from app.schemas.payloads import TaskReminder, PersonDigest, WeeklyDigestResponse, ExtractedActionItem

class DigestService:
    def _evaluate_deadline_urgency(self, deadline_str: str) -> str:
        """
        Determines urgency based on deadline string or relative time.
        """
        if not deadline_str:
            return "normal"
        d_lower = deadline_str.lower()
        if "today" in d_lower or "24h" in d_lower or "tomorrow" in d_lower or "thursday" in d_lower:
            return "critical_24h"
        elif "48h" in d_lower or "friday" in d_lower or "2 days" in d_lower or "nov 5" in d_lower:
            return "upcoming_48h"
        return "normal"

    def generate_weekly_digest(self) -> WeeklyDigestResponse:
        all_actions = db.get_all_active_tasks()
        all_decisions = db.get_all_active_decisions()
        
        # Group tasks by assignee
        assignee_map: Dict[str, List[Dict[str, Any]]] = {}
        for action in all_actions:
            owner = action["assignee"].strip()
            if owner not in assignee_map:
                assignee_map[owner] = []
            assignee_map[owner].append(action)

        members: List[PersonDigest] = []
        md_lines = [
            "# SyncState Weekly Team Execution Digest",
            f"*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}*",
            "",
            "---"
        ]

        for assignee, tasks in assignee_map.items():
            reminders: List[TaskReminder] = []
            active_items: List[ExtractedActionItem] = []

            for t in tasks:
                item = ExtractedActionItem(
                    id=t["id"],
                    meeting_id=t.get("meeting_id"),
                    task=t["task"],
                    assignee=t["assignee"],
                    deadline=t.get("deadline"),
                    priority=t.get("priority", "medium"),
                    turn_index=t.get("turn_index", 0),
                    verbatim_quote=t.get("verbatim_quote", ""),
                    is_approved=bool(t.get("is_approved", True)),
                    external_issue_url=t.get("external_issue_url")
                )
                active_items.append(item)

                urgency = self._evaluate_deadline_urgency(t.get("deadline", ""))
                reminders.append(TaskReminder(
                    action_id=t["id"],
                    task=t["task"],
                    assignee=assignee,
                    deadline=t.get("deadline", "TBD"),
                    hours_remaining=24.0 if urgency == "critical_24h" else (48.0 if urgency == "upcoming_48h" else None),
                    urgency=urgency # type: ignore
                ))

            # Count decisions made/spoken by this assignee
            dec_count = sum(1 for d in all_decisions if assignee.lower() in d.get("speaker", "").lower())

            members.append(PersonDigest(
                assignee=assignee,
                active_tasks=active_items,
                reminders=reminders,
                decisions_count=dec_count
            ))

            # Build markdown block for this member
            md_lines.append(f"\n### {assignee}")
            md_lines.append(f"- **Active Commitments**: {len(active_items)} tasks")
            md_lines.append(f"- **Decisions Authored/Led**: {dec_count} institutional decisions")
            
            urgent_tasks = [r for r in reminders if r.urgency in ["critical_24h", "upcoming_48h"]]
            if urgent_tasks:
                md_lines.append("- **Upcoming Deadlines (Next 48h)**:")
                for u in urgent_tasks:
                    badge = "[DUE <24h]" if u.urgency == "critical_24h" else "[DUE <48h]"
                    md_lines.append(f"  * {badge}: `{u.task}` (Deadline: {u.deadline})")

            md_lines.append("- **Task Breakdown**:")
            for item in active_items:
                link = f"([View Ticket]({item.external_issue_url}))" if item.external_issue_url else "(Pending Dispatch)"
                status_icon = "[Verified]" if item.is_approved else "[Staged]"
                md_lines.append(f"  * {status_icon} **{item.task}** — *{item.deadline}* {link}")

        md_lines.append("\n---\n*SyncState Meeting-to-Execution Engine*")

        return WeeklyDigestResponse(
            generated_at=datetime.now().isoformat(),
            members=members,
            markdown_summary="\n".join(md_lines)
        )

digest_service = DigestService()

