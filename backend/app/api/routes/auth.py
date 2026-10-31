import uuid
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional, List, Dict, Any
from app.database import db
from app.schemas.payloads import (
    UserRegisterRequest,
    UserLoginRequest,
    AuthResponse,
    UserInfo,
    WorkspaceInfo
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & Multi-Tenancy"])

@router.post("/register", response_model=AuthResponse)
async def register(payload: UserRegisterRequest):
    try:
        created = db.create_user(
            email=payload.email,
            name=payload.name,
            password=payload.password,
            org_name=payload.organization_name or "Engineering Org"
        )
        token = f"tok_{uuid.uuid4().hex}"
        return AuthResponse(
            access_token=token,
            token_type="bearer",
            user=UserInfo(**created["user"]),
            active_workspace=WorkspaceInfo(**created["active_workspace"]),
            workspaces=[WorkspaceInfo(**w) for w in created["workspaces"]]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLoginRequest):
    user_session = db.verify_user(payload.email, payload.password)
    if not user_session:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = f"tok_{uuid.uuid4().hex}"
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserInfo(**user_session["user"]),
        active_workspace=WorkspaceInfo(**user_session["active_workspace"]),
        workspaces=[WorkspaceInfo(**w) for w in user_session["workspaces"]]
    )

@router.get("/me", response_model=AuthResponse)
async def get_current_user_profile(
    x_workspace_id: Optional[str] = Header("ws_default")
):
    """
    Returns current profile. Defaults to pre-seeded enterprise architect demo account.
    """
    # Demo profile fallback
    workspaces = [
        WorkspaceInfo(id="ws_default", name="Core Engineering Team", slug="core-eng", role="admin")
    ]
    user_info = UserInfo(
        id="user_demo",
        email="demo@syncstate.io",
        name="Abhinava K (Architect)",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
    )

    active_ws = next((w for w in workspaces if w.id == x_workspace_id), workspaces[0])

    return AuthResponse(
        access_token="tok_demo_active_session",
        token_type="bearer",
        user=user_info,
        active_workspace=active_ws,
        workspaces=workspaces
    )

@router.post("/workspaces", response_model=WorkspaceInfo)
async def create_new_workspace(
    name: str,
    x_user_id: Optional[str] = Header("user_demo")
):
    ws = db.create_workspace(name, x_user_id or "user_demo")
    return WorkspaceInfo(**ws)

