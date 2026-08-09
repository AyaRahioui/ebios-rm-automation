import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole, UserStatus
from app.core.security import get_password_hash
from app.core.config import settings


async def seed_admin():
    """Create initial admin user if none exists."""
    async with AsyncSessionLocal() as db:
        # Check if admin already exists
        result = await db.execute(
            select(User).where(User.role == UserRole.ADMIN)
        )
        admin = result.scalar_one_or_none()
        
        if admin:
            print(f"Admin user already exists: {admin.email}")
            return
        
        # Create admin user
        admin_user = User(
            email=settings.admin_email,
            hashed_password=get_password_hash(settings.admin_password),
            first_name="Admin",
            last_name="System",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        
        db.add(admin_user)
        await db.commit()
        
        print(f"Admin user created successfully: {settings.admin_email}")
        print(f"Password: {settings.admin_password}")
        print("Please change the password after first login!")


if __name__ == "__main__":
    asyncio.run(seed_admin())
