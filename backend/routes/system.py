import os
from fastapi import APIRouter
import schemas

router = APIRouter(prefix="/system", tags=["System"])

@router.get("/announcement", response_model=schemas.AnnouncementResponse)
def get_announcement():
    # Lets whoever runs this deploy broadcast a banner (exam dates, an
    # outage, a deadline) by setting two env vars and restarting the
    # backend — no frontend code change or redeploy needed. The frontend
    # keys its "already dismissed" check on ANNOUNCEMENT_ID specifically, so
    # bumping the id is how a new message shows up even if the last one was
    # dismissed; leaving it means an edited message alone won't re-surface.
    return schemas.AnnouncementResponse(
        id=os.getenv("ANNOUNCEMENT_ID"),
        message=os.getenv("ANNOUNCEMENT_MESSAGE"),
    )
