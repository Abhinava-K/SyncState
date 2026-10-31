import json
import uuid
import re
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings
from app.schemas.payloads import ConflictType, ConflictRecord

class AuditService:
    def __init__(self):
        pass

    @property
    def api_key(self):
        return settings.GEMINI_API_KEY

    async def audit_decision_conflicts(
        self,
        candidate_decision: Dict[str, Any],
        historical_matches: List[Dict[str, Any]],
        meeting_id: str
    ) -> List[ConflictRecord]:
        """
        Audits a candidate decision against relevant historical decisions retrieved from memory.
        """
        detected_conflicts: List[ConflictRecord] = []

        for hist in historical_matches:
            conflict = await self._evaluate_pair(candidate_decision, hist, meeting_id)
            if conflict:
                detected_conflicts.append(conflict)

        return detected_conflicts

    async def _evaluate_pair(
        self,
        candidate: Dict[str, Any],
        historical: Dict[str, Any],
        meeting_id: str
    ) -> Optional[ConflictRecord]:
        cand_text = candidate["statement"]
        hist_text = historical["statement"]

        # 1. LLM NLI evaluation if Gemini key is available
        if self.api_key:
            try:
                llm_result = await self._call_gemini_auditor(candidate, historical)
                if llm_result and llm_result.get("stance") == "DIRECT_CONFLICT" and llm_result.get("confidence", 0) >= 0.70:
                    ctype = llm_result.get("conflict_type", ConflictType.POLICY_REVERSAL)
                    if isinstance(ctype, str) and ctype in ConflictType.__members__:
                        ctype = ConflictType[ctype]
                    return ConflictRecord(
                        id=f"conf_{uuid.uuid4().hex[:8]}",
                        meeting_id=meeting_id,
                        candidate_decision_id=candidate["id"],
                        historical_decision_id=historical["id"],
                        historical_meeting_title=historical.get("meeting_title", "Historical Meeting"),
                        historical_statement=historical["statement"],
                        historical_quote=historical.get("verbatim_quote", ""),
                        candidate_quote=candidate.get("verbatim_quote", ""),
                        conflict_type=ctype,
                        reasoning=llm_result.get("reasoning", "A contradiction with earlier policy was identified."),
                        confidence=round(llm_result.get("confidence", 0.85), 2),
                        resolved=False
                    )
            except Exception:
                pass

        # 2. Deterministic Semantic Contradiction Evaluator
        return self._heuristic_audit(candidate, historical, meeting_id)

    def _heuristic_audit(
        self,
        candidate: Dict[str, Any],
        historical: Dict[str, Any],
        meeting_id: str
    ) -> Optional[ConflictRecord]:
        cand_stmt = candidate["statement"].lower()
        hist_stmt = historical["statement"].lower()
        cand_quote = candidate.get("verbatim_quote", "")
        hist_quote = historical.get("verbatim_quote", "")

        # A: Contract & Protocol Inversion (API & Data Contracts)
        contract_pairs = [
            ("rest", "grpc", "API Protocol & RPC Contract"),
            ("rest", "graphql", "API Protocol & Schema"),
            ("graphql", "grpc", "API Protocol & Serialization"),
            ("websockets", "polling", "Realtime Communication Protocol"),
            ("json", "protobuf", "Data Serialization Standard"),
            ("jwt", "session cookie", "Authentication Contract"),
            ("uuid", "auto-increment", "Data Model Primary Key Contract")
        ]
        for c1, c2, domain in contract_pairs:
            if (c1 in hist_stmt and c2 in cand_stmt) or (c2 in hist_stmt and c1 in cand_stmt):
                past_proto = c1 if c1 in hist_stmt else c2
                new_proto = c2 if past_proto == c1 else c1
                return ConflictRecord(
                    id=f"conf_{uuid.uuid4().hex[:8]}",
                    meeting_id=meeting_id,
                    candidate_decision_id=candidate["id"],
                    historical_decision_id=historical["id"],
                    historical_meeting_title=historical.get("meeting_title", "Historical Architecture Review"),
                    historical_statement=historical["statement"],
                    historical_quote=hist_quote or historical["statement"],
                    candidate_quote=cand_quote or candidate["statement"],
                    conflict_type=ConflictType.CONTRACT_INVERSION,
                    reasoning=f"Interface Contract Inversion: Previous sync locked '{past_proto.upper()}' for {domain}, but current proposal introduces '{new_proto.upper()}' breaking contract compatibility.",
                    confidence=0.91,
                    resolved=False
                )

        # B: Technology Stack Inversion
        tech_pairs = [
            ("postgresql", "mongodb", "Database Architecture"),
            ("postgres", "mongodb", "Database Architecture"),
            ("mysql", "mongodb", "Database Architecture"),
            ("react", "vue", "Frontend Framework"),
            ("react", "angular", "Frontend Framework"),
            ("aws", "gcp", "Cloud Infrastructure"),
            ("aws", "azure", "Cloud Infrastructure"),
            ("linear", "jira", "Issue Tracking Tool"),
            ("kafka", "rabbitmq", "Message Broker Pipeline"),
            ("redux", "zustand", "State Management"),
            ("docker", "serverless", "Deployment Model")
        ]
        for t1, t2, domain in tech_pairs:
            if (t1 in hist_stmt and t2 in cand_stmt) or (t2 in hist_stmt and t1 in cand_stmt):
                winner_hist = t1 if t1 in hist_stmt else t2
                winner_cand = t2 if winner_hist == t1 else t1
                return ConflictRecord(
                    id=f"conf_{uuid.uuid4().hex[:8]}",
                    meeting_id=meeting_id,
                    candidate_decision_id=candidate["id"],
                    historical_decision_id=historical["id"],
                    historical_meeting_title=historical.get("meeting_title", "Previous Architecture Sync"),
                    historical_statement=historical["statement"],
                    historical_quote=hist_quote or historical["statement"],
                    candidate_quote=cand_quote or candidate["statement"],
                    conflict_type=ConflictType.TECH_STACK_REVERSAL,
                    reasoning=f"Meeting decision proposes using {winner_cand.upper()}, which directly contradicts earlier institutional agreement to use {winner_hist.upper()} without an acknowledged migration approval.",
                    confidence=0.92,
                    resolved=False
                )

        # C: Release Timeline Slip / Contradiction
        timeline_keywords = ["release", "freeze", "launch", "deadline", "ship", "target date"]
        hist_has_timeline = any(k in hist_stmt for k in timeline_keywords)
        cand_has_timeline = any(k in cand_stmt for k in timeline_keywords)

        if hist_has_timeline and cand_has_timeline:
            dates_cand = re.findall(r'(?:nov(?:ember)?|oct(?:ober)?|dec(?:ember)?|jan(?:uary)?|\b\d{1,2}(?:st|nd|rd|th)?)\s*\d{0,4}', cand_stmt)
            dates_hist = re.findall(r'(?:nov(?:ember)?|oct(?:ober)?|dec(?:ember)?|jan(?:uary)?|\b\d{1,2}(?:st|nd|rd|th)?)\s*\d{0,4}', hist_stmt)
            
            if dates_cand and dates_hist and dates_cand != dates_hist:
                return ConflictRecord(
                    id=f"conf_{uuid.uuid4().hex[:8]}",
                    meeting_id=meeting_id,
                    candidate_decision_id=candidate["id"],
                    historical_decision_id=historical["id"],
                    historical_meeting_title=historical.get("meeting_title", "Previous Planning Sync"),
                    historical_statement=historical["statement"],
                    historical_quote=hist_quote or historical["statement"],
                    candidate_quote=cand_quote or candidate["statement"],
                    conflict_type=ConflictType.TIMELINE_SLIP,
                    reasoning=f"Timeline conflict: Previous sync fixed release milestone for '{dates_hist[0]}', whereas current meeting suggests shifting it to '{dates_cand[0]}' without formal schedule sign-off.",
                    confidence=0.88,
                    resolved=False
                )

        # D: Antagonistic Policy Stances
        polar_opposites = [
            (r'\b(drop|abandon|cancel|stop)\b', r'\b(keep|continue|proceed|adopt)\b'),
            (r'\b(delay|postpone|push back)\b', r'\b(on-time|freeze|accelerate)\b'),
            (r'\b(in-house|internal)\b', r'\b(outsource|contractor|vendor)\b')
        ]
        for p1, p2 in polar_opposites:
            if (re.search(p1, hist_stmt) and re.search(p2, cand_stmt)) or (re.search(p2, hist_stmt) and re.search(p1, cand_stmt)):
                return ConflictRecord(
                    id=f"conf_{uuid.uuid4().hex[:8]}",
                    meeting_id=meeting_id,
                    candidate_decision_id=candidate["id"],
                    historical_decision_id=historical["id"],
                    historical_meeting_title=historical.get("meeting_title", "Previous Alignment Sync"),
                    historical_statement=historical["statement"],
                    historical_quote=hist_quote or historical["statement"],
                    candidate_quote=cand_quote or candidate["statement"],
                    conflict_type=ConflictType.POLICY_REVERSAL,
                    reasoning=f"Policy reversal detected regarding '{candidate.get('topic', 'Topic')}': Opposing stances recorded between past and current discussions.",
                    confidence=0.82,
                    resolved=False
                )

        return None

    def audit_action_conflicts(
        self,
        candidate_actions: List[Dict[str, Any]],
        historical_actions: List[Dict[str, Any]],
        meeting_id: str
    ) -> List[ConflictRecord]:
        """
        Deep Architectural Collision Engine for Action Items:
        1. DEPENDENCY_DEADLOCK: QA/load-test/deployment scheduled before or concurrently with dependent build/API delivery.
        2. OWNER_DISPUTE: Two separate people assigned to the exact same domain without documented handoff.
        """
        conflicts: List[ConflictRecord] = []
        all_actions = historical_actions + candidate_actions

        day_order = {
            "monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4, "friday": 5, "saturday": 6, "sunday": 7
        }

        # Domain clusters grouping synonymous architecture concepts
        domain_clusters = [
            ("payments", {"checkout", "payment", "stripe", "billing"}),
            ("auth", {"auth", "jwt", "session", "login", "oauth"}),
            ("database", {"database", "postgres", "mongodb", "schema", "migration"}),
            ("api", {"api", "endpoint", "rest", "grpc", "graphql"}),
            ("analytics", {"analytics", "telemetry", "metrics"})
        ]

        def get_clusters(text: str) -> set:
            found = set()
            t_lower = text.lower()
            for cluster_name, words in domain_clusters:
                if any(w in t_lower for w in words):
                    found.add(cluster_name)
            return found

        def extract_day_index(deadline_str: Optional[str]) -> Optional[int]:
            if not deadline_str:
                return None
            m = re.search(r'\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b', deadline_str.lower())
            if m:
                return day_order.get(m.group(1))
            return None

        for cand in candidate_actions:
            cand_task = cand.get("task", "").lower()
            cand_assignee = cand.get("assignee", "")
            cand_deadline = cand.get("deadline") or ""
            cand_clusters = get_clusters(cand_task)

            if not cand_clusters:
                continue

            is_downstream = bool(re.search(r'\b(test\w*|qa|benchmark\w*|deploy\w*|release\w*)\b', cand_task))
            is_prerequisite = bool(re.search(r'\b(build\w*|finish\w*|deliver\w*|implement\w*|develop\w*|create\w*|migrat\w*|integrat\w*)\b', cand_task))

            for hist in all_actions:
                if hist.get("id") == cand.get("id"):
                    continue

                hist_task = hist.get("task", "").lower()
                hist_assignee = hist.get("assignee", "")
                hist_deadline = hist.get("deadline") or ""
                hist_clusters = get_clusters(hist_task)

                common_clusters = cand_clusters & hist_clusters
                if not common_clusters:
                    continue

                cluster_label = list(common_clusters)[0]

                # 1. Dependency Deadlock Detection
                hist_is_prereq = bool(re.search(r'\b(build\w*|finish\w*|deliver\w*|implement\w*|develop\w*|create\w*|migrat\w*|integrat\w*)\b', hist_task))
                if is_downstream and hist_is_prereq:
                    cand_day_val = extract_day_index(cand_deadline)
                    hist_day_val = extract_day_index(hist_deadline)

                    deadlock_detected = False
                    if cand_day_val and hist_day_val and cand_day_val <= hist_day_val:
                        deadlock_detected = True

                    if deadlock_detected:
                        conflicts.append(ConflictRecord(
                            id=f"conf_{uuid.uuid4().hex[:8]}",
                            meeting_id=meeting_id,
                            candidate_decision_id=cand["id"],
                            historical_decision_id=hist["id"],
                            historical_meeting_title=hist.get("meeting_title", "Prerequisite Deliverable"),
                            historical_statement=f"Prerequisite deliverable: {hist.get('task')} (Assigned to {hist_assignee}, Due: {hist.get('deadline')})",
                            historical_quote=hist.get("verbatim_quote", hist.get("task")),
                            candidate_quote=cand.get("verbatim_quote", cand.get("task")),
                            conflict_type=ConflictType.DEPENDENCY_DEADLOCK,
                            reasoning=f"Dependency Deadlock: Downstream task '{cand.get('task')}' is scheduled for '{cand.get('deadline')}', but prerequisite '{hist.get('task')}' is not scheduled to complete until '{hist.get('deadline')}'. Testing cannot precede deliverable completion.",
                            confidence=0.94,
                            resolved=False
                        ))

                # 2. Ownership Dispute Detection
                if cand_assignee and hist_assignee and cand_assignee.lower() != hist_assignee.lower():
                    if is_prerequisite or ("auth" in common_clusters):
                        conflicts.append(ConflictRecord(
                            id=f"conf_{uuid.uuid4().hex[:8]}",
                            meeting_id=meeting_id,
                            candidate_decision_id=cand["id"],
                            historical_decision_id=hist["id"],
                            historical_meeting_title=hist.get("meeting_title", "Prior Assignment"),
                            historical_statement=f"Feature ownership held by {hist_assignee}: '{hist.get('task')}'",
                            historical_quote=hist.get("verbatim_quote", hist.get("task")),
                            candidate_quote=cand.get("verbatim_quote", cand.get("task")),
                            conflict_type=ConflictType.OWNER_DISPUTE,
                            reasoning=f"Ownership Dispute: Domain '{cluster_label.upper()}' previously assigned to {hist_assignee} is now being assigned to {cand_assignee} without recorded handoff or role clarification.",
                            confidence=0.87,
                            resolved=False
                        ))

        # Deduplicate conflicts by (candidate_decision_id, historical_decision_id, conflict_type)
        unique_conflicts = []
        seen = set()
        for c in conflicts:
            key = (c.candidate_decision_id, c.historical_decision_id, c.conflict_type)
            if key not in seen:
                seen.add(key)
                unique_conflicts.append(c)

        return unique_conflicts

    async def _call_gemini_auditor(self, candidate: Dict[str, Any], historical: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        prompt = f"""
You are an expert organizational governance and decision audit auditor.
Compare these two team decisions from different meetings:

[HISTORICAL DECISION from Meeting '{historical.get('meeting_title', 'Previous Meeting')}']:
- Topic: {historical.get('topic')}
- Agreed Stance: {historical.get('statement')}
- Spoken Quote: "{historical.get('verbatim_quote')}"

[CANDIDATE DECISION from Current Meeting]:
- Topic: {candidate.get('topic')}
- Proposed Stance: {candidate.get('statement')}
- Spoken Quote: "{candidate.get('verbatim_quote')}"

Do these two decisions contradict each other?
Classify the stance into:
- COMPATIBLE: Compatible or independent
- SUPERSEDES: Deliberate valid update with clear justification
- DIRECT_CONFLICT: Conflicting policy, slipped deadline, contract inversion, or reversed tech stack without formal agreement

Respond ONLY with valid JSON matching:
{{
  "stance": "COMPATIBLE" | "SUPERSEDES" | "DIRECT_CONFLICT",
  "confidence": 0.0 to 1.0,
  "conflict_type": "TIMELINE_SLIP" | "TECH_STACK_REVERSAL" | "POLICY_REVERSAL" | "OWNER_DISPUTE" | "CONTRACT_INVERSION" | "DEPENDENCY_DEADLOCK",
  "reasoning": "Clear 1-2 sentence explanation of the contradiction"
}}
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
        return None

audit_service = AuditService()
