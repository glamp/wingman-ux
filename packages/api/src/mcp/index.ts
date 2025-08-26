/**
 * MCP (Model Context Protocol) Integration
 * 
 * This module provides the MCP server implementation for Wingman.
 * It exports the router and types for MCP integration with Claude Code.
 */

export { mcpRouter } from '../routes/mcp';

// MCP Configuration type
export interface MCPConfig {
  endpoint: string;
  transport: 'sse';
  tools: string[];
  prompts: string[];
}

// MCP Health status type
export interface MCPHealth {
  status: 'healthy' | 'unhealthy';
  name: string;
  version: string;
  tools: string[];
  prompts: string[];
}

// Tool names as constants to prevent typos
export const MCP_TOOLS = {
  LIST: 'wingman_list',
  REVIEW: 'wingman_review',
  DELETE: 'wingman_delete',
} as const;

// Prompt names as constants
export const MCP_PROMPTS = {
  FIX_UI: 'wingman_fix_ui',
} as const;

// MCP Server configuration
export const MCP_SERVER_CONFIG = {
  name: 'wingman-mcp',
  version: '1.0.0',
  endpoint: '/mcp',
} as const;