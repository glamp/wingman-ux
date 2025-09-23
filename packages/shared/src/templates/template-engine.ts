/**
 * Simple template engine for rendering annotation templates
 * This is a lightweight implementation that will be enhanced with
 * a proper template library (like Handlebars) in the future
 */

import type { WingmanAnnotation } from '../types.js';
import type { AnnotationTemplate, TemplateContext, TemplateEngine, TemplateVariable } from './types.js';

/**
 * Get a value from an object using a dot-notation path
 */
function getValueByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current == null) return undefined;
    current = current[key];
  }
  
  return current;
}

/**
 * Simple template engine implementation
 * Note: This is a basic implementation. In production, we'll use
 * a proper template library like Handlebars for full functionality
 */
export class SimpleTemplateEngine implements TemplateEngine {
  private truncationConfig: {
    console?: { templateLimit: number };
    network?: { templateLimit: number };
    errors?: { templateLimit: number };
  } | undefined;

  constructor(options?: { 
    truncationConfig?: {
      console?: { templateLimit: number };
      network?: { templateLimit: number };
      errors?: { templateLimit: number };
    }
  }) {
    this.truncationConfig = options?.truncationConfig;
  }
  
  /**
   * Render an annotation using a template
   */
  render(annotation: WingmanAnnotation, template: AnnotationTemplate, context?: TemplateContext): string {
    let result = template.template;

    // Process variables
    for (const variable of template.variables) {
      const value = this.getValue(annotation, variable.path);
      const formattedValue = variable.formatter
        ? variable.formatter(value, context)
        : value?.toString() || variable.defaultValue || '';

      // Simple replacement for now (will be enhanced with Handlebars)
      const placeholder = `{{${variable.key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), formattedValue);
    }
    
    // Handle nested property access (e.g., {{targetRect.width}})
    result = this.processNestedProperties(result, annotation);
    
    // Handle conditional blocks (simplified version)
    // {{#if variable}}...{{/if}}
    result = this.processConditionals(result, annotation, template);
    
    // Handle loops (simplified version)
    // {{#each array}}...{{/each}}
    result = this.processLoops(result, annotation, template);
    
    return result;
  }
  
  /**
   * Process nested property access in templates
   * Handles patterns like {{object.property}} and {{object.nested.property}}
   */
  private processNestedProperties(template: string, annotation: WingmanAnnotation): string {
    // Match patterns like {{variable.property}} but not {{#if variable}} or {{/if}}
    const nestedPropRegex = /\{\{([^#/][^}]+\.[^}]+)\}\}/g;
    
    return template.replace(nestedPropRegex, (match, path) => {
      const trimmedPath = path.trim();
      
      // Check if this path starts with a known variable key (like targetRect.width)
      // If so, try to resolve it from the annotation directly
      const value = getValueByPath(annotation, trimmedPath);
      
      // Special handling for common nested properties
      if (!value && trimmedPath.startsWith('target.rect.')) {
        const rectValue = getValueByPath(annotation, 'target.rect');
        if (rectValue) {
          const prop = trimmedPath.split('.').pop();
          return rectValue[prop]?.toString() || '';
        }
      }
      
      return value?.toString() || '';
    });
  }
  
  /**
   * Process conditional blocks in the template
   * This is a simplified implementation for the foundation
   */
  private processConditionals(template: string, annotation: WingmanAnnotation, tmpl: AnnotationTemplate): string {
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    
    return template.replace(conditionalRegex, (match, varName, content) => {
      const variable = tmpl.variables.find(v => v.key === varName);
      if (!variable) return '';
      
      const value = this.getValue(annotation, variable.path);
      const processedValue = variable.formatter ? variable.formatter(value) : value;
      
      // Check truthiness
      const isTruthy = processedValue && 
        (Array.isArray(processedValue) ? processedValue.length > 0 : true);
      
      return isTruthy ? content : '';
    });
  }
  
  /**
   * Process loops in the template
   * This is a simplified implementation for the foundation
   */
  private processLoops(template: string, annotation: WingmanAnnotation, tmpl: AnnotationTemplate): string {
    const loopRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    
    return template.replace(loopRegex, (match, varName, content) => {
      const variable = tmpl.variables.find(v => v.key === varName);
      if (!variable) return '';
      
      const value = this.getValue(annotation, variable.path);
      if (!Array.isArray(value)) return '';
      
      return value.map((item, index) => {
        let itemContent = content;
        
        // Replace {{index}} with 1-based index
        itemContent = itemContent.replace(/\{\{index\}\}/g, (index + 1).toString());
        
        // Handle nested {{#if}} blocks within the loop
        const nestedIfRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
        itemContent = itemContent.replace(nestedIfRegex, (ifMatch: string, propName: string, ifContent: string) => {
          const propValue = item[propName];
          return propValue ? ifContent : '';
        });
        
        // Replace item properties
        if (typeof item === 'object' && item !== null) {
          // Handle special fields first
          if ('ts' in item && typeof item.ts === 'number') {
            const timestamp = new Date(item.ts).toLocaleTimeString();
            itemContent = itemContent.replace(/\{\{timestamp\}\}/g, timestamp);
          }
          
          for (const [key, val] of Object.entries(item)) {
            const placeholder = `{{${key}}}`;
            let formattedVal = '';
            
            if (val === undefined || val === null) {
              formattedVal = '';
            } else if (key === 'ts' && typeof val === 'number') {
              formattedVal = new Date(val).toLocaleTimeString();
            } else if (key === 'level' && typeof val === 'string') {
              formattedVal = val.toUpperCase();
            } else if (key === 'args' && Array.isArray(val)) {
              formattedVal = val.map((arg: any) => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
              ).join(' ');
            } else if (key === 'timestamp' && typeof val === 'number') {
              formattedVal = new Date(val).toLocaleTimeString();
            } else {
              formattedVal = val.toString();
            }
            
            itemContent = itemContent.replace(new RegExp(placeholder, 'g'), formattedVal);
          }
          
          // Clean up any remaining undefined placeholders
          itemContent = itemContent.replace(/\{\{[^}]+\}\}/g, (match: string) => {
            // Keep index placeholder
            if (match === '{{index}}') return match;
            // Remove undefined field references
            return '';
          });
        }
        
        return itemContent;
      }).join('');
    });
  }
  
  /**
   * Validate that a template is well-formed
   */
  validate(template: AnnotationTemplate): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (!template.id) errors.push('Template ID is required');
    if (!template.name) errors.push('Template name is required');
    if (!template.template) errors.push('Template string is required');
    if (!template.variables || !Array.isArray(template.variables)) {
      errors.push('Template variables must be an array');
    }
    
    // Extract variables from template and check they're defined
    const usedVars = this.extractVariables(template.template);
    const definedVars = new Set(template.variables.map(v => v.key));
    
    for (const usedVar of usedVars) {
      if (!definedVars.has(usedVar) && 
          !['index', 'timestamp', 'message', 'stack', 'level', 'args', 'url', 'status', 'duration', 'initiatorType'].includes(usedVar)) {
        errors.push(`Variable '${usedVar}' is used in template but not defined`);
      }
    }
    
    // Check for required variables
    for (const variable of template.variables) {
      if (variable.required && !usedVars.includes(variable.key)) {
        errors.push(`Required variable '${variable.key}' is not used in template`);
      }
    }
    
    return {
      valid: errors.length === 0,
      ...(errors.length > 0 && { errors })
    };
  }
  
  /**
   * Extract variables from a template string
   */
  extractVariables(templateString: string): string[] {
    const variables = new Set<string>();
    
    // Match {{variable}} patterns
    const simpleVarRegex = /\{\{([^#/][^}]+)\}\}/g;
    let match;
    
    while ((match = simpleVarRegex.exec(templateString)) !== null) {
      const varName = match[1]?.trim();
      // Skip special keywords
      if (varName && !varName.startsWith('#') && !varName.startsWith('/')) {
        variables.add(varName);
      }
    }
    
    // Match {{#if variable}} patterns
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}/g;
    while ((match = conditionalRegex.exec(templateString)) !== null) {
      if (match[1]) {
        variables.add(match[1]);
      }
    }
    
    // Match {{#each variable}} patterns
    const loopRegex = /\{\{#each\s+(\w+)\}\}/g;
    while ((match = loopRegex.exec(templateString)) !== null) {
      if (match[1]) {
        variables.add(match[1]);
      }
    }
    
    return Array.from(variables);
  }
  
  /**
   * Get value from annotation using path, applying truncation if configured
   */
  getValue(annotation: WingmanAnnotation, path: string): any {
    const value = getValueByPath(annotation, path);
    
    // Apply truncation based on path and configuration
    if (Array.isArray(value) && this.truncationConfig) {
      if (path === 'console' && this.truncationConfig.console?.templateLimit) {
        // Return most recent console entries
        const limit = this.truncationConfig.console.templateLimit;
        return value.slice(-limit);
      }
      if (path === 'network' && this.truncationConfig.network?.templateLimit) {
        // Return most recent network entries
        const limit = this.truncationConfig.network.templateLimit;
        return value.slice(-limit);
      }
      if (path === 'errors' && this.truncationConfig.errors?.templateLimit) {
        // Return most recent error entries
        const limit = this.truncationConfig.errors.templateLimit;
        return value.slice(-limit);
      }
    }
    
    return value;
  }
}

/**
 * Create a template engine instance with optional configuration
 */
export function createTemplateEngine(options?: {
  truncationConfig?: {
    console?: { templateLimit: number };
    network?: { templateLimit: number };
    errors?: { templateLimit: number };
  }
}): TemplateEngine {
  return new SimpleTemplateEngine(options);
}