# Logging Configuration

This document describes the logging setup for the Never Have I Ever application, which outputs logs to both stdout and files for better debugging and monitoring.

## Overview

The application uses a dual logging system:
- **Console Output**: Colored logs to stdout/stderr for development and immediate feedback
- **File Output**: Structured logs to files for long-term storage and analysis

## Components

### 1. Server Application Logging

**Location**: Configurable via `LOG_DIR` environment variable
- Default: `/var/log/never-have-i-ever/`
- Fallback: `./logs/` or `/tmp/`

**Files**:
- `server-YYYYMMDD.log`: Daily server logs
- Logs rotate automatically each day

**Configuration**:
```bash
# Environment variables
LOG_LEVEL=INFO          # DEBUG, INFO, WARN, ERROR
LOG_DIR=/var/log/never-have-i-ever
LOG_TO_FILE=true        # Set to 'false' to disable file logging
```

**Log Levels**:
- `ERROR`: Critical errors that need immediate attention
- `WARN`: Warning conditions that should be reviewed
- `INFO`: General information about application operation
- `DEBUG`: Detailed debugging information

### 2. Deployment Script Logging

**Location**: Same as server logs or `./logs/`
- Default: `/var/log/never-have-i-ever/deploy-YYYYMMDD.log`
- Fallback: `./logs/deploy-YYYYMMDD.log` or `/tmp/deploy-YYYYMMDD.log`

**Features**:
- Automatic directory creation with fallbacks
- Colored console output with timestamps
- Structured file output with log levels
- Works with nginx user permissions

## Log Format

### Console Output
```
[INFO] Server running at http://localhost:3000/
[ERROR] Failed to start deployment: spawn ./deploy-server.sh ENOENT
```

### File Output
```
[2024-01-15 14:30:25] [INFO] Server running at http://localhost:3000/
[2024-01-15 14:30:26] [INFO] Log level: INFO
[2024-01-15 14:30:26] [INFO] Server logs are being written to: /var/log/never-have-i-ever/server-20240115.log
[2024-01-15 14:35:12] [ERROR] Failed to start deployment: spawn ./deploy-server.sh ENOENT
```

## Usage

### Managing Logs

Use the log configuration script:

```bash
# Show current configuration
./log-config.sh show

# Set up log directories
./log-config.sh setup

# View recent log entries
./log-config.sh logs

# Test logging functionality
./log-config.sh test

# Show log rotation information
./log-config.sh rotate
```

### Manual Log Inspection

```bash
# View server logs
tail -f /var/log/never-have-i-ever/server-$(date +%Y%m%d).log

# View deployment logs
tail -f /var/log/never-have-i-ever/deploy-$(date +%Y%m%d).log

# Search for errors
grep "ERROR" /var/log/never-have-i-ever/server-$(date +%Y%m%d).log

# View logs with timestamps
less /var/log/never-have-i-ever/server-$(date +%Y%m%d).log
```

### Docker Log Inspection

```bash
# View container logs
docker compose logs -f web

# View specific service logs
docker compose logs -f valkey

# Export logs
docker compose logs > container-logs.txt
```

## Log Rotation

- **Automatic**: Daily rotation based on date
- **Manual**: Copy current log and truncate:
  ```bash
  cp server-20240115.log server-20240115.log.backup
  > server-20240115.log
  ```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   sudo mkdir -p /var/log/never-have-i-ever
   sudo chown -R $USER:$USER /var/log/never-have-i-ever
   ```

2. **Logs Not Writing**
   - Check `LOG_TO_FILE` environment variable
   - Verify log directory permissions
   - Check available disk space

3. **Nginx User Issues**
   - The deployment script automatically handles nginx user permissions
   - Falls back to user-writable directories if needed

### Log Analysis

```bash
# Count errors by hour
grep "ERROR" server.log | cut -d' ' -f2 | cut -d':' -f1 | sort | uniq -c

# Find slow operations (if timing logs are added)
grep "duration" server.log | sort -k3 -n

# Monitor deployment success rate
grep "Deployment completed successfully\|Deployment failed" deploy.log
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Minimum log level to output |
| `LOG_DIR` | `/var/log/never-have-i-ever` | Directory for log files |
| `LOG_TO_FILE` | `true` | Enable/disable file logging |
| `LOG_FILE` | Auto-generated | Specific log file path (deployment script) |

## Integration

### GitHub Actions

```yaml
- name: View deployment logs
  if: failure()
  run: |
    ./log-config.sh logs
```

### Monitoring

```bash
# Monitor for errors
tail -f server.log | grep --line-buffered "ERROR"

# Alert on deployment failures
grep "Deployment failed" deploy.log && echo "Deployment failed!" | mail -s "Alert" admin@example.com
```

## Security Considerations

- Log files may contain sensitive information
- Ensure proper file permissions (600 for sensitive logs)
- Consider log encryption for production environments
- Regularly archive old logs to prevent disk space issues
