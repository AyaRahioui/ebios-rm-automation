FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml first for better caching
COPY pyproject.toml ./

# Install dependencies
RUN pip install --no-cache-dir -e .

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Run migrations, seed data, and start server
CMD ["sh", "-c", "alembic upgrade head && python seed_admin.py && python seed_criteres_impact.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
