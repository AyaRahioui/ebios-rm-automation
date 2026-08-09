from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import auth, admin_users, projects, missions, documents, notifications, atelier1, raci

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(admin_users.router, prefix="/api/v1/admin", tags=["Admin - Users"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(missions.router, prefix="/api/v1/missions", tags=["Missions"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(atelier1.router, prefix="/api/v1", tags=["Atelier 1"])
app.include_router(raci.router, prefix="/api/v1", tags=["RACI"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.app_version}


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs"
    }
