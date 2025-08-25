// Type declarations for @wingman/wingman-api
declare module '@wingman/wingman-api' {
  import { Server } from 'http';
  
  export interface ServerOptions {
    port?: number;
    host?: string;
    storagePath?: string;
  }
  
  export function createServer(options?: ServerOptions): {
    app: any;
    start: () => Promise<Server>;
  };
}