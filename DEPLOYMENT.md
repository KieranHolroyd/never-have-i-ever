# Server Deployment Guide

This guide explains how to deploy the Never Have I Ever server to an Ubuntu machine with Docker.

## Prerequisites

- Ubuntu machine with Docker installed
- SSH access to the server
- Git repository access
- Axiom account (for logging) - optional but recommended

## Quick Deployment

1. **Copy the deployment script to your server:**
   ```bash
   scp deploy-server.sh user@your-server:/home/user/
   ```

2. **SSH into your server and run the script:**
   ```bash
   ssh user@your-server
   ./deploy-server.sh
   ```

3. **Configure environment variables:**
   The script will create a `.env` file that you'll need to edit with your Axiom credentials:
   ```bash
   nano /opt/never-have-i-ever-server/server/.env
   ```

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

# Clean up Docker system
./deploy-server.sh cleanup
```

## What the Script Does

1. **Prerequisites Check**: Verifies Docker, Docker Compose, and git are installed
2. **Directory Setup**: Creates necessary directories with proper permissions
3. **Code Deployment**: Clones or updates the repository
4. **Environment Setup**: Creates `.env` file for configuration
5. **Docker Deployment**: Builds and starts the containers
6. **Firewall Configuration**: Opens necessary ports
7. **Status Check**: Shows deployment status and logs

## Configuration

### Environment Variables
Edit `/opt/never-have-i-ever-server/server/.env`:
```bash
AXIOM_TOKEN=your-axiom-token-here
AXIOM_ORG_ID=your-axiom-org-id-here
```

### Ports
- **3000**: Main application port
- **6379**: Redis port (internal use)

## Directory Structure
```
/opt/never-have-i-ever-server/     # Application code
/var/gamedata/                     # Game data persistence
/var/dockerdata/                   # Redis data persistence
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
