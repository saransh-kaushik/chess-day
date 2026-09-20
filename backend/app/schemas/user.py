"""
Pydantic schemas for User.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Request body for POST /auth/register."""

    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    """Request body for POST /auth/login."""

    username: str
    password: str


class UserOut(BaseModel):
    """Public representation of a registered user."""

    id: str
    username: str
    email: str | None
    is_guest: bool
    created_at: datetime
    last_seen: datetime

    model_config = {"from_attributes": True}


class GuestOut(BaseModel):
    """Response for POST /auth/guest."""

    guest_id: str
    guest_name: str
    access_token: str
    token_type: str = "bearer"


class Token(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
    user: UserOut
