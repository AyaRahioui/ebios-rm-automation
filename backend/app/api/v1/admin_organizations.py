from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from app.db.session import get_db
from app.models.user import User
from app.models.organization import Organization
from app.core.dependencies import require_admin
from app.schemas.organization import OrganizationCreate, OrganizationUpdate, OrganizationResponse, OrganizationDetailResponse

router = APIRouter()


@router.post("/organizations", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new organization."""
    # Check if organization name already exists
    result = await db.execute(select(Organization).where(Organization.nom == org_data.nom))
    existing_org = result.scalar_one_or_none()
    
    if existing_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization with this name already exists"
        )
    
    new_org = Organization(
        nom=org_data.nom,
        secteur_activite=org_data.secteur_activite
    )
    db.add(new_org)
    await db.commit()
    await db.refresh(new_org)
    
    return new_org


@router.get("/organizations", response_model=list[OrganizationResponse])
async def list_organizations(
    search: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all organizations."""
    query = select(Organization)
    
    if search:
        query = query.where(
            or_(
                Organization.nom.ilike(f"%{search}%"),
                Organization.secteur_activite.ilike(f"%{search}%")
            )
        )
    
    query = query.order_by(Organization.nom)
    
    result = await db.execute(query)
    organizations = result.scalars().all()
    
    return organizations


@router.get("/organizations/{org_id}", response_model=OrganizationDetailResponse)
async def get_organization(
    org_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get organization by ID with associated users."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    organization = result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Get users in this organization
    users_result = await db.execute(
        select(User).where(User.organization_id == org_id)
    )
    users = users_result.scalars().all()
    
    # Convert users to simplified dict format
    users_data = [
        {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value,
            "status": user.status.value
        }
        for user in users
    ]
    
    return OrganizationDetailResponse(
        id=organization.id,
        nom=organization.nom,
        secteur_activite=organization.secteur_activite,
        created_at=organization.created_at,
        users=users_data
    )


@router.patch("/organizations/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: str,
    org_update: OrganizationUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update organization."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    organization = result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check if new name conflicts with existing organization
    if org_update.nom and org_update.nom != organization.nom:
        existing_result = await db.execute(
            select(Organization).where(Organization.nom == org_update.nom)
        )
        existing_org = existing_result.scalar_one_or_none()
        if existing_org:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization with this name already exists"
            )
    
    # Update fields
    update_data = org_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(organization, field, value)
    
    await db.commit()
    await db.refresh(organization)
    
    return organization
