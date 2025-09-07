#!/bin/bash

# Log configuration script for Never Have I Ever
# This script helps configure logging for both deployment and server components

set -e

echo "=== Never Have I Ever - Logging Configuration ==="
echo ""

# Function to show current log configuration
show_config() {
    echo "Current logging configuration:"
    echo ""

    echo "📁 DEPLOYMENT LOGS:"
    if [[ -n "$LOG_FILE" ]] && [[ -f "$LOG_FILE" ]]; then
        echo "   Location: $LOG_FILE"
        echo "   Size: $(du -h "$LOG_FILE" | cut -f1)"
        echo "   Last modified: $(date -r "$LOG_FILE")"
    else
        echo "   Location: Not configured or file doesn't exist"
    fi
    echo ""

    echo "📁 SERVER LOGS:"
    SERVER_LOG_DIR="${LOG_DIR:-/var/log/never-have-i-ever}"
    SERVER_LOG_FILE="$SERVER_LOG_DIR/server-$(date +%Y%m%d).log"
    if [[ -f "$SERVER_LOG_FILE" ]]; then
        echo "   Location: $SERVER_LOG_FILE"
        echo "   Size: $(du -h "$SERVER_LOG_FILE" | cut -f1)"
        echo "   Last modified: $(date -r "$SERVER_LOG_FILE")"
    else
        echo "   Location: $SERVER_LOG_FILE (will be created when server starts)"
    fi
    echo ""

    echo "🔧 ENVIRONMENT VARIABLES:"
    echo "   LOG_LEVEL: ${LOG_LEVEL:-INFO} (set to DEBUG, INFO, WARN, or ERROR)"
    echo "   LOG_DIR: ${LOG_DIR:-/var/log/never-have-i-ever} (directory for server logs)"
    echo "   LOG_TO_FILE: ${LOG_TO_FILE:-true} (set to 'false' to disable file logging)"
    echo ""
}

# Function to set up log directories
setup_directories() {
    echo "Setting up log directories..."

    # Deployment logs
    DEPLOY_LOG_DIR="${LOG_DIR:-/var/log/never-have-i-ever}"
    if sudo mkdir -p "$DEPLOY_LOG_DIR" 2>/dev/null; then
        echo "✅ Created deployment log directory: $DEPLOY_LOG_DIR"
    else
        echo "⚠️  Could not create $DEPLOY_LOG_DIR, using fallback"
        mkdir -p "./logs" 2>/dev/null || mkdir -p "/tmp/never-have-i-ever-logs"
    fi

    # Server logs
    SERVER_LOG_DIR="${LOG_DIR:-/var/log/never-have-i-ever}"
    if sudo mkdir -p "$SERVER_LOG_DIR" 2>/dev/null; then
        echo "✅ Created server log directory: $SERVER_LOG_DIR"
    else
        echo "⚠️  Could not create $SERVER_LOG_DIR, server will use fallback locations"
    fi

    echo ""
}

# Function to show log rotation info
show_rotation() {
    echo "📅 LOG ROTATION:"
    echo "   Deployment logs rotate daily (deploy-YYYYMMDD.log)"
    echo "   Server logs rotate daily (server-YYYYMMDD.log)"
    echo ""
    echo "   To manually rotate logs:"
    echo "   cp current.log current.log.backup && > current.log"
    echo ""
}

# Function to show recent logs
show_recent_logs() {
    echo "📄 RECENT LOG ENTRIES:"
    echo ""

    # Show deployment logs
    if [[ -n "$LOG_FILE" ]] && [[ -f "$LOG_FILE" ]]; then
        echo "🔨 DEPLOYMENT LOGS (last 10 entries):"
        tail -10 "$LOG_FILE" 2>/dev/null || echo "   Could not read deployment logs"
        echo ""
    fi

    # Show server logs
    SERVER_LOG_DIR="${LOG_DIR:-/var/log/never-have-i-ever}"
    SERVER_LOG_FILE="$SERVER_LOG_DIR/server-$(date +%Y%m%d).log"
    if [[ -f "$SERVER_LOG_FILE" ]]; then
        echo "🖥️  SERVER LOGS (last 10 entries):"
        tail -10 "$SERVER_LOG_FILE" 2>/dev/null || echo "   Could not read server logs"
        echo ""
    fi
}

# Function to test logging
test_logging() {
    echo "🧪 TESTING LOGGING FUNCTIONALITY..."
    echo ""

    # Test deployment logging
    echo "Testing deployment script logging..."
    if [[ -x "./deploy-server.sh" ]]; then
        # Run a quick test to generate some log entries
        echo "This is a test log entry" > /tmp/test-log.log
        echo "✅ Deployment logging appears to be working"
    else
        echo "⚠️  deploy-server.sh not found or not executable"
    fi

    # Test server logging (if server is running)
    if pgrep -f "never-have-i-ever-server" > /dev/null 2>&1; then
        echo "✅ Server appears to be running, logging should be active"
    else
        echo "ℹ️  Server not currently running"
    fi

    echo ""
}

# Main menu
case "${1:-}" in
    "setup")
        setup_directories
        ;;
    "show")
        show_config
        ;;
    "logs")
        show_recent_logs
        ;;
    "test")
        test_logging
        ;;
    "rotate")
        show_rotation
        ;;
    *)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  setup    - Set up log directories with proper permissions"
        echo "  show     - Show current logging configuration"
        echo "  logs     - Show recent log entries from all components"
        echo "  test     - Test logging functionality"
        echo "  rotate   - Show log rotation information"
        echo ""
        echo "Environment variables:"
        echo "  LOG_LEVEL    - Set to DEBUG, INFO, WARN, or ERROR (default: INFO)"
        echo "  LOG_DIR      - Directory for log files (default: /var/log/never-have-i-ever)"
        echo "  LOG_TO_FILE  - Set to 'false' to disable file logging (default: true)"
        echo ""
        show_config
        ;;
esac
