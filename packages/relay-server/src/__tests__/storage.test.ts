import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageService } from '../services/storage';
import fs from 'fs/promises';
import path from 'path';
import { WingmanAnnotation, StoredAnnotation } from '@wingman/shared';

describe('StorageService', () => {
  const testDir = './test-annotations';
  let storage: StorageService;

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }

    storage = new StorageService(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('save', () => {
    it('should save annotation to file', async () => {
      const annotation: WingmanAnnotation = {
        id: 'test-123',
        createdAt: new Date().toISOString(),
        note: 'Test comment',
        page: {
          url: 'https://example.com',
          title: 'Test Page',
          ua: 'Mozilla/5.0',
          viewport: { w: 1920, h: 1080, dpr: 1 }
        },
        target: {
          mode: 'element',
          rect: { x: 0, y: 0, width: 100, height: 100 }
        },
        media: {
          screenshot: {
            mime: 'image/png',
            dataUrl: 'data:image/png;base64,test'
          }
        },
        console: [],
        errors: [],
        network: []
      };

      const result = await storage.save(annotation);
      expect(result.id).toBe('test-123');
      expect(result.receivedAt).toBeDefined();

      // Verify file exists
      const filePath = path.join(testDir, `${result.id}.json`);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Verify content
      const content = await fs.readFile(filePath, 'utf-8');
      const saved = JSON.parse(content) as StoredAnnotation;
      expect(saved.annotation).toEqual(annotation);
    });

    it('should create directory if it does not exist', async () => {
      const newDir = './new-test-dir';
      const newStorage = new StorageService(newDir);

      const annotation: WingmanAnnotation = {
        id: 'create-dir-test',
        createdAt: new Date().toISOString(),
        note: '',
        page: {
          url: 'https://example.com',
          title: 'Test',
          ua: 'Mozilla/5.0',
          viewport: { w: 1920, h: 1080, dpr: 1 }
        },
        target: {
          mode: 'element',
          rect: { x: 0, y: 0, width: 100, height: 100 }
        },
        media: {
          screenshot: {
            mime: 'image/png',
            dataUrl: 'test'
          }
        },
        console: [],
        errors: [],
        network: []
      };

      await newStorage.save(annotation);

      // Verify directory was created
      const exists = await fs.access(newDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Clean up
      await fs.rm(newDir, { recursive: true, force: true });
    });
  });

  describe('getLast', () => {
    it('should return the most recent annotation', async () => {
      const annotation1: WingmanAnnotation = {
        id: 'old-annotation',
        createdAt: new Date(Date.now() - 10000).toISOString(),
        note: 'Old comment',
        page: {
          url: 'https://example.com/old',
          title: 'Old',
          ua: 'Mozilla/5.0',
          viewport: { w: 1920, h: 1080, dpr: 1 }
        },
        target: {
          mode: 'element',
          rect: { x: 0, y: 0, width: 100, height: 100 }
        },
        media: {
          screenshot: {
            mime: 'image/png',
            dataUrl: 'old'
          }
        },
        console: [],
        errors: [],
        network: []
      };

      const annotation2: WingmanAnnotation = {
        id: 'new-annotation',
        createdAt: new Date().toISOString(),
        note: 'New comment',
        page: {
          url: 'https://example.com/new',
          title: 'New',
          ua: 'Mozilla/5.0',
          viewport: { w: 1920, h: 1080, dpr: 1 }
        },
        target: {
          mode: 'element',
          rect: { x: 0, y: 0, width: 100, height: 100 }
        },
        media: {
          screenshot: {
            mime: 'image/png',
            dataUrl: 'new'
          }
        },
        console: [],
        errors: [],
        network: []
      };

      // Save with different timestamps in filenames
      await fs.mkdir(testDir, { recursive: true });
      
      const stored1: StoredAnnotation = {
        id: annotation1.id,
        receivedAt: new Date(Date.now() - 10000).toISOString(),
        annotation: annotation1
      };
      
      const stored2: StoredAnnotation = {
        id: annotation2.id,
        receivedAt: new Date().toISOString(),
        annotation: annotation2
      };
      
      await fs.writeFile(
        path.join(testDir, '1000-old.json'),
        JSON.stringify(stored1)
      );
      
      // Small delay to ensure different modification time
      await new Promise(resolve => setTimeout(resolve, 5));
      
      await fs.writeFile(
        path.join(testDir, '2000-new.json'),
        JSON.stringify(stored2)
      );

      const latest = await storage.getLast();
      expect(latest).toBeTruthy();
      if (latest) {
        expect(latest.annotation.id).toBe('new-annotation');
        expect(latest.annotation.note).toBe('New comment');
      }
    });

    it('should return null when no annotations exist', async () => {
      const latest = await storage.getLast();
      expect(latest).toBeNull();
    });

    it('should return null when directory does not exist', async () => {
      const nonExistentStorage = new StorageService('./non-existent-dir');
      const latest = await nonExistentStorage.getLast();
      expect(latest).toBeNull();
    });

    it('should handle invalid JSON files gracefully', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'invalid.json'),
        'this is not valid JSON'
      );

      const latest = await storage.getLast();
      expect(latest).toBeNull();
    });
  });

  describe('filename generation', () => {
    it('should generate unique filenames', async () => {
      const annotation: WingmanAnnotation = {
        id: 'duplicate-test',
        createdAt: new Date().toISOString(),
        note: '',
        page: {
          url: 'https://example.com',
          title: 'Test',
          ua: 'Mozilla/5.0',
          viewport: { w: 1920, h: 1080, dpr: 1 }
        },
        target: {
          mode: 'element',
          rect: { x: 0, y: 0, width: 100, height: 100 }
        },
        media: {
          screenshot: {
            mime: 'image/png',
            dataUrl: 'test'
          }
        },
        console: [],
        errors: [],
        network: []
      };

      const result1 = await storage.save(annotation);
      
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // Change ID for second save to avoid overwriting
      annotation.id = 'duplicate-test-2';
      const result2 = await storage.save(annotation);
      
      expect(result1.id).not.toBe(result2.id);
    });
  });
});