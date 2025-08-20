export class ConsoleCapture {
  private entries: Array<{ level: 'log' | 'info' | 'warn' | 'error'; args: any[]; ts: number }> =
    [];
  private errors: Array<{ message: string; stack?: string; ts: number }> = [];
  private maxEntries = 100;
  private removeWingmanLogs = true;

  constructor() {
    this.wrapConsole();
    this.setupErrorHandlers();
  }

  private wrapConsole() {
    const levels = ['log', 'info', 'warn', 'error'] as const;

    levels.forEach((level) => {
      const original = console[level];
      console[level] = (...args: any[]) => {
        this.addEntry(level, args);
        original.apply(console, args);
      };
    });
  }

  private setupErrorHandlers() {
    window.addEventListener('error', (event) => {
      this.addError({
        message: event.message,
        stack: event.error?.stack,
        ts: Date.now(),
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.addError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        ts: Date.now(),
      });
    });
  }

  private addEntry(level: 'log' | 'info' | 'warn' | 'error', args: any[]) {
    // Ignore Wingman logs if removeWingmanLogs is enabled
    if (this.removeWingmanLogs && args?.[0].startsWith('[Wingman')) {
      return;
    }
    this.entries.push({
      level,
      args: this.sanitizeArgs(args),
      ts: Date.now(),
    });

    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  private addError(error: { message: string; stack?: string; ts: number }) {
    this.errors.push(error);

    if (this.errors.length > this.maxEntries) {
      this.errors.shift();
    }
  }

  private sanitizeArgs(args: any[]): any[] {
    return args.map((arg) => {
      try {
        if (typeof arg === 'function') {
          return '[Function]';
        }
        if (typeof arg === 'object' && arg !== null) {
          // Basic circular reference protection
          return JSON.parse(
            JSON.stringify(arg, (key, value) => {
              if (typeof value === 'function') return '[Function]';
              if (typeof value === 'undefined') return '[undefined]';
              return value;
            })
          );
        }
        return arg;
      } catch {
        return '[Unserializable]';
      }
    });
  }

  getEntries() {
    return this.entries;
  }

  getErrors() {
    return this.errors;
  }

  clear() {
    this.entries = [];
    this.errors = [];
  }
}
