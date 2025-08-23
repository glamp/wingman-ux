import { Router } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import type { StorageService } from '../services/storage';
import { createLogger } from '@wingman/shared';
import type { WingmanAnnotation } from '@wingman/shared';

const logger = createLogger('Wingman:MCP');

// Schema for tool inputs
const DeleteAnnotationSchema = z.object({
  id: z.string().describe('The annotation ID to delete'),
});

const GetAnnotationSchema = z.object({
  id: z.string().optional().describe('Optional annotation ID, uses latest if not provided'),
});

export function mcpRouter(storage: StorageService): Router {
  const router = Router();

  // Create MCP server instance
  const mcpServer = new Server(
    {
      name: 'wingman',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
      },
    }
  );

  // Tool: wingman_list - List all annotations
  mcpServer.setRequestHandler('tools/list', async () => ({
    tools: [
      {
        name: 'wingman_list',
        description: 'List all UI feedback annotations from Wingman',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'wingman_review',
        description: 'Get the latest or specific annotation with full details for review',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Optional annotation ID, uses latest if not provided',
            },
          },
        },
      },
      {
        name: 'wingman_delete',
        description: 'Delete a processed annotation after fixing the issue',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The annotation ID to delete',
            },
          },
          required: ['id'],
        },
      },
    ],
  }));

  // Tool implementation: wingman_list
  mcpServer.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'wingman_list') {
      try {
        const annotations = await storage.list({ limit: 100 });
        
        // Format annotations for display
        const formattedList = annotations.map((stored) => ({
          id: stored.id,
          note: stored.annotation.note,
          url: stored.annotation.page?.url || 'Unknown URL',
          createdAt: stored.annotation.createdAt,
          targetMode: stored.annotation.target?.mode || 'unknown',
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formattedList, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Error listing annotations:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error listing annotations: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (name === 'wingman_review') {
      try {
        let annotation;
        
        if (args?.id) {
          // Get specific annotation
          annotation = await storage.get(args.id as string);
        } else {
          // Get latest annotation
          annotation = await storage.getLast();
        }

        if (!annotation) {
          return {
            content: [
              {
                type: 'text',
                text: 'No annotations found',
              },
            ],
          };
        }

        // Prepare comprehensive review data
        const reviewData = {
          id: annotation.id,
          createdAt: annotation.annotation.createdAt,
          note: annotation.annotation.note,
          page: {
            url: annotation.annotation.page?.url,
            title: annotation.annotation.page?.title,
            viewport: annotation.annotation.page?.viewport,
          },
          target: annotation.annotation.target,
          screenshotDataUrl: annotation.annotation.media?.screenshot?.dataUrl,
          reactMetadata: annotation.annotation.react || null,
          console: annotation.annotation.console || [],
          errors: annotation.annotation.errors || [],
          network: annotation.annotation.network || [],
          suggestion: generateSuggestion(annotation.annotation),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(reviewData, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Error reviewing annotation:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error reviewing annotation: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (name === 'wingman_delete') {
      try {
        const validatedArgs = DeleteAnnotationSchema.parse(args);
        const deleted = await storage.delete(validatedArgs.id);

        if (!deleted) {
          return {
            content: [
              {
                type: 'text',
                text: `Annotation ${validatedArgs.id} not found`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted annotation ${validatedArgs.id}`,
            },
          ],
        };
      } catch (error) {
        logger.error('Error deleting annotation:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting annotation: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${name}`,
        },
      ],
      isError: true,
    };
  });

  // Prompt: wingman_fix_ui
  mcpServer.setRequestHandler('prompts/list', async () => ({
    prompts: [
      {
        name: 'wingman_fix_ui',
        description: '🪶 Fix UI issues reported via Wingman feedback',
        arguments: [
          {
            name: 'annotation_id',
            description: 'Optional annotation ID, uses latest if not provided',
            required: false,
          },
        ],
      },
    ],
  }));

  mcpServer.setRequestHandler('prompts/get', async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'wingman_fix_ui') {
      try {
        let annotation;
        
        if (args?.annotation_id) {
          annotation = await storage.get(args.annotation_id as string);
        } else {
          annotation = await storage.getLast();
        }

        if (!annotation) {
          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: 'No Wingman annotations found. Please ensure feedback has been submitted via the Chrome extension.',
                },
              },
            ],
          };
        }

        // Create comprehensive prompt for fixing UI issue
        const promptContent = `
🪶 Wingman UI Fix Assistant

I have a UI issue reported via Wingman that needs to be fixed. Here are the details:

**Annotation ID:** ${annotation.id}
**Reported at:** ${annotation.annotation.createdAt}
**URL:** ${annotation.annotation.page?.url}
**Page Title:** ${annotation.annotation.page?.title}

**User's Note:**
${annotation.annotation.note}

**Target Element:**
- Mode: ${annotation.annotation.target?.mode}
${annotation.annotation.target?.rect ? `- Position: x=${annotation.annotation.target.rect.x}, y=${annotation.annotation.target.rect.y}
- Size: ${annotation.annotation.target.rect.width}x${annotation.annotation.target.rect.height}` : ''}
${annotation.annotation.target?.selector ? `- CSS Selector: ${annotation.annotation.target.selector}` : ''}

${annotation.annotation.react ? `
**React Component Information:**
- Component: ${annotation.annotation.react.componentName || 'Unknown'}
- Type: ${annotation.annotation.react.componentType || 'Unknown'}
${annotation.annotation.react.source ? `- Source: ${annotation.annotation.react.source.fileName}:${annotation.annotation.react.source.lineNumber}` : ''}
${annotation.annotation.react.props ? `- Props: ${JSON.stringify(annotation.annotation.react.props, null, 2)}` : ''}
` : ''}

${annotation.annotation.errors?.length ? `
**Console Errors:**
${annotation.annotation.errors.map(e => `- ${e.message}`).join('\n')}
` : ''}

**Screenshot:** ${annotation.annotation.media?.screenshot?.dataUrl ? 'Available (base64 encoded)' : 'Not available'}

Please:
1. Analyze the screenshot and identify the UI issue
2. Review the React/HTML context to understand the component structure
3. Check for any console errors that might be related
4. Generate a fix for the issue
5. Validate that the fix addresses the user's concern

After fixing, we can delete this annotation using: wingman_delete("${annotation.id}")
`;

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: promptContent,
              },
            },
          ],
        };
      } catch (error) {
        logger.error('Error generating fix prompt:', error);
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Error generating fix prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            },
          ],
        };
      }
    }

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Unknown prompt: ${name}`,
          },
        },
      ],
    };
  });

  // MCP endpoint handler
  router.post('/', async (req, res) => {
    try {
      logger.info('MCP connection established');
      const transport = new SSEServerTransport('/mcp', res);
      await mcpServer.connect(transport);
      logger.info('MCP server connected via SSE transport');
    } catch (error) {
      logger.error('MCP connection error:', error);
      res.status(500).json({
        error: 'Failed to establish MCP connection',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Health check for MCP
  router.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      name: 'wingman-mcp',
      version: '1.0.0',
      tools: ['wingman_list', 'wingman_review', 'wingman_delete'],
      prompts: ['wingman_fix_ui'],
    });
  });

  return router;
}

// Helper function to generate AI-friendly suggestions
function generateSuggestion(annotation: WingmanAnnotation): string {
  const suggestions: string[] = [];

  if (annotation.target?.mode === 'element' && annotation.target?.selector) {
    suggestions.push(`Focus on element matching selector: ${annotation.target.selector}`);
  }

  if (annotation.target?.mode === 'region' && annotation.target?.rect) {
    suggestions.push(`Issue is in region at coordinates (${annotation.target.rect.x}, ${annotation.target.rect.y})`);
  }

  if (annotation.react?.componentName) {
    suggestions.push(`Check React component: ${annotation.react.componentName}`);
  }

  if (annotation.errors?.length) {
    suggestions.push(`Console errors detected - may be related to the issue`);
  }

  if (annotation.console?.filter(log => log.level === 'error').length) {
    suggestions.push(`Error logs present in console - review for clues`);
  }

  return suggestions.length > 0 
    ? suggestions.join('; ')
    : 'Review screenshot and user note to identify the issue';
}