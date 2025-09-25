import type { WingmanAnnotation } from '@wingman/shared';
import type { AnnotationTemplate, TemplateEngine } from '@wingman/shared';
import { createLogger } from '@wingman/shared';

const logger = createLogger('Wingman:ScreenshotHandler');

/**
 * Handles screenshot processing for clipboard mode and file downloads
 */
export class ScreenshotHandler {
  private templateEngine: TemplateEngine;

  constructor(templateEngine: TemplateEngine) {
    this.templateEngine = templateEngine;
  }

  /**
   * Main entry point for handling screenshots in clipboard mode
   */
  async processForClipboard(
    annotation: WingmanAnnotation,
    template: AnnotationTemplate,
    relayUrl?: string
  ): Promise<{ content: string; localPath?: string }> {
    const dataUrl = annotation.media?.screenshot?.dataUrl;

    if (!dataUrl) {
      logger.warn('No screenshot data URL available');
      return {
        content: this.templateEngine.render(annotation, template, { relayUrl: relayUrl || '' })
      };
    }

    // Try multiple strategies in order
    let localPath: string | null = null;

    // Strategy 1: Try to save to Downloads folder
    localPath = await this.saveToDownloads(dataUrl);

    // Strategy 2: If Downloads failed, try chrome.storage.local (future implementation)
    if (!localPath) {
      localPath = await this.saveToStorage(dataUrl);
    }

    // Strategy 3: If all file-based approaches failed, use base64 embedding
    const content = localPath
      ? this.formatWithLocalFile(annotation, template, localPath)
      : this.formatWithBase64(annotation, template, dataUrl);

    return { content, localPath: localPath || undefined };
  }

  /**
   * Save screenshot to Downloads folder
   */
  async saveToDownloads(dataUrl: string): Promise<string | null> {
    try {
      logger.info('Attempting to save screenshot to Downloads folder...');

      // Validate data URL format
      const base64Match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!base64Match) {
        logger.error('Invalid data URL format');
        return null;
      }

      const [, imageType] = base64Match;
      const timestamp = Date.now();
      const filename = `wingman-screenshot-${timestamp}.${imageType}`;

      logger.debug(`Preparing to download: ${filename}`);

      // Use data URL directly - chrome.downloads.download supports data URLs
      const downloadId = await this.performDownload(dataUrl, filename);
      if (!downloadId) {
        return null;
      }

      // Wait for download to complete
      const downloadPath = await this.waitForDownload(downloadId);

      if (downloadPath) {
        logger.info(`Screenshot saved successfully to: ${downloadPath}`);
      } else {
        logger.warn('Download completed but no path returned');
      }

      return downloadPath;

    } catch (error) {
      logger.error('Failed to save screenshot to Downloads:', error);
      if (error instanceof Error) {
        logger.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      return null;
    }
  }

  /**
   * Hide the download shelf temporarily
   */
  private async hideDownloadShelf(): Promise<boolean> {
    try {
      // Try modern API first (Chrome 117+)
      if (chrome.downloads.setUiOptions) {
        await chrome.downloads.setUiOptions({ enabled: false });
        logger.debug('Download shelf hidden using setUiOptions');
        return true;
      }
      // Fall back to legacy API for older Chrome versions
      else if ((chrome.downloads as any).setShelfEnabled) {
        await new Promise<void>((resolve) => {
          (chrome.downloads as any).setShelfEnabled(false);
          resolve();
        });
        logger.debug('Download shelf hidden using setShelfEnabled');
        return true;
      }
    } catch (error) {
      logger.warn('Failed to hide download shelf:', error);
    }
    return false;
  }

  /**
   * Restore the download shelf
   */
  private async restoreDownloadShelf(): Promise<void> {
    try {
      // Try modern API first (Chrome 117+)
      if (chrome.downloads.setUiOptions) {
        await chrome.downloads.setUiOptions({ enabled: true });
        logger.debug('Download shelf restored using setUiOptions');
      }
      // Fall back to legacy API for older Chrome versions
      else if ((chrome.downloads as any).setShelfEnabled) {
        (chrome.downloads as any).setShelfEnabled(true);
        logger.debug('Download shelf restored using setShelfEnabled');
      }
    } catch (error) {
      logger.warn('Failed to restore download shelf:', error);
    }
  }

  /**
   * Perform the actual download with detailed error handling
   */
  private async performDownload(dataUrl: string, filename: string): Promise<number | null> {
    let shelfHidden = false;

    try {
      // Hide the download shelf before download
      shelfHidden = await this.hideDownloadShelf();

      const downloadOptions: chrome.downloads.DownloadOptions = {
        url: dataUrl,  // Data URL can be used directly
        filename: filename,
        saveAs: false,
        conflictAction: 'uniquify'
      };

      logger.debug('Download options:', {
        filename,
        urlLength: dataUrl.length,
        urlPrefix: dataUrl.substring(0, 50) + '...',
        shelfHidden
      });

      const downloadId = await new Promise<number | null>((resolve) => {
        chrome.downloads.download(downloadOptions, (downloadId) => {
          if (chrome.runtime.lastError) {
            logger.error('Chrome download API error:', chrome.runtime.lastError);
            resolve(null);
          } else if (downloadId === undefined) {
            logger.error('Download ID is undefined - download was blocked');
            resolve(null);
          } else {
            logger.info(`Download initiated with ID: ${downloadId}`);
            resolve(downloadId);
          }
        });
      });

      // Restore download shelf after a short delay
      // This ensures the download completes before re-enabling
      if (shelfHidden) {
        setTimeout(() => {
          this.restoreDownloadShelf();
        }, 500);
      }

      return downloadId;

    } catch (error) {
      // Restore shelf if we hid it and an error occurred
      if (shelfHidden) {
        await this.restoreDownloadShelf();
      }
      logger.error('Exception during download:', error);
      return null;
    }
  }

