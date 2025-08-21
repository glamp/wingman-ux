/**
 * Convert HTML content to Markdown format
 */
export function htmlToMarkdown(html: string): string {
  // Create a temporary div to parse the HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Process the nodes recursively
  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    
    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    let content = Array.from(element.childNodes).map(processNode).join('');
    
    switch (tagName) {
      case 'strong':
      case 'b':
        return `**${content}**`;
      case 'em':
      case 'i':
        return `*${content}*`;
      case 'code':
        // Check if it's inside a pre tag (code block)
        if (element.parentElement?.tagName.toLowerCase() === 'pre') {
          return content;
        }
        return `\`${content}\``;
      case 'pre':
        return `\n\`\`\`\n${content}\n\`\`\`\n`;
      case 'a':
        const href = element.getAttribute('href') || '';
        return `[${content}](${href})`;
      case 'ul':
        return '\n' + Array.from(element.children).map(li => {
          const liContent = Array.from(li.childNodes).map(processNode).join('');
          return `- ${liContent}`;
        }).join('\n') + '\n';
      case 'ol':
        return '\n' + Array.from(element.children).map((li, index) => {
          const liContent = Array.from(li.childNodes).map(processNode).join('');
          return `${index + 1}. ${liContent}`;
        }).join('\n') + '\n';
      case 'p':
        return content + '\n\n';
      case 'br':
        return '\n';
      case 'div':
        // Handle divs as paragraphs if they contain text
        if (content.trim()) {
          return content + '\n';
        }
        return content;
      default:
        return content;
    }
  }
  
  const markdown = Array.from(temp.childNodes).map(processNode).join('');
  // Clean up excessive newlines
  return markdown.trim().replace(/\n{3,}/g, '\n\n');
}