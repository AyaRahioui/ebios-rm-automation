import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import engine as async_engine

from app.models.atelier1 import CritereImpact


async def seed_criteres_impact():
    """Seed default critere_impact data."""
    
    criteres_data = [
        {
            "nom": "Humain",
            "description": "Impact sur les personnes (santé, sécurité, bien-être)"
        },
        {
            "nom": "Financier",
            "description": "Impact économique (perte de revenus, coûts, amendes)"
        },
        {
            "nom": "Juridique/Réglementaire",
            "description": "Impact légal et réglementaire (non-conformité, sanctions)"
        },
        {
            "nom": "Image/Réputation",
            "description": "Impact sur la réputation et la confiance des parties prenantes"
        },
        {
            "nom": "Opérationnel",
            "description": "Impact sur les opérations et la continuité de service"
        },
        {
            "nom": "Environnemental",
            "description": "Impact sur l'environnement et le développement durable"
        }
    ]
    
    async with AsyncSession(async_engine) as session:
        # Check if criteres already exist
        from sqlalchemy import select, func
        result = await session.execute(select(func.count()).select_from(CritereImpact))
        count = result.scalar()
        
        if count > 0:
            print(f"Skipping seed: {count} critere_impact records already exist")
            return
        
        # Insert criteres
        for critere_data in criteres_data:
            critere = CritereImpact(**critere_data)
            session.add(critere)
        
        await session.commit()
        print(f"Successfully seeded {len(criteres_data)} critere_impact records")


if __name__ == "__main__":
    asyncio.run(seed_criteres_impact())
