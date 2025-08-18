export class NetworkCapture {
  private entries: Array<{
    url: string;
    status?: number;
    startTime?: number;
    duration?: number;
    initiatorType?: string;
  }> = [];
  private maxEntries = 50;
  private observer: PerformanceObserver | null = null;

  constructor() {
    this.setupObserver();
  }

  private setupObserver() {
    if (!window.PerformanceObserver) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.addEntry({
              url: resourceEntry.name,
              startTime: resourceEntry.startTime,
              duration: resourceEntry.duration,
              initiatorType: resourceEntry.initiatorType,
            });
          }
        }
      });

      this.observer.observe({ entryTypes: ['resource'], buffered: true });
    } catch (error) {
      console.warn('Failed to setup PerformanceObserver:', error);
    }
  }

  private addEntry(entry: any) {
    this.entries.push(entry);
    
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  getEntries() {
    return this.entries;
  }

  clear() {
    this.entries = [];
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}