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
    x_user_id: Optional[str] = Header(None),
    x_workspace_id: Optional[str] = Header(None)
):
    """
    Returns the profile for the authenticated user session.
    Requires X-User-Id header from logged-in client.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in or register an account."
        )

    session = db.get_user_by_id(x_user_id)
    if not session:
        raise HTTPException(
            status_code=401,
            detail="Session not found. Please log in again."
        )

    active_ws = session["active_workspace"]
    if x_workspace_id:
        matching = next((w for w in session["workspaces"] if w["id"] == x_workspace_id), None)
        if matching:
            active_ws = matching

    return AuthResponse(
        access_token=f"tok_{x_user_id}",
        token_type="bearer",
        user=UserInfo(**session["user"]),
        active_workspace=WorkspaceInfo(**active_ws),
        workspaces=[WorkspaceInfo(**w) for w in session["workspaces"]]
    )

@router.post("/workspaces", response_model=WorkspaceInfo)
async def create_new_workspace(
    name: str,
    x_user_id: Optional[str] = Header("user_demo")
):
    ws = db.create_workspace(name, x_user_id or "user_demo")
    return WorkspaceInfo(**ws)

