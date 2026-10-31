import math
import re
import hashlib
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings
from app.database import db

class MemoryService:
    def __init__(self):
        pass

    @property
    def api_key(self):
        return settings.GEMINI_API_KEY

    def _normalize_vector(self, vec: List[float]) -> List[float]:
        norm = math.sqrt(sum(x * x for x in vec))
        if norm == 0:
            return vec
        return [x / norm for x in vec]

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return max(0.0, min(1.0, dot / (norm1 * norm2)))

    def _fallback_embedding(self, text: str, dim: int = 128) -> List[float]:
        """
        Deterministic semantic projection fallback for offline execution.
        Uses character n-grams and token hashing to generate dense normalized vectors.
        Preserves similarity across semantically related vocabulary.
        """
        tokens = re.findall(r'\b\w+\b', text.lower())
        vec = [0.0] * dim
        for token in tokens:
            # Hash token to dimension index
            h = int(hashlib.sha256(token.encode('utf-8')).hexdigest(), 16)
            idx = h % dim
            sign = 1.0 if (h >> 8) % 2 == 0 else -1.0
            vec[idx] += sign

            # Also add character 3-grams for morphological similarity
            for i in range(len(token) - 2):
                tri = token[i:i+3]
                h_tri = int(hashlib.md5(tri.encode('utf-8')).hexdigest(), 16)
                idx_tri = h_tri % dim
                vec[idx_tri] += 0.5

        return self._normalize_vector(vec)

    async def get_embedding(self, text: str) -> List[float]:
        if not self.api_key:
            return self._fallback_embedding(text)

        # Gemini API call if key is present
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.EMBEDDING_MODEL}:embedContent?key={self.api_key}"
            payload = {
                "model": f"models/{settings.EMBEDDING_MODEL}",
                "content": {"parts": [{"text": text}]}
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["embedding"]["values"]
        except Exception:
            pass # Fall back to local dense embedding on any error

        return self._fallback_embedding(text)

    async def search_similar_decisions(
        self,
        topic: str,
        statement: str,
        exclude_meeting_id: Optional[str] = None,
        top_k: int = 3,
        threshold: float = 0.50,
        workspace_id: str = "ws_default"
    ) -> List[Dict[str, Any]]:
        """
        Hybrid retrieval combining topic domain matching and dense semantic vector similarity.
        """
        query_text = f"Topic: {topic}. Statement: {statement}"
        query_vec = await self.get_embedding(query_text)
        
        past_decisions = db.get_all_active_decisions(exclude_meeting_id=exclude_meeting_id, workspace_id=workspace_id)
        scored_candidates = []

        for dec in past_decisions:
            dec_vec = dec.get("embedding")
            if not dec_vec:
                dec_text = f"Topic: {dec['topic']}. Statement: {dec['statement']}"
                dec_vec = await self.get_embedding(dec_text)
            
            sim = self._cosine_similarity(query_vec, dec_vec)
            
            # Boost score if topic names match exactly or partially
            topic_match = 0.0
            cand_topic = topic.lower().strip()
            hist_topic = dec["topic"].lower().strip()
            if cand_topic == hist_topic:
                topic_match = 0.25
            elif cand_topic in hist_topic or hist_topic in cand_topic:
                topic_match = 0.15

            combined_score = min(1.0, sim * 0.75 + topic_match)

            if combined_score >= threshold or topic_match > 0:
                dec_copy = dict(dec)
                dec_copy["similarity_score"] = round(combined_score, 3)
                scored_candidates.append(dec_copy)

        scored_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_candidates[:top_k]

memory_service = MemoryService()

