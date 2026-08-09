from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.project_member import ProjectMemberStatus, ProjectRole

import uuid


class ProjectMemberBase(BaseModel):
    project_id: uuid.UUID
    user_id: uuid.UUID
    project_role: ProjectRole = ProjectRole.CONSULTANT

    status: ProjectMemberStatus = ProjectMemberStatus.PENDING



class ProjectMemberCreate(BaseModel):
    user_id: uuid.UUID


class ProjectMemberInDB(ProjectMemberBase):
    id: uuid.UUID
    invited_at: datetime
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectMemberResponse(ProjectMemberInDB):
    user_email: Optional[str] = None
    user_first_name: Optional[str] = None
    user_last_name: Optional[str] = None



class ProjectMemberListResponse(BaseModel):
    members: list[ProjectMemberResponse]
    total: int
