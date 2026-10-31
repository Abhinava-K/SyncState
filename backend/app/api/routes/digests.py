from fastapi import APIRouter
from app.schemas.payloads import WeeklyDigestResponse
from app.services.digest_service import digest_service

router = APIRouter(prefix="/api/digests", tags=["Digests & Reminders"])

@router.get("/weekly", response_model=WeeklyDigestResponse)
async def get_weekly_digest():
    """
    Returns weekly digest grouped by person with upcoming reminders, active commitments, and decisions led.
    """
    return digest_service.generate_weekly_digest()

@router.get("/reminders")
async def get_deadline_reminders():
    """
    Returns all upcoming deadlines tagged with 24h / 48h urgency.
    """
    digest = digest_service.generate_weekly_digest()
    all_reminders = []
    for member in digest.members:
        for rem in member.reminders:
            if rem.urgency in ["critical_24h", "upcoming_48h"]:
                all_reminders.append(rem)
    return {"reminders": all_reminders, "count": len(all_reminders)}

