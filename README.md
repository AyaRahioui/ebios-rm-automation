# EBIOS RM - Gestion des Risques

Application web de gestion de missions d'analyse de risques selon la méthode EBIOS RM.

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI avec support async
- **ORM**: SQLAlchemy 2.0 (style déclaratif `Mapped`/`mapped_column`)
- **Base de données**: PostgreSQL 15+ avec asyncpg
- **Migrations**: Alembic
- **Authentification**: JWT avec refresh tokens httpOnly
- **Sécurité**: Argon2 pour le hashing, rate limiting avec slowapi
- **Email**: Service abstrait avec implémentations console (dev) et SMTP (prod)

### Frontend (React)
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Routing**: React Router v6
- **Data Fetching**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Notifications**: sonner
- **Icons**: lucide-react

## 📋 Prérequis

- Python 3.11+
- PostgreSQL 15+
- Node.js 18+
- npm ou pnpm

## 🚀 Installation

### Backend

1. **Cloner le projet et naviguer vers le backend**
```bash
cd backend
```

2. **Créer un environnement virtuel**
```bash
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
```

3. **Installer les dépendances**
```bash
pip install -e .
```

4. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Éditez `.env` avec vos configuration:
```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/ebios_rm
DATABASE_URL_SYNC=postgresql://postgres:password@localhost:5432/ebios_rm
SECRET_KEY=votre-clé-secrète
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=votre-mot-de-passe
```

5. **Initialiser la base de données**
```bash
# Créer la base de données PostgreSQL
createdb ebios_rm

# Exécuter les migrations
alembic upgrade head

# Créer l'administrateur initial
python seed_admin.py
```

6. **Démarrer le serveur**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

L'API sera disponible sur http://localhost:8000
La documentation Swagger: http://localhost:8000/docs

### Frontend

1. **Naviguer vers le frontend**
```bash
cd frontend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Démarrer le serveur de développement**
```bash
npm run dev
```

L'application sera disponible sur http://localhost:5173

## 👥 Rôles et Permissions

| Rôle | Code | Permissions |
|------|-------|-------------|
| Administrateur | `ADMIN` | Gestion complète (utilisateurs, organisations, tous les projets) |
| Chef de projet | `CHEF_PROJET` | Création de projets, gestion d'équipe, invitation clients |
| Consultant | `CONSULTANT` | Acceptation/refus de missions, accès aux ateliers |
| Client | `CLIENT` | Accès à ses projets, dépôt de documents |

## 🔐 Sécurité

- Mots de passe hashés avec Argon2
- Tokens JWT signés avec clé secrète
- Tokens d'invitation et reset avec expiration
- Rate limiting sur les endpoints sensibles
- CORS restreint
- Refresh tokens stockés en cookies httpOnly secure

## 📁 Structure du Projet

```
ebios-rm/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Endpoints API
│   │   ├── core/            # Configuration, sécurité, dependencies
│   │   ├── db/              # Session et base SQLAlchemy
│   │   ├── models/          # Modèles SQLAlchemy 2.0
│   │   ├── schemas/         # Schémas Pydantic
│   │   ├── services/        # Services (email, notifications)
│   │   └── alembic/         # Migrations
│   ├── tests/               # Tests
│   ├── pyproject.toml       # Dépendances Python
│   ├── alembic.ini          # Configuration Alembic
│   └── seed_admin.py        # Script de création admin initial
└── frontend/
    ├── src/
    │   ├── api/             # Client API et hooks TanStack Query
    │   ├── components/      # Composants React (layout, ui)
    │   ├── pages/           # Pages de l'application
    │   ├── stores/          # État global (auth context)
    │   ├── types/           # Types TypeScript
    │   └── lib/             # Utilitaires
    ├── package.json         # Dépendances Node
    └── vite.config.ts       # Configuration Vite
```

## 🧪 Tests

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Tests RBAC

Les tests de sécurité sont situés dans `tests/test_rbac.py` et vérifient:
- Les rôles non autorisés ne peuvent pas accéder aux endpoints admin
- Les consultants ne peuvent pas créer de projets
- Les clients ne peuvent voir que leurs propres projets
- L'accès aux projets est correctement restreint

## 📚 API Documentation

Une fois le backend démarré, accédez à:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🔧 Développement

### Ajouter une nouvelle migration

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Générer un nouveau composant shadcn/ui

```bash
cd frontend
npx shadcn-ui@latest add [component-name]
```

## 🐛 Résolution de Problèmes

### Erreur de connexion PostgreSQL
Vérifiez que PostgreSQL est en cours d'exécution et que les identifiants dans `.env` sont corrects.

### Erreur de dépendances frontend
Supprimez `node_modules` et `package-lock.json`, puis réinstallez:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Tokens expirés
Les tokens d'invitation expirent après 72h, les tokens de reset après 2h. Régénérez-les via l'interface admin.

## 📝 Notes de Développement

- Les lint errors TypeScript dans le frontend sont normaux tant que les dépendances ne sont pas installées
- L'implémentation complète des ateliers EBIOS RM est prévue pour une itération future
- Les pages actuelles sont des placeholders fonctionnels avec la structure de base

## 🤝 Contribution

Ce projet suit les spécifications détaillées du cahier des charges. Toute modification doit respecter:
- La stack technique imposée
- Les règles de sécurité
- Les patterns RBAC existants

## 📄 Licence

Propriétaire - Projet EBIOS RM
