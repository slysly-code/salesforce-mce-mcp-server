// helpers/email-builder.js
export class EmailBuilder {
  constructor(mcServer) {
    this.server = mcServer;
    this.sections = [];
    this.metadata = {
      name: '',
      subject: '',
      preheader: '',
      categoryId: null,
      template: null
    };
  }

  // Initialize email with metadata
  create(name, subject, options = {}) {
    this.metadata = {
      name,
      subject,
      preheader: options.preheader || '',
      categoryId: options.folderId || null,
      template: options.templateId || null,
      customerKey: this.generateKey(name)
    };
    return this;
  }

  // Add a section/block to the email
  addSection(section) {
    this.sections.push(section);
    return this;
  }

  // Build and save the email
  async build() {
    const htmlContent = this.generateHTML();
    
    const emailData = {
      name: this.metadata.name,
      subject: this.metadata.subject,
      preheader: this.metadata.preheader,
      htmlContent: htmlContent,
      customerKey: this.metadata.customerKey,
      assetType: {
        name: 'htmlemail',
        id: 207
      },
      category: {
        id: this.metadata.categoryId
      },
      views: {
        html: {
          content: htmlContent
        }
      }
    };

    return await this.server.handleRestRequest({
      method: 'POST',
      path: '/asset/v1/content/assets',
      body: emailData
    });
  }

  generateHTML() {
    let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>';
    
    for (const section of this.sections) {
      html += section.render();
    }
    
    html += '</body></html>';
    return html;
  }

  generateKey(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 36) + '_' + Date.now();
  }
}