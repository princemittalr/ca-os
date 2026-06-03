#!/usr/bin/env bash
# ==============================================================================
# Reckon CA-OS Production Bootstrap Startup Script
# Zero-dependency launcher validation and containerization orchestrator.
# ==============================================================================

# Premium ANSI Color Codes for Stunning Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear
echo -e "${BOLD}${CYAN}"
echo "    ____  __________________  _   __   ___    ____"
echo "   / __ \/ ____/ ____/ ___/  / | / /  /   |  /  _/"
echo "  / /_/ / __/ / /    \__ \  /  |/ /  / /| |  / /  "
echo " / _, _/ /___/ /___ ___/ / / /|  /  / ___ |_/ /   "
echo "/_/ |_/_____/\____//____/ /_/ |_/  /_/  |_/___/   "
echo "                                                  "
echo -e "         Chartered Accountant Operating System    ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "${BOLD}${MAGENTA}[INFRASTRUCTURE CONTROL]${NC} Initializing startup sequence..."
echo -e "${BLUE}================================================================${NC}"

# Check for Docker installation
if ! command -v docker &> /dev/null; then
    echo -e "${BOLD}${RED}[ERROR] Docker is not installed on this system.${NC}"
    echo -e "Please install Docker and Docker Compose before running this bootstrap sequence."
    exit 1
fi

# Check for Docker Compose v2 (docker compose) or v1 (docker-compose)
DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${BOLD}${RED}[ERROR] Docker Compose utility is not found.${NC}"
    echo -e "Please ensure docker compose or docker-compose is in your PATH."
    exit 1
fi

echo -e "${BOLD}${GREEN}✓ Docker Environment Detected successfully!${NC}"
echo -e "${BOLD}${GREEN}✓ ${DOCKER_COMPOSE_CMD} ready for orchestrations.${NC}"

# Check for .env file, fallback if not found
if [ ! -f .env ]; then
    echo -e "${BOLD}${YELLOW}⚠️  No .env file discovered in root. Generating safe local fallback...${NC}"
    cat <<EOT > .env
# Reckon CA-OS System Configurations
ENV=production
SUPABASE_URL=mock_url
SUPABASE_ANON_KEY=mock_key
SUPABASE_SERVICE_ROLE_KEY=mock_key
GEMINI_API_KEY=mock_key
OPENAI_API_KEY=mock_key
EOT
    echo -e "${BOLD}${GREEN}✓ Generated standard .env file.${NC}"
fi

echo -e "${BLUE}----------------------------------------------------------------${NC}"
echo -e "${BOLD}${CYAN}[BUILD & DEPLOY]${NC} Compiling production container trees..."
echo -e "${BLUE}----------------------------------------------------------------${NC}"

# Execute orchestrator pipeline
${DOCKER_COMPOSE_CMD} up --build -d

if [ $? -eq 0 ]; then
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BOLD}${GREEN}🎉 RECKON CA-OS CONTAINERS LAUNCHED SUCCESSFULLY!${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo -e "👉 ${BOLD}Frontend Web Console:${NC} http://localhost:3000"
    echo -e "👉 ${BOLD}Backend REST API API:${NC} http://localhost:8000/api/health"
    echo -e "👉 ${BOLD}API Telemetry Feed:  ${NC} http://localhost:8000/api/status"
    echo -e ""
    echo -e "To view execution console logs, run: ${BOLD}${MAGENTA}${DOCKER_COMPOSE_CMD} logs -f${NC}"
    echo -e "To shutdown all execution pools, run: ${BOLD}${RED}${DOCKER_COMPOSE_CMD} down${NC}"
    echo -e "${BLUE}================================================================${NC}"
else
    echo -e "${BOLD}${RED}[ERROR] Docker Orchestration build failed.${NC}"
    echo -e "Please analyze log records and debug configurations."
    exit 1
fi
