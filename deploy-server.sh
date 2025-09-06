#!/bin/bash

# Never Have I Ever - Server Deployment Script
# Deploys the server component to an Ubuntu machine with Docker

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables from .env file if it exists
if [[ -f ".env" ]]; then
    log_info "Loading environment variables from .env file..."
    set -a
    source .env
    set +a
fi

# Configuration (with defaults that can be overridden by .env)
PROJECT_NAME="${PROJECT_NAME:-never-have-i-ever-server}"
SERVER_DIR="${SERVER_DIR:-/opt/never-have-i-ever-server}"
DOCKER_COMPOSE_FILE="${DOCKER_COMPOSE_FILE:-docker-compose.yml}"
REPO_URL="${REPO_URL:-https://github.com/your-username/never-have-i-ever.git}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if running as root or with sudo
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root. Please run as a regular user with sudo access."
        exit 1
    fi

    # Check if sudo is available
    if ! command -v sudo &> /dev/null; then
        log_error "sudo is required but not installed."
        exit 1
    fi

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is required but not installed."
        exit 1
    fi

    # Check if Docker Compose is available (v2)
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is required but not installed."
        exit 1
    fi

    # Check if git is available
    if ! command -v git &> /dev/null; then
        log_error "git is required but not installed."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

setup_directories() {
    log_info "Setting up directories..."

    # Create server directory
    sudo mkdir -p "$SERVER_DIR"

    # Create data directories for persistent storage
    sudo mkdir -p /var/gamedata
    sudo mkdir -p /var/dockerdata

    # Set proper permissions
    sudo chown -R $USER:$USER "$SERVER_DIR"
    sudo chown -R $USER:$USER /var/gamedata
    sudo chown -R $USER:$USER /var/dockerdata

    log_success "Directories created and permissions set"
}

clone_or_update_repository() {
    log_info "Setting up application code..."

    if [[ -d "$SERVER_DIR/.git" ]]; then
        log_info "Repository already exists, pulling latest changes..."
        cd "$SERVER_DIR"
        git pull origin master
    else
        log_info "Cloning repository..."
        git clone "$REPO_URL" "$SERVER_DIR"
        cd "$SERVER_DIR"
    fi

    # Navigate to server directory
    cd server

    log_success "Repository ready"
}

setup_environment() {
    log_info "Setting up environment variables..."

    ENV_FILE="$SERVER_DIR/server/.env"

    if [[ ! -f "$ENV_FILE" ]]; then
        log_warning "Creating .env file. Please update with your actual values."

        cat > "$ENV_FILE" << EOF
# Axiom logging configuration
AXIOM_TOKEN=${AXIOM_TOKEN:-your-axiom-token-here}
AXIOM_ORG_ID=${AXIOM_ORG_ID:-your-axiom-org-id-here}

# Valkey configuration
VALKEY_URL=${VALKEY_URL:-valkey://cache:6379}

# Optional: Add other environment variables as needed
NODE_ENV=${NODE_ENV:-production}
EOF

        log_warning "Please edit $ENV_FILE with your actual Axiom credentials and other settings"
        echo "Press Enter to continue after updating the .env file..."
        read
    else
        log_info ".env file already exists"
    fi
}

build_and_deploy() {
    log_info "Building and deploying server..."

    cd "$SERVER_DIR/server"

    # Stop existing containers if running
    log_info "Stopping existing containers..."
    docker compose down || true

    # Build and start services
    log_info "Building Docker images..."
    docker compose build --no-cache

    log_info "Starting services..."
    docker compose up -d

    log_success "Server deployed successfully"
}

verify_data_loading() {
    log_info "Verifying data loading and Valkey storage..."

    cd "$SERVER_DIR/server"

    # Wait for services to be healthy
    log_info "Waiting for services to start..."
    sleep 10

    # Check if containers are running
    if ! docker compose ps | grep -q "Up"; then
        log_error "Services are not running properly"
        docker compose logs
        exit 1
    fi

    # Run load_data.ts to ensure SQLite database is populated
    log_info "Running load_data.ts to populate SQLite database..."
    if ! docker compose exec -T web bun run src/load_data.ts; then
        log_error "Failed to run load_data.ts"
        exit 1
    fi

    # Wait a moment for data to be processed
    sleep 2

    # Verify Valkey connection and data storage
    log_info "Verifying Valkey data storage..."
    VALKEY_CHECK=$(docker compose exec -T cache valkey-cli -h localhost -p 6379 EXISTS shared:questions_list)
    if [[ "$VALKEY_CHECK" != "1" ]]; then
        log_error "Questions data not found in Valkey at key 'shared:questions_list'"
        log_info "Checking Valkey contents..."
        docker compose exec -T cache valkey-cli -h localhost -p 6379 KEYS "*"
        exit 1
    fi

    # Verify the data structure in Valkey
    log_info "Verifying data structure in Valkey..."
    VALKEY_DATA=$(docker compose exec -T cache valkey-cli -h localhost -p 6379 GET shared:questions_list)
    if [[ -z "$VALKEY_DATA" ]]; then
        log_error "Questions data in Valkey is empty"
        exit 1
    fi

    # Basic JSON validation
    if ! echo "$VALKEY_DATA" | jq . >/dev/null 2>&1; then
        log_error "Questions data in Valkey is not valid JSON"
        exit 1
    fi

    # Check that we have categories in the data
    CATEGORY_COUNT=$(echo "$VALKEY_DATA" | jq 'keys | length')
    if [[ "$CATEGORY_COUNT" -lt 1 ]]; then
        log_error "No categories found in questions data"
        exit 1
    fi

    log_success "Data verification completed successfully"
    log_info "Found $CATEGORY_COUNT categories in the questions data"
}

setup_firewall() {
    log_info "Configuring firewall..."

    # Allow SSH (if not already allowed)
    sudo ufw allow ssh || true

    # Allow the application port
    sudo ufw allow 3000 || true

    # Allow Redis port (if needed externally)
    sudo ufw allow 6379 || true

    # Enable firewall if not already enabled
    sudo ufw --force enable || true

    log_success "Firewall configured"
}

show_status() {
    log_info "Checking deployment status..."

    cd "$SERVER_DIR/server"

    echo ""
    echo "=== Docker Containers ==="
    docker compose ps

    echo ""
    echo "=== Application Logs ==="
    docker compose logs --tail=20 web

    echo ""
    echo "=== Firewall Status ==="
    sudo ufw status

    echo ""
    log_success "Deployment completed!"
    log_info "Server should be accessible at http://your-server-ip:3000"
    log_info "To view logs: cd $SERVER_DIR/server && docker compose logs -f"
    log_info "To restart: cd $SERVER_DIR/server && docker compose restart"
    log_info "To stop: cd $SERVER_DIR/server && docker compose down"
}

cleanup() {
    log_info "Cleaning up Docker system..."
    docker system prune -f || true
}

main() {
    echo "========================================"
    echo "Never Have I Ever - Server Deployment"
    echo "========================================"

    check_prerequisites
    setup_directories
    clone_or_update_repository
    setup_environment
    build_and_deploy
    verify_data_loading
    setup_firewall
    show_status
    cleanup

    echo ""
    log_success "Deployment script completed successfully!"
}

# Handle command line arguments
case "${1:-}" in
    "stop")
        log_info "Stopping server..."
        cd "$SERVER_DIR/server" 2>/dev/null || { log_error "Server not found at $SERVER_DIR"; exit 1; }
        docker compose down
        log_success "Server stopped"
        ;;
    "restart")
        log_info "Restarting server..."
        cd "$SERVER_DIR/server" 2>/dev/null || { log_error "Server not found at $SERVER_DIR"; exit 1; }
        docker compose restart
        log_success "Server restarted"
        ;;
    "logs")
        log_info "Showing server logs..."
        cd "$SERVER_DIR/server" 2>/dev/null || { log_error "Server not found at $SERVER_DIR"; exit 1; }
        docker compose logs -f
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup
        log_success "Cleanup completed"
        ;;
    "verify-data")
        log_info "Running data verification..."
        cd "$SERVER_DIR/server" 2>/dev/null || { log_error "Server not found at $SERVER_DIR"; exit 1; }
        verify_data_loading
        ;;
    *)
        main
        ;;
esac
