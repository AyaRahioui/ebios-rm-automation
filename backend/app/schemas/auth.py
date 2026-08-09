from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class AcceptInvitationRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8)


class AcceptInvitationBodyRequest(BaseModel):
    password: str = Field(..., min_length=8)



class InvitationVerifyResponse(BaseModel):
    valid: bool
    email: Optional[str] = None
    role: Optional[str] = None
    expires_at: Optional[str] = None