  /**
   * Wait for download to complete and return the file path
   */
  private async waitForDownload(downloadId: number): Promise<string | null> {
    return new Promise((resolve) => {
      const maxAttempts = 50; // 5 seconds total
      let attempts = 0;

      const checkDownload = () => {
        attempts++;

        chrome.downloads.search({ id: downloadId }, (downloads) => {
          if (chrome.runtime.lastError) {
            logger.error('Error searching for download:', chrome.runtime.lastError);
            resolve(null);
            return;
          }

          if (!downloads || downloads.length === 0) {
            logger.error(`Download ${downloadId} not found`);
            resolve(null);
            return;
          }

          const download = downloads[0];
          logger.debug(`Download state: ${download.state}, filename: ${download.filename}`);

          if (download.state === 'complete') {
            if (download.filename) {
              logger.info(`Download completed: ${download.filename}`);
              resolve(download.filename);
            } else {
              logger.warn('Download completed but filename is empty');
              resolve(null);
            }
          } else if (download.state === 'interrupted') {
            logger.error(`Download interrupted: ${download.error || 'Unknown error'}`);

            // Log detailed error information
            if (download.error) {
              const errorDetails = {
                error: download.error,
                filename: download.filename,
                mime: download.mime,
                bytesReceived: download.bytesReceived,
                totalBytes: download.totalBytes,
                danger: download.danger,
                paused: download.paused
              };
              logger.error('Download error details:', errorDetails);
            }

            resolve(null);
          } else if (attempts >= maxAttempts) {
            logger.error(`Download timeout after ${maxAttempts} attempts`);
            resolve(null);
          } else {
            // Still in progress, check again
            setTimeout(checkDownload, 100);
          }
        });
      };

      checkDownload();
    });
  }

  /**
   * Save screenshot to chrome.storage.local (fallback strategy)
   */
  private async saveToStorage(dataUrl: string): Promise<string | null> {
    try {
      logger.info('Attempting to save screenshot to chrome.storage.local...');

      // Check data URL size
      const sizeInBytes = new Blob([dataUrl]).size;
      const sizeInMB = sizeInBytes / (1024 * 1024);

      if (sizeInMB > 8) { // Leave some room in the 10MB limit
        logger.warn(`Screenshot too large for storage: ${sizeInMB.toFixed(2)} MB`);
        return null;
      }

      const timestamp = Date.now();
      const storageKey = `screenshot_${timestamp}`;

      // Try to save to storage
      await chrome.storage.local.set({ [storageKey]: dataUrl });

      logger.info(`Screenshot saved to storage with key: ${storageKey}`);

      // Return a pseudo-path that we can recognize later
      return `chrome-storage://${storageKey}`;

    } catch (error) {
      logger.error('Failed to save to chrome.storage.local:', error);
      return null;
    }
  }

  /**
   * Format annotation with local file reference
   */
  private formatWithLocalFile(
    annotation: WingmanAnnotation,
    template: AnnotationTemplate,
    localPath: string
  ): string {
    logger.debug(`Formatting with local file: ${localPath}`);

    // Determine the URL format based on the path type
    let fileUrl: string;
    if (localPath.startsWith('chrome-storage://')) {
      // Handle storage references differently in the future
      fileUrl = localPath;
    } else {
      // Standard file path
      fileUrl = `file://${localPath}`;
    }

    // Render the template with the file URL
    let content = this.templateEngine.render(annotation, template, {
      relayUrl: fileUrl,
      isLocalFile: true
    });

    // Replace any remaining remote screenshot URLs with the local file
    content = content.replace(
      /!\[.*?\]\(.*?\/annotations\/.*?\/screenshot\)/g,
      `![Screenshot - Local file](${fileUrl})`
    );

    return content;
  }

  /**
   * Format annotation with embedded base64 image (fallback)
   */
  private formatWithBase64(
    annotation: WingmanAnnotation,
    template: AnnotationTemplate,
    dataUrl: string
  ): string {
    logger.warn('Using base64 fallback for screenshot');

    // Create a modified annotation with a fake ID for template rendering
    const annotationWithFakeId = {
      ...annotation,
      id: `embedded-${Date.now()}`
    };

    // Render template with empty relay URL
    let content = this.templateEngine.render(annotationWithFakeId, template, {
      relayUrl: '',
      isLocalFile: false
    });

    // Replace the broken screenshot URL with the base64 data
    // This regex now handles both cases: with and without domain
    content = content.replace(
      /!\[.*?\]\(.*?\/annotations\/.*?\/screenshot\)/g,
      `![Screenshot](${dataUrl})`
    );

    // Also handle the case where there's no domain prefix
    content = content.replace(
      /!\[.*?\]\(\/annotations\/.*?\/screenshot\)/g,
      `![Screenshot](${dataUrl})`
    );

    return content;
  }
}