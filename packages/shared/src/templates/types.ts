/**
 * Template system types for customizable annotation formatting
 */

import type { WingmanAnnotation } from '../types.js';

/**
 * Represents a template variable that can be extracted from an annotation
 */
export interface TemplateVariable {
  /** Unique key for the variable (e.g., 'userNote', 'screenshot.url') */
  key: string;
  
  /** JSON path in the annotation object (e.g., 'note', 'page.url') */
  path: string;
  
  /** Optional formatter function to transform the value */
  formatter?: (value: any) => string;
  
  /** Whether this variable is required for the template */
  required: boolean;
  
  /** Default value if the variable is not found */
  defaultValue?: string;
  
  /** Description of what this variable represents */
  description?: string;
}

/**
 * Represents a complete annotation template
 */
export interface AnnotationTemplate {
  /** Unique identifier for the template */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of when to use this template */
  description: string;
  
  /** The template string with placeholders (using {{variable}} syntax) */
  template: string;
  
  /** List of variables used in this template */
  variables: TemplateVariable[];
  
  /** Whether this is a built-in template */
  builtIn: boolean;
  
  /** Optional tags for categorization */
  tags?: string[];
  
  /** Creation timestamp */
  createdAt?: string;
  
  /** Last modified timestamp */
  updatedAt?: string;
}

/**
 * Template engine interface
 */
export interface TemplateEngine {
  /**
   * Render an annotation using a template
   */
  render(annotation: WingmanAnnotation, template: AnnotationTemplate): string;
  
  /**
   * Validate that a template is well-formed
   */
  validate(template: AnnotationTemplate): { valid: boolean; errors?: string[] };
  
  /**
   * Extract variables from a template string
   */
  extractVariables(templateString: string): string[];
  
  /**
   * Get value from annotation using path
   */
  getValue(annotation: WingmanAnnotation, path: string): any;
}

/**
 * Built-in formatters that can be used in templates
 */
export interface TemplateFormatters {
  date: (value: string | number) => string;
  time: (value: string | number) => string;
  datetime: (value: string | number) => string;
  json: (value: any) => string;
  jsonPretty: (value: any) => string;
  truncate: (value: string, maxLength: number) => string;
  uppercase: (value: string) => string;
  lowercase: (value: string) => string;
  boolean: (value: any) => string;
  dimensions: (rect: { width: number; height: number }) => string;
  position: (rect: { x: number; y: number }) => string;
  url: (value: string) => string;
  selector: (value: string) => string;
}

/**
 * Template storage interface
 */
export interface TemplateStorage {
  /**
   * Get all templates
   */
  getAll(): Promise<AnnotationTemplate[]>;
  
  /**
   * Get a template by ID
   */
  getById(id: string): Promise<AnnotationTemplate | null>;
  
  /**
   * Save a template
   */
  save(template: AnnotationTemplate): Promise<void>;
  
  /**
   * Delete a template
   */
  delete(id: string): Promise<void>;
  
  /**
   * Get the active template ID
   */
  getActiveTemplateId(): Promise<string | null>;
  
  /**
   * Set the active template ID
   */
  setActiveTemplateId(id: string): Promise<void>;
}