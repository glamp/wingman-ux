import fs from 'fs/promises';
import path from 'path';
import type { WingmanAnnotation, StoredAnnotation } from '@wingman/shared';

export class StorageService {
  constructor(private basePath: string) {
    this.ensureDirectory();
  }

  private async ensureDirectory() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create storage directory:', error);
    }
  }

  async save(annotation: WingmanAnnotation): Promise<StoredAnnotation> {
    // Ensure directory exists before writing
    await this.ensureDirectory();
    
    const stored: StoredAnnotation = {
      id: annotation.id,
      receivedAt: new Date().toISOString(),
      annotation,
    };

    const filePath = path.join(this.basePath, `${annotation.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(stored, null, 2));
    
    console.log(`Saved annotation ${annotation.id} to ${filePath}`);
    return stored;
  }

  async get(id: string): Promise<StoredAnnotation | null> {
    try {
      const filePath = path.join(this.basePath, `${id}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getLast(): Promise<StoredAnnotation | null> {
    try {
      const files = await fs.readdir(this.basePath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      if (jsonFiles.length === 0) {
        return null;
      }

      // Get file stats and sort by modification time
      const fileStats = await Promise.all(
        jsonFiles.map(async (file) => {
          const filePath = path.join(this.basePath, file);
          const stats = await fs.stat(filePath);
          return { file, mtime: stats.mtime };
        })
      );

      fileStats.sort((a: any, b: any) => b.mtime.getTime() - a.mtime.getTime());
      
      // Read the most recent file
      const mostRecentFile = fileStats[0]?.file;
      if (!mostRecentFile) {
        return null;
      }

      const content = await fs.readFile(
        path.join(this.basePath, mostRecentFile),
        'utf-8'
      );
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to get last annotation:', error);
      return null;
    }
  }

  async list(options: { limit: number; since?: string }): Promise<StoredAnnotation[]> {
    try {
      const files = await fs.readdir(this.basePath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      // Get file stats and sort by modification time
      const fileStats = await Promise.all(
        jsonFiles.map(async (file) => {
          const filePath = path.join(this.basePath, file);
          const stats = await fs.stat(filePath);
          return { file, mtime: stats.mtime };
        })
      );

      fileStats.sort((a: any, b: any) => b.mtime.getTime() - a.mtime.getTime());
      
      // Apply limit
      const limitedFiles = fileStats.slice(0, options.limit);
      
      // Read files
      const annotations = await Promise.all(
        limitedFiles.map(async ({ file }) => {
          const content = await fs.readFile(
            path.join(this.basePath, file),
            'utf-8'
          );
          return JSON.parse(content) as StoredAnnotation;
        })
      );

      // Filter by since if provided
      if (options.since) {
        const sinceTime = new Date(options.since).getTime();
        return annotations.filter(
          a => new Date(a.receivedAt).getTime() > sinceTime
        );
      }

      return annotations;
    } catch (error) {
      console.error('Failed to list annotations:', error);
      return [];
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, `${id}.json`);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }
}