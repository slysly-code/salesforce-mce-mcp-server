// helpers/content-blocks.js
export class ContentBlock {
  constructor(type, options = {}) {
    this.type = type;
    this.options = options;
  }

  render() {
    throw new Error('Render method must be implemented by subclass');
  }
}

export class ImageBlock extends ContentBlock {
  constructor(source, options = {}) {
    super('image', options);
    this.source = source;
    this.alt = options.alt || '';
    this.width = options.width || '100%';
    this.link = options.link || null;
  }

  render() {
    const img = `<img src="${this.source}" alt="${this.alt}" width="${this.width}" style="display: block; max-width: 100%;">`;
    
    if (this.link) {
      return `<a href="${this.link}" target="_blank">${img}</a>`;
    }
    return img;
  }
}

export class TextBlock extends ContentBlock {
  constructor(content, options = {}) {
    super('text', options);
    this.content = content;
    this.style = options.style || {};
  }

  render() {
    const defaultStyle = {
      'font-family': 'Arial, sans-serif',
      'font-size': '14px',
      'line-height': '1.6',
      'color': '#333333'
    };
    
    const mergedStyle = { ...defaultStyle, ...this.style };
    const styleString = Object.entries(mergedStyle)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
    
    return `<div style="${styleString}">${this.content}</div>`;
  }
}

export class ButtonBlock extends ContentBlock {
  constructor(text, link, options = {}) {
    super('button', options);
    this.text = text;
    this.link = link;
    this.backgroundColor = options.backgroundColor || '#007bff';
    this.textColor = options.textColor || '#ffffff';
    this.padding = options.padding || '12px 24px';
    this.borderRadius = options.borderRadius || '4px';
  }

  render() {
    return `
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="background-color: ${this.backgroundColor}; border-radius: ${this.borderRadius};">
            <a href="${this.link}" target="_blank" style="
              display: inline-block;
              padding: ${this.padding};
              color: ${this.textColor};
              text-decoration: none;
              font-weight: bold;
            ">${this.text}</a>
          </td>
        </tr>
      </table>
    `;
  }
}

export class PersonalizationBlock extends ContentBlock {
  constructor(field, fallback = '', options = {}) {
    super('personalization', options);
    this.field = field;
    this.fallback = fallback;
    this.prefix = options.prefix || '';
    this.suffix = options.suffix || '';
  }

  render() {
    // AMPscript for Marketing Cloud personalization
    const ampscript = this.fallback 
      ? `%%[ IF NOT EMPTY(${this.field}) THEN ]%%%%${this.field}%%%%[ ELSE ]%%${this.fallback}%%[ ENDIF ]%%`
      : `%%${this.field}%%`;
    
    return `${this.prefix}${ampscript}${this.suffix}`;
  }
}

export class EditorialBlock extends ContentBlock {
  constructor(placeholder, options = {}) {
    super('editorial', options);
    this.placeholder = placeholder;
  }

  render() {
    // Marker for content that should be replaced later
    return `
      <div style="
        border: 2px dashed #ccc;
        padding: 20px;
        background-color: #f9f9f9;
        text-align: center;
        color: #666;
      ">
        [EDITORIAL: ${this.placeholder}]
      </div>
    `;
  }
}

export class EmptyBlock extends ContentBlock {
  constructor() {
    super('empty');
  }

  render() {
    return '&nbsp;';
  }
}

export class DividerBlock extends ContentBlock {
  constructor(options = {}) {
    super('divider', options);
    this.height = options.height || '1px';
    this.color = options.color || '#e0e0e0';
    this.margin = options.margin || '20px 0';
  }

  render() {
    return `<hr style="height: ${this.height}; background-color: ${this.color}; border: none; margin: ${this.margin};">`;
  }
}

export class SocialBlock extends ContentBlock {
  constructor(networks = [], options = {}) {
    super('social', options);
    this.networks = networks; // [{name: 'facebook', url: '...', icon: '...'}]
    this.iconSize = options.iconSize || '32px';
  }

  render() {
    const icons = this.networks.map(network => `
      <a href="${network.url}" style="display: inline-block; margin: 0 5px;">
        <img src="${network.icon}" alt="${network.name}" width="${this.iconSize}" height="${this.iconSize}">
      </a>
    `).join('');
    
    return `<div style="text-align: center;">${icons}</div>`;
  }
}