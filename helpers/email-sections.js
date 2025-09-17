// helpers/email-sections.js
export class Section {
  constructor(options = {}) {
    this.type = options.type || 'standard';
    this.columns = options.columns || 1;
    this.padding = options.padding || '20px';
    this.backgroundColor = options.backgroundColor || '#ffffff';
    this.content = [];
  }

  addContent(content) {
    this.content.push(content);
    return this;
  }

  render() {
    const wrapper = `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${this.backgroundColor};">
        <tr>
          <td style="padding: ${this.padding};">
            ${this.renderContent()}
          </td>
        </tr>
      </table>
    `;
    return wrapper;
  }

  renderContent() {
    if (this.columns === 1) {
      return this.content.map(c => c.render()).join('');
    } else {
      return this.renderColumns();
    }
  }

  renderColumns() {
    const columnWidth = Math.floor(100 / this.columns);
    let html = '<table width="100%" cellpadding="0" cellspacing="0"><tr>';
    
    for (let i = 0; i < this.columns; i++) {
      const columnContent = this.content[i] || new EmptyBlock();
      html += `
        <td width="${columnWidth}%" valign="top" style="padding: 0 10px;">
          ${columnContent.render()}
        </td>
      `;
    }
    
    html += '</tr></table>';
    return html;
  }
}

export class TwoColumnSection extends Section {
  constructor(leftContent, rightContent, options = {}) {
    super({ ...options, columns: 2 });
    this.content = [leftContent, rightContent];
  }
}

export class ThreeColumnSection extends Section {
  constructor(leftContent, centerContent, rightContent, options = {}) {
    super({ ...options, columns: 3 });
    this.content = [leftContent, centerContent, rightContent];
  }
}