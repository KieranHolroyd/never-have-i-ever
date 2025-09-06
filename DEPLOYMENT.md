# Server Deployment Guide

This guide explains how to deploy the Never Have I Ever server to an Ubuntu machine with Docker.

## Prerequisites

- Ubuntu machine with Docker installed
- SSH access to the server
- Git repository access
- Axiom account (for logging) - optional but recommended

## Quick Deployment

1. **Copy the deployment script and create configuration:**
   ```bash
   scp deploy-server.sh user@your-server:/home/user/
   scp deploy.env.example user@your-server:/home/user/.env
   ```

2. **Edit the .env file with your configuration:**
   ```bash
   nano .env  # Edit repository URL, server directory, and credentials
   ```

3. **SSH into your server and run the script:**
   ```bash
   ssh user@your-server
   ./deploy-server.sh
   ```

The script will automatically load variables from the `.env` file in its working directory.

## Script Usage

### Initial Deployment
```bash
./deploy-server.sh
```

### Management Commands
```bash
# Check server status
./deploy-server.sh status

# View logs
./deploy-server.sh logs

# Restart server
./deploy-server.sh restart

# Stop server
./deploy-server.sh stop

# Verify data loading and Valkey storage
./deploy-server.sh verify-data

# Clean up Docker system
./deploy-server.sh cleanup
```

## What the Script Does

1. **Prerequisites Check**: Verifies Docker, Docker Compose, and git are installed
2. **Directory Setup**: Creates necessary directories with proper permissions
3. **Code Deployment**: Clones or updates the repository
4. **Environment Setup**: Creates `.env` file for configuration
5. **Docker Deployment**: Builds and starts the containers
6. **Data Verification**: Ensures `load_data.ts` has run and data is stored in Valkey
7. **Firewall Configuration**: Opens necessary ports
8. **Status Check**: Shows deployment status and logs

## Configuration

### Deployment Script .env File
Create a `.env` file in the same directory as `deploy-server.sh` with the following variables:

```bash
# Project settings
PROJECT_NAME=never-have-i-ever-server
SERVER_DIR=/opt/never-have-i-ever-server
DOCKER_COMPOSE_FILE=docker-compose.yml

# Repository URL for cloning/updating the code
REPO_URL=https://github.com/your-username/never-have-i-ever.git

# Server environment variables (automatically written to server/.env)
AXIOM_TOKEN=your-axiom-token-here
AXIOM_ORG_ID=your-axiom-org-id-here
VALKEY_URL=valkey://cache:6379
NODE_ENV=production
```

### Server Environment Variables
The script will also create `/opt/never-have-i-ever-server/server/.env` with the server-specific variables. If you've already set them in the deployment `.env`, they'll be automatically populated.

### Ports
- **3000**: Main application port
- **6379**: Valkey port (internal use)

## Directory Structure
```
/opt/never-have-i-ever-server/     # Application code
/var/gamedata/                     # Game data persistence
/var/dockerdata/                   # Valkey data persistence
```

## Troubleshooting

### Check Container Status
```bash
cd /opt/never-have-i-ever-server/server
docker compose ps
```

### View Logs
```bash
cd /opt/never-have-i-ever-server/server
docker compose logs -f web
```

### Restart Services
```bash
cd /opt/never-have-i-ever-server/server
docker compose restart
```

### Update Deployment
```bash
cd /opt/never-have-i-ever-server/server
git pull origin master
docker compose build --no-cache
docker compose up -d
```

## Security Notes

- The script configures UFW firewall
- Data is persisted in `/var/gamedata/` and `/var/dockerdata/`
- Consider setting up SSL/TLS for production use
- Regularly update the server and Docker images

## Monitoring

The application uses Axiom for logging. Make sure to:
1. Set up your Axiom account
2. Configure the AXIOM_TOKEN and AXIOM_ORG_ID in the `.env` file
3. Monitor logs through the Axiom dashboard
