import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

type LogLevel = 'INFO' | 'ERROR';

class Logger {
    private logPath: string | null = null;
    private initialized = false;

    private async ensureInitialized() {
        if (this.initialized) return;

        try {
            // Don't wait for app to be ready - just use a fallback path
            let userData: string;
            try {
                userData = app.getPath('userData');
            } catch (error) {
                // Fallback to temp directory if app not ready
                userData = os.tmpdir();
            }
            
            this.logPath = path.join(userData, 'bouquine_debug.log');
            this.initialized = true;

            // Log startup message
            await this.writeLog('INFO', 'Logger initialized');
        } catch (error) {
            // Fallback to console if logging fails
            console.error('Failed to initialize logger:', error);
            this.logPath = null;
            this.initialized = true;
        }
    }

    async getLogPathOrCreate(): Promise<string> {
        await this.ensureInitialized();
        if (!this.logPath) {
            // Try to create the log file if it doesn't exist
            let userData: string;
            try {
                userData = app.getPath('userData');
            } catch (error) {
                userData = os.tmpdir();
            }
            this.logPath = path.join(userData, 'bouquine_debug.log');
            try {
                await fs.writeFile(this.logPath, `[${new Date().toISOString()}] [INFO] Log file created\n`, 'utf8');
            } catch (error) {
                console.error('Failed to create log file:', error);
                throw new Error(`Failed to create log file: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        return this.logPath!;
    }

    private async writeLog(level: LogLevel, message: string, errorObject?: unknown) {
        try {
            if (!this.logPath) {
                // Fallback to console if no log path
                if (level === 'ERROR') {
                    console.error(`[${new Date().toISOString()}] ${message}`, errorObject);
                } else {
                    console.log(`[${new Date().toISOString()}] ${message}`);
                }
                return;
            }

            const timestamp = new Date().toISOString();
            let logLine = `[${timestamp}] [${level}] ${message}`;

            if (errorObject instanceof Error) {
                logLine += `\n    Error: ${errorObject.message}`;
                if (errorObject.stack) {
                    logLine += `\n    Stack: ${errorObject.stack}`;
                }
            } else if (errorObject !== undefined) {
                logLine += `\n    Details: ${JSON.stringify(errorObject)}`;
            }

            logLine += '\n';

            await fs.appendFile(this.logPath, logLine, 'utf8');
        } catch (error) {
            // If writing to log file fails, fall back to console
            console.error('Failed to write to log file:', error);
            console.log(`[${new Date().toISOString()}] [${level}] ${message}`, errorObject);
        }
    }

    async logInfo(message: string) {
        await this.ensureInitialized();
        await this.writeLog('INFO', message);
    }

    async logError(message: string, errorObject?: unknown) {
        await this.ensureInitialized();
        await this.writeLog('ERROR', message, errorObject);
    }

    getLogPath(): string | null {
        return this.logPath;
    }
}

// Singleton instance
export const logger = new Logger();