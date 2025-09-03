export interface Component {
  element: HTMLElement;
  render(): void;
  destroy(): void;
}

export abstract class BaseComponent implements Component {
  protected container: HTMLElement;
  protected _element: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  get element(): HTMLElement {
    if (!this._element) {
      this._element = this.createElement();
    }
    return this._element;
  }

  protected abstract createElement(): HTMLElement;

  abstract render(): void;

  destroy(): void {
    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    this._element = null;
  }

  protected createElementFromHTML(html: string): HTMLElement {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild as HTMLElement;
  }
}