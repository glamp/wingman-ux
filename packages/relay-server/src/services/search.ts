import { WingmanAnnotation } from '@wingman/shared';

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  fields?: ('note' | 'url' | 'title' | 'selector')[];
}

export interface SearchResult {
  results: WingmanAnnotation[];
  total: number;
  query: string;
  hasMore: boolean;
}

export class SearchService {
  /**
   * Search annotations with improved performance and flexibility
   */
  search(annotations: WingmanAnnotation[], options: SearchOptions): SearchResult {
    const { query, limit = 10, offset = 0, fields = ['note', 'url', 'title'] } = options;

    // Validate query
    if (!query || query.trim() === '') {
      throw new Error('Query parameter is required');
    }

    // Normalize search query
    const searchTerms = this.normalizeQuery(query);

    // Filter annotations based on search terms
    const filtered = annotations.filter(annotation => 
      this.matchesAnnotation(annotation, searchTerms, fields)
    );

    // Sort by relevance (simple implementation - could be improved)
    const sorted = this.sortByRelevance(filtered, searchTerms);

    // Apply pagination
    const total = sorted.length;
    const results = sorted.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      results,
      total,
      query,
      hasMore
    };
  }

  /**
   * Normalize query for better matching
   */
  private normalizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(term => term.length > 0);
  }

  /**
   * Check if annotation matches search terms
   */
  private matchesAnnotation(
    annotation: WingmanAnnotation,
    searchTerms: string[],
    fields: string[]
  ): boolean {
    const searchableText = this.getSearchableText(annotation, fields);
    
    // All search terms must be found
    return searchTerms.every(term => 
      searchableText.includes(term)
    );
  }

  /**
   * Extract searchable text from annotation
   */
  private getSearchableText(annotation: WingmanAnnotation, fields: string[]): string {
    const texts: string[] = [];

    if (fields.includes('note') && annotation.note) {
      texts.push(annotation.note.toLowerCase());
    }

    if (fields.includes('url') && annotation.page?.url) {
      texts.push(annotation.page.url.toLowerCase());
    }

    if (fields.includes('title') && annotation.page?.title) {
      texts.push(annotation.page.title.toLowerCase());
    }

    if (fields.includes('selector') && annotation.target?.selector) {
      texts.push(annotation.target.selector.toLowerCase());
    }

    return texts.join(' ');
  }

  /**
   * Sort annotations by relevance to search terms
   */
  private sortByRelevance(
    annotations: WingmanAnnotation[],
    searchTerms: string[]
  ): WingmanAnnotation[] {
    return annotations.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, searchTerms);
      const scoreB = this.calculateRelevanceScore(b, searchTerms);
      
      // Higher score first
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      
      // Then by creation date (newest first)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  /**
   * Calculate relevance score for an annotation
   */
  private calculateRelevanceScore(
    annotation: WingmanAnnotation,
    searchTerms: string[]
  ): number {
    let score = 0;
    const noteText = annotation.note?.toLowerCase() || '';
    const urlText = annotation.page?.url?.toLowerCase() || '';

    for (const term of searchTerms) {
      // Exact match in note gets highest score
      if (noteText.includes(term)) {
        score += 10;
        
        // Bonus for word boundary match
        const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'i');
        if (wordBoundaryRegex.test(annotation.note || '')) {
          score += 5;
        }
      }

      // URL match gets lower score
      if (urlText.includes(term)) {
        score += 3;
      }
    }

    return score;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}