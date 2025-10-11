import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface LogLevel {
    name: string;
    color: string;
    priority: number;
}

const LOG_LEVELS: Record<string, LogLevel> = {
    ERROR: { name: 'ERROR', color: '\x1b[31m', priority: 0 },
    WARN: { name: 'WARN', color: '\x1b[33m', priority: 1 },
    INFO: { name: 'INFO', color: '\x1b[36m', priority: 2 },
    DEBUG: { name: 'DEBUG', color: '\x1b[35m', priority: 3 },
};

class Logger {
    private logDir: string;
    private logFile: string;
    private currentLogLevel: number;
    private writeToFile: boolean;

    constructor() {
        // Set up log directory and file
        this.logDir = process.env.LOG_DIR || '/var/log/never-have-i-ever';
        this.logFile = join(this.logDir, `server-${new Date().toISOString().split('T')[0]}.log`);

        // Try to create log directory, fallback to current directory or /tmp
        try {
            if (!existsSync(this.logDir)) {
                mkdirSync(this.logDir, { recursive: true });
            }
        } catch (error) {
            try {
                this.logDir = './logs';
                if (!existsSync(this.logDir)) {
                    mkdirSync(this.logDir, { recursive: true });
                }
                this.logFile = join(this.logDir, `server-${new Date().toISOString().split('T')[0]}.log`);
            } catch (fallbackError) {
                this.logDir = '/tmp';
                this.logFile = join(this.logDir, `never-have-i-ever-server-${new Date().toISOString().split('T')[0]}.log`);
            }
        }

        // Set log level from environment or default to INFO
        const envLogLevel = (process.env.LOG_LEVEL || 'INFO').toUpperCase();
        this.currentLogLevel = LOG_LEVELS[envLogLevel]?.priority ?? LOG_LEVELS.INFO.priority;

        // Enable file logging unless explicitly disabled
        this.writeToFile = process.env.LOG_TO_FILE !== 'false';

        // Initialize log file
        if (this.writeToFile) {
            try {
                // Create empty file or append to existing
                require('fs').appendFileSync(this.logFile, '');
                this.info(`Server logs will be written to: ${this.logFile}`);
            } catch (error) {
                console.warn('Cannot write to log file, disabling file logging:', error);
                this.writeToFile = false;
            }
        }
    }

    private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
        const timestamp = new Date().toISOString();
        const colorReset = '\x1b[0m';
        const coloredMessage = `${level.color}[${level.name}]${colorReset} ${message}`;

        // Format args
        const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';

        return `[${timestamp}] ${coloredMessage}${formattedArgs}`;
    }

    private writeToLogFile(message: string): void {
        if (!this.writeToFile) return;

        try {
            // Use Bun's native stripANSI() for efficient ANSI code removal
            const cleanMessage = Bun.stripANSI(message);
            require('fs').appendFileSync(this.logFile, cleanMessage + '\n');
        } catch (error) {
            // If we can't write to file, disable file logging to avoid spam
            console.warn('Failed to write to log file, disabling file logging');
            this.writeToFile = false;
        }
    }

    private log(level: LogLevel, message: string, ...args: any[]): void {
        if (level.priority > this.currentLogLevel) return;

        const formattedMessage = this.formatMessage(level, message, ...args);

        // Always output to console with colors
        console.log(formattedMessage);

        // Write to file - formattedMessage will be cleaned by writeToLogFile using Bun.stripANSI
        this.writeToLogFile(formattedMessage);
    }

    error(message: string, ...args: any[]): void {
        this.log(LOG_LEVELS.ERROR, message, ...args);
    }

    warn(message: string, ...args: any[]): void {
        this.log(LOG_LEVELS.WARN, message, ...args);
    }

    info(message: string, ...args: any[]): void {
        this.log(LOG_LEVELS.INFO, message, ...args);
    }

    debug(message: string, ...args: any[]): void {
        this.log(LOG_LEVELS.DEBUG, message, ...args);
    }

    // Utility method to get current log file path
    getLogFilePath(): string {
        return this.logFile;
    }

    // Utility method to check if file logging is enabled
    isFileLoggingEnabled(): boolean {
        return this.writeToFile;
    }
}

// Export singleton instance
export const logger = new Logger();
export default logger;
