// logger.ts

interface LogLevels {
  error: number;
  warn: number;
  info: number;
  debug: number;
}

const levels: LogLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const logLevelStr = import.meta.env.VITE_LOG_LEVEL || 'info';
const currentLevel = levels[logLevelStr as keyof LogLevels] ?? levels.info;

function log(level: keyof LogLevels, message: string, ...optionalParams: any[]) {
  if (levels[level] <= currentLevel) {
    const logFunction = console[level] || logger.info;
    logFunction(`[${level.toUpperCase()}]`, message, ...optionalParams);
  }
}

export const logger = {
  error: (message: string, ...params: any[]) => log('error', message, ...params),
  warn: (message: string, ...params: any[]) => log('warn', message, ...params),
  info: (message: string, ...params: any[]) => log('info', message, ...params),
  debug: (message: string, ...params: any[]) => log('debug', message, ...params),
};
