// Type declarations for @wingman/relay-server
declare module '@wingman/relay-server' {
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