import json
import uuid
import re
import base64
from typing import List, Dict, Any, Tuple, Optional
import httpx
from app.config import settings
from app.schemas.payloads import DiarizedTurn, ExtractedDecision, ExtractedActionItem, DecisionStatus

class ExtractorService:
    def __init__(self):
        pass

    @property
    def api_key(self):
        return settings.GEMINI_API_KEY

    def parse_vtt(self, content: str) -> List[DiarizedTurn]:
        """
        Parses standard WebVTT exported from Zoom, Meet, Teams, or Otter.
        Handles both voice tags `<v Speaker>Text</v>` and `Speaker: Text`.
        """
        turns: List[DiarizedTurn] = []
        content = content.replace('\r\n', '\n').replace('\r', '\n')
        blocks = re.split(r'\n\s*\n', content.strip())
        turn_idx = 0

        for block in blocks:
            lines = [l.strip() for l in block.split('\n') if l.strip()]
            lines = [l for l in lines if not l.startswith('WEBVTT') and not l.startswith('NOTE')]
            if not lines:
                continue

            time_line_idx = -1
            timestamp = f"0{turn_idx}:00"
            for i, line in enumerate(lines):
                if '-->' in line:
                    time_line_idx = i
                    m_time = re.search(r'(\d{2}:\d{2}(?::\d{2})?)', line)
                    if m_time:
                        timestamp = m_time.group(1)
                    break

            if time_line_idx != -1 and time_line_idx + 1 < len(lines):
                text_content = " ".join(lines[time_line_idx + 1:])
                # Check <v Speaker>Text</v>
                v_match = re.search(r'<v\s+([^>]+)>(.*?)(?:</v>)?$', text_content)
                if v_match:
                    speaker = v_match.group(1).strip()
                    clean_text = v_match.group(2).strip()
                else:
                    # Check Speaker: Text
                    s_match = re.match(r'^([A-Za-z0-9\s\(\)]+?)\s*:\s*(.+)$', text_content)
                    if s_match:
                        speaker = s_match.group(1).strip()
                        clean_text = s_match.group(2).strip()
                    else:
                        speaker = f"Speaker {turn_idx + 1}"
                        clean_text = text_content

                if clean_text:
                    turns.append(DiarizedTurn(
                        turn_index=turn_idx,
                        speaker=speaker,
                        timestamp=timestamp,
                        text=clean_text
                    ))
                    turn_idx += 1

        return turns

    def parse_srt(self, content: str) -> List[DiarizedTurn]:
        """
        Parses standard SubRip (.srt) subtitle files.
        """
        turns: List[DiarizedTurn] = []
        blocks = re.split(r'\n\s*\n', content.strip())
        turn_idx = 0

        for block in blocks:
            lines = [l.strip() for l in block.split('\n') if l.strip()]
            if len(lines) >= 3 and lines[0].isdigit() and '-->' in lines[1]:
                timestamp_line = lines[1]
                m_time = re.search(r'(\d{2}:\d{2}(?::\d{2})?)', timestamp_line)
                timestamp = m_time.group(1) if m_time else f"0{turn_idx}:00"
                text_content = " ".join(lines[2:])

                s_match = re.match(r'^([A-Za-z0-9\s\(\)]+?)\s*:\s*(.+)$', text_content)
                if s_match:
                    speaker = s_match.group(1).strip()
                    clean_text = s_match.group(2).strip()
                else:
                    speaker = f"Speaker {turn_idx + 1}"
                    clean_text = text_content

                turns.append(DiarizedTurn(
                    turn_index=turn_idx,
                    speaker=speaker,
                    timestamp=timestamp,
                    text=clean_text
                ))
                turn_idx += 1

        return turns

    def parse_raw_text(self, text: str) -> List[DiarizedTurn]:
        """
        Auto-detects format (VTT, SRT, or dialogue transcript) and parses accordingly.
        """
        text_strip = text.strip()
        if text_strip.startswith('WEBVTT'):
            return self.parse_vtt(text)
        if re.match(r'^\d+\s*\n\d{2}:\d{2}', text_strip):
            return self.parse_srt(text)

        lines = [line.strip() for line in text.strip().split("\n") if line.strip()]
        turns: List[DiarizedTurn] = []
        turn_idx = 0

        for line in lines:
            # Pattern 1: Rahul (02:15): text
            m1 = re.match(r'^([A-Za-z0-9\s\(\)]+?)\s*\(([\d:]+)\)\s*:\s*(.+)$', line)
            if m1:
                turns.append(DiarizedTurn(
                    turn_index=turn_idx,
                    speaker=m1.group(1).strip(),
                    timestamp=m1.group(2).strip(),
                    text=m1.group(3).strip()
                ))
                turn_idx += 1
                continue

            # Pattern 2: [02:15] Rahul: text
            m2 = re.match(r'^\[([\d:]+)\]\s*([A-Za-z0-9\s\(\)]+?)\s*:\s*(.+)$', line)
            if m2:
                turns.append(DiarizedTurn(
                    turn_index=turn_idx,
                    speaker=m2.group(2).strip(),
                    timestamp=m2.group(1).strip(),
                    text=m2.group(3).strip()
                ))
                turn_idx += 1
                continue

            # Pattern 3: Rahul: text
            m3 = re.match(r'^([A-Za-z0-9\s]+?)\s*:\s*(.+)$', line)
            if m3:
                turns.append(DiarizedTurn(
                    turn_index=turn_idx,
                    speaker=m3.group(1).strip(),
                    timestamp=f"0{turn_idx}:15",
                    text=m3.group(2).strip()
                ))
                turn_idx += 1
                continue

            # Generic fallback if no speaker marker
            turns.append(DiarizedTurn(
                turn_index=turn_idx,
                speaker=f"Speaker",
                timestamp=f"0{turn_idx}:00",
                text=line
            ))
            turn_idx += 1

        return turns

    async def transcribe_audio_with_gemini(self, audio_bytes: bytes, mime_type: str = "audio/wav") -> List[DiarizedTurn]:
        """
        Transcribes raw audio recording directly using Gemini Multimodal Audio API.
        Performs automatic speaker diarization and timestamping.
        """
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is required for real-time audio transcription.")

        b64_audio = base64.b64encode(audio_bytes).decode('utf-8')
        prompt = """
You are an expert audio transcription and diarization system.
Listen to this meeting recording carefully. 
Transcribe the speech and attribute each turn to the speaker with timestamps.
Format your output strictly as:
Speaker Name (MM:SS): Utterance

Example:
Alex (Tech Lead) (01:10): We chose PostgreSQL for our database architecture.
Rahul (Backend) (02:30): I will finish the Auth API by Thursday.
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": b64_audio}}
                ]
            }]
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                return self.parse_raw_text(raw_text)
            else:
                raise Exception(f"Gemini Audio Transcription API returned status {res.status_code}: {res.text}")

    async def extract_items(
        self,
        turns: List[DiarizedTurn],
        meeting_id: str
    ) -> Tuple[List[ExtractedDecision], List[ExtractedActionItem]]:
        if self.api_key:
            try:
                decisions, actions = await self._call_gemini_extractor(turns, meeting_id)
                if decisions or actions:
                    return decisions, actions
            except Exception:
                pass # Fall back to rule-based parser on any exception

        return self._heuristic_extractor(turns, meeting_id)

    def _heuristic_extractor(
        self,
        turns: List[DiarizedTurn],
        meeting_id: str
    ) -> Tuple[List[ExtractedDecision], List[ExtractedActionItem]]:
        decisions: List[ExtractedDecision] = []
        action_items: List[ExtractedActionItem] = []

        decision_patterns = [
            (r'\b(?:we chose|we decided|let\'s agree|agreed on|we are adopting|we will use|decision is|standardize on)\b\s*(.+)', "Architecture"),
            (r'\b(?:migrate to|drop|switch to|stick with|sticking with)\b\s*(.+)', "Database Architecture"),
            (r'\b(?:freeze|release|launch date|deadline is set for|scheduled for)\b\s*(.+)', "Release Timeline"),
            (r'\b(?:policy|pricing is|no longer allow|team policy)\b\s*(.+)', "Company Policy")
        ]

        action_patterns = [
            r'\b(?:i will|i\'ll|i can|will handle|taking ownership of|i am building|i\'ll finish|assigned to)\b\s*(.+)',
            r'\b(?:please finish|can you finish|take lead on|action item:)\b\s*(.+)'
        ]

        deadline_regex = r'\b(?:by|before|on|until)\s+([A-Za-z0-9\s,]*?(?:th|st|nd|rd|\d{4}|tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|october|november|december))\b'

        for turn in turns:
            text = turn.text
            speaker = turn.speaker

            # 1. Check for Decisions
            for pat, default_topic in decision_patterns:
                m = re.search(pat, text, re.IGNORECASE)
                if m:
                    topic = default_topic
                    stmt = text
                    t_lower = text.lower()
                    if "postgres" in t_lower or "mongo" in t_lower or "database" in t_lower:
                        topic = "Database Architecture"
                    elif "release" in t_lower or "freeze" in t_lower or "launch" in t_lower or "date" in t_lower:
                        topic = "Release Timeline"
                    elif "auth" in t_lower or "security" in t_lower:
                        topic = "Auth & Security"
                    
                    decisions.append(ExtractedDecision(
                        id=f"dec_{uuid.uuid4().hex[:8]}",
                        meeting_id=meeting_id,
                        topic=topic,
                        statement=stmt,
                        speaker=speaker,
                        turn_index=turn.turn_index,
                        verbatim_quote=text,
                        status=DecisionStatus.ACTIVE
                    ))
                    break

            # 2. Check for Action Items
            for pat in action_patterns:
                m = re.search(pat, text, re.IGNORECASE)
                if m:
                    deadline = None
                    dm = re.search(deadline_regex, text, re.IGNORECASE)
                    if dm:
                        deadline = dm.group(1).strip()
                    else:
                        deadline = "Next Sprint"

                    assignee = speaker.split("(")[0].strip()
                    task_desc = text
                    if len(task_desc) > 90:
                        task_desc = task_desc[:87] + "..."

                    action_items.append(ExtractedActionItem(
                        id=f"act_{uuid.uuid4().hex[:8]}",
                        meeting_id=meeting_id,
                        task=task_desc,
                        assignee=assignee,
                        deadline=deadline,
                        priority="high" if "freeze" in text.lower() or "urgent" in text.lower() else "medium",
                        turn_index=turn.turn_index,
                        verbatim_quote=text,
                        is_approved=True
                    ))
                    break

        return decisions, action_items

    async def _call_gemini_extractor(
        self,
        turns: List[DiarizedTurn],
        meeting_id: str
    ) -> Tuple[List[ExtractedDecision], List[ExtractedActionItem]]:
        transcript_formatted = "\n".join([
            f"[{t.turn_index}] {t.speaker} ({t.timestamp}): {t.text}" for t in turns
        ])

        prompt = f"""
You are an expert executive meeting parser.
Analyze the following diarized transcript and extract:
1. DECISIONS: Concrete team agreements, architectural choices, policy consensus, or milestone freeze dates.
2. ACTION ITEMS: Explicit obligations and tasks assigned to individuals, with deadlines and priority.

For each item, you must include the exact `turn_index` and `verbatim_quote` from the transcript.

TRANSCRIPT:
{transcript_formatted}

Respond ONLY with valid JSON in this format:
{{
  "decisions": [
    {{
      "topic": "Architecture | Auth | Release Timeline | Database | etc",
      "statement": "Canonical 1-sentence statement of decision",
      "speaker": "Name of speaker who declared/proposed it",
      "turn_index": 0,
      "verbatim_quote": "Exact spoken quote"
    }}
  ],
  "action_items": [
    {{
      "task": "Actionable task summary",
      "assignee": "Person responsible",
      "deadline": "ISO date or relative date mentioned (e.g. 'Thursday' or '2026-11-15')",
      "priority": "low" | "medium" | "high" | "urgent",
      "turn_index": 1,
      "verbatim_quote": "Exact spoken quote"
    }}
  ]
}}
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }
        async with httpx.AsyncClient(timeout=25.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                
                decisions = [
                    ExtractedDecision(
                        id=f"dec_{uuid.uuid4().hex[:8]}",
                        meeting_id=meeting_id,
                        topic=d["topic"],
                        statement=d["statement"],
                        speaker=d["speaker"],
                        turn_index=d["turn_index"],
                        verbatim_quote=d["verbatim_quote"],
                        status=DecisionStatus.ACTIVE
                    ) for d in parsed.get("decisions", [])
                ]

                action_items = [
                    ExtractedActionItem(
                        id=f"act_{uuid.uuid4().hex[:8]}",
                        meeting_id=meeting_id,
                        task=a["task"],
                        assignee=a["assignee"],
                        deadline=a.get("deadline", "Next Sprint"),
                        priority=a.get("priority", "medium"),
                        turn_index=a["turn_index"],
                        verbatim_quote=a["verbatim_quote"],
                        is_approved=True
                    ) for a in parsed.get("action_items", [])
                ]
                return decisions, action_items

        return [], []

extractor_service = ExtractorService()
