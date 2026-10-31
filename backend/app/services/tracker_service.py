import hashlib
import random
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings
from app.database import db
from app.schemas.payloads import CreatedTicket

class TrackerService:
    def __init__(self):
        pass

    @property
    def mode(self):
        return settings.INTEGRATION_MODE

    @property
    def linear_key(self):
        return settings.LINEAR_API_KEY

    @property
    def github_token(self):
        return settings.GITHUB_TOKEN

    @property
    def github_repo(self):
        return settings.GITHUB_REPO

    def _generate_mock_ticket(self, action_id: str, task: str, assignee: str, deadline: Optional[str], provider: str = "linear") -> CreatedTicket:
        # Deterministic ticket ID based on hash
        seed = int(hashlib.md5(f"{action_id}_{task}".encode('utf-8')).hexdigest(), 16)
        num = (seed % 900) + 100
        
        if provider == "linear":
            ticket_id = f"SYN-{num}"
            url = f"https://linear.app/syncstate/issue/{ticket_id}"
        else:
            ticket_id = f"#{num}"
            url = f"https://github.com/{self.github_repo}/issues/{num}"

        return CreatedTicket(
            action_id=action_id,
            task=task,
            assignee=assignee,
            deadline=deadline,
            ticket_id=ticket_id,
            url=url,
            provider=provider
        )

    async def dispatch_action_items(
        self,
        action_ids: List[str],
        provider: str = "linear"
    ) -> List[CreatedTicket]:
        """
        Dispatches approved action items to Linear or GitHub Issues.
        """
        created_tickets: List[CreatedTicket] = []

        all_actions = db.get_all_active_tasks()
        target_actions = [a for a in all_actions if a["id"] in action_ids]

        for action in target_actions:
            # If already has an external ticket URL, reuse it (Idempotent)
            if action.get("external_issue_url"):
                created_tickets.append(CreatedTicket(
                    action_id=action["id"],
                    task=action["task"],
                    assignee=action["assignee"],
                    deadline=action.get("deadline"),
                    ticket_id="SYNCED",
                    url=action["external_issue_url"],
                    provider=provider
                ))
                continue

            # Try live API if configured and mode is 'live'
            ticket = None
            if self.mode == "live":
                if provider == "linear" and self.linear_key:
                    ticket = await self._dispatch_to_linear(action)
                elif provider == "github" and self.github_token:
                    ticket = await self._dispatch_to_github(action)

            # Fallback to deterministic mock ticket
            if not ticket:
                ticket = self._generate_mock_ticket(
                    action_id=action["id"],
                    task=action["task"],
                    assignee=action["assignee"],
                    deadline=action.get("deadline"),
                    provider=provider
                )

            # Save created URL to database
            db.update_action_item(action["id"], {"external_issue_url": ticket.url})
            created_tickets.append(ticket)

        return created_tickets

    async def _dispatch_to_linear(self, action: Dict[str, Any]) -> Optional[CreatedTicket]:
        try:
            query = """
            mutation CreateIssue($title: String!, $description: String!, $teamId: String!) {
                issueCreate(input: {title: $title, description: $description, teamId: $teamId}) {
                    success
                    issue { id identifier url }
                }
            }
            """
            desc = f"**Assignee**: {action['assignee']}\n**Deadline**: {action.get('deadline', 'N/A')}\n\n*Created via SyncState Meeting Agent*\n> \"{action.get('verbatim_quote', '')}\""
            headers = {"Authorization": self.linear_key, "Content-Type": "application/json"}
            payload = {
                "query": query,
                "variables": {
                    "title": action["task"],
                    "description": desc,
                    "teamId": settings.LINEAR_TEAM_ID or "default"
                }
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post("https://api.linear.app/graphql", json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    issue = data.get("data", {}).get("issueCreate", {}).get("issue")
                    if issue:
                        return CreatedTicket(
                            action_id=action["id"],
                            task=action["task"],
                            assignee=action["assignee"],
                            deadline=action.get("deadline"),
                            ticket_id=issue["identifier"],
                            url=issue["url"],
                            provider="linear"
                        )
        except Exception:
            pass
        return None

    async def _dispatch_to_github(self, action: Dict[str, Any]) -> Optional[CreatedTicket]:
        try:
            url = f"https://api.github.com/repos/{self.github_repo}/issues"
            headers = {
                "Authorization": f"Bearer {self.github_token}",
                "Accept": "application/vnd.github+json"
            }
            desc = f"**Assignee**: {action['assignee']}\n**Deadline**: {action.get('deadline', 'N/A')}\n\n*Created via SyncState Meeting Agent*\n> \"{action.get('verbatim_quote', '')}\""
            payload = {
                "title": action["task"],
                "body": desc,
                "labels": ["syncstate", "action-item"]
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 201:
                    data = res.json()
                    return CreatedTicket(
                        action_id=action["id"],
                        task=action["task"],
                        assignee=action["assignee"],
                        deadline=action.get("deadline"),
                        ticket_id=f"#{data['number']}",
                        url=data["html_url"],
                        provider="github"
                    )
        except Exception:
            pass
        return None

tracker_service = TrackerService()

