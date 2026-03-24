#!/bin/bash

# CyberForge Setup Script
# Quick setup for local development

set -e  # Exit on error

echo "🚀 CyberForge Setup Script"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose installed${NC}"

# Setup environment
echo ""
echo -e "${BLUE}Setting up environment...${NC}"

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env from .env.example${NC}"
    echo -e "${BLUE}Please edit .env with your configuration${NC}"
else
    echo -e "${GREEN}✓ .env already exists${NC}"
fi

# Generate secrets if needed
if grep -q "your-secret" .env; then
    echo ""
    echo -e "${BLUE}Generating secrets...${NC}"
    
    JWT_SECRET=$(openssl rand -base64 32)
    REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)
    DATA_KEY_ENCRYPTION_KEY=$(openssl rand -base64 32)
    
    # Update .env (platform-aware)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|your-secret-key-min-32-chars-long|$JWT_SECRET|g" .env
        sed -i '' "s|dGVzdF9lbmNyeXB0aW9uX2tleV8zMl9ieXRlc19sb25nX18=|$DATA_KEY_ENCRYPTION_KEY|g" .env
    else
        sed -i "s|your-secret-key-min-32-chars-long|$JWT_SECRET|g" .env
        sed -i "s|dGVzdF9lbmNyeXB0aW9uX2tleV8zMl9ieXRlc19sb25nX18=|$DATA_KEY_ENCRYPTION_KEY|g" .env
    fi
    
    echo -e "${GREEN}✓ Secrets generated${NC}"
fi

# Create SSL certificates if they don't exist
echo ""
echo -e "${BLUE}Checking SSL certificates...${NC}"

if [ ! -f infra/ssl/cert.pem ] || [ ! -f infra/ssl/key.pem ]; then
    echo "Generating self-signed certificates..."
    mkdir -p infra/ssl
    openssl req -x509 -newkey rsa:4096 \
        -keyout infra/ssl/key.pem \
        -out infra/ssl/cert.pem \
        -days 365 -nodes \
        -subj "/C=US/ST=State/L=City/O=CyberForge/CN=localhost"
    echo -e "${GREEN}✓ SSL certificates generated${NC}"
else
    echo -e "${GREEN}✓ SSL certificates already exist${NC}"
fi

# Start Docker services
echo ""
echo -e "${BLUE}Starting Docker services...${NC}"
docker compose up -d
echo -e "${GREEN}✓ Services started${NC}"

# Wait for services to be healthy
echo ""
echo -e "${BLUE}Waiting for services to be ready...${NC}"

# Function to check if service is healthy
check_health() {
    local service=$1
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose exec -T $service curl -f http://localhost:3000/health &> /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service is healthy${NC}"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 2
    done
    
    echo -e "${RED}✗ $service failed to become healthy${NC}"
    return 1
}

# Wait for database
echo "Waiting for database..."
for i in {1..30}; do
    if docker compose exec -T db pg_isready -U cyberforge &> /dev/null; then
        echo -e "${GREEN}✓ Database is ready${NC}"
        break
    fi
    sleep 1
done

# Wait for API
echo "Waiting for API..."
for i in {1..30}; do
    if docker compose exec -T api curl -f http://localhost:3000/health &> /dev/null; then
        echo -e "${GREEN}✓ API is ready${NC}"
        break
    fi
    sleep 1
done

# Run migrations
echo ""
echo -e "${BLUE}Running database migrations...${NC}"
docker compose exec -T api npx prisma migrate deploy
echo -e "${GREEN}✓ Migrations completed${NC}"

# Seed database
echo ""
echo -e "${BLUE}Seeding database with demo data...${NC}"
SEED_OUTPUT=$(docker compose exec -T api npm run seed 2>&1)
echo "$SEED_OUTPUT"
echo -e "${GREEN}✓ Database seeded${NC}"

# Print summary
echo ""
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo "🌐 Access the application:"
echo "  - Web UI: http://localhost:3001"
echo "  - API: http://localhost:3000"
echo "  - API Docs: http://localhost:3000/api"
echo ""
echo "🔑 Default credentials:"
echo "  - Email: admin@cyberforge.local"
echo "  - Password: (check console output above)"
echo ""
echo "📚 Documentation:"
echo "  - README: ./README.md"
echo "  - Quick Reference: ./QUICK_REFERENCE.md"
echo "  - Deployment: ./docs/DEPLOYMENT.md"
echo ""
echo "🛑 To stop services:"
echo "  - docker compose down"
echo ""
echo "📊 To view logs:"
echo "  - docker compose logs -f api"
echo "  - docker compose logs -f web"
echo ""
