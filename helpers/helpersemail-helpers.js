export class EmailHelpers {
  constructor(mcServer) {
    this.server = mcServer;
  }
  
  async createEmail({ name, subject, content, folderId }) {
    return await this.server.handleRestRequest({
      method: 'POST',
      path: '/asset/v1/content/assets',
      body: {
        name,
        subject,
        htmlContent: content,
        customerKey: this.generateKey(name),
        category: { id: folderId },
        assetType: { id: 207 }, // HTML Email
        status: { id: 1 } // Draft
      }
    });
  }
  
  generateKey(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 36) + '_' + Date.now();
  }
}