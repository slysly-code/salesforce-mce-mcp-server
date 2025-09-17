// helpers/content-library.js
export class ContentLibrary {
  constructor(mcServer) {
    this.server = mcServer;
  }

  // Fetch existing content blocks
  async getContentBlock(key) {
    const response = await this.server.handleRestRequest({
      method: 'GET',
      path: `/asset/v1/content/assets`,
      query: {
        $filter: `customerKey eq '${key}'`
      }
    });
    
    return JSON.parse(response.content[0].text);
  }

  // Common reusable blocks
  static getCommonBlocks() {
    return {
      header: {
        logo: new ImageBlock('content-builder/assets/logo.png', {
          width: '200px',
          alt: 'Company Logo'
        }),
        
        navigation: new TextBlock(`
          <table width="100%">
            <tr>
              <td align="center">
                <a href="#" style="margin: 0 10px;">Home</a>
                <a href="#" style="margin: 0 10px;">Products</a>
                <a href="#" style="margin: 0 10px;">About</a>
                <a href="#" style="margin: 0 10px;">Contact</a>
              </td>
            </tr>
          </table>
        `)
      },
      
      footer: {
        imprint: new TextBlock(`
          <div style="text-align: center; font-size: 12px; color: #666;">
            <p>© 2024 Your Company. All rights reserved.</p>
            <p>123 Main Street, City, State 12345</p>
            <p>
              <a href="%%unsub_center_url%%">Unsubscribe</a> | 
              <a href="%%view_as_webpage%%">View Online</a> | 
              <a href="/privacy">Privacy Policy</a>
            </p>
          </div>
        `),
        
        social: new SocialBlock([
          { name: 'Facebook', url: 'https://facebook.com/company', icon: '/assets/fb-icon.png' },
          { name: 'Twitter', url: 'https://twitter.com/company', icon: '/assets/tw-icon.png' },
          { name: 'LinkedIn', url: 'https://linkedin.com/company', icon: '/assets/li-icon.png' }
        ])
      },
      
      personalization: {
        greeting: new PersonalizationBlock('FirstName', 'Valued Customer', {
          prefix: 'Dear ',
          suffix: ','
        }),
        
        salutation: new TextBlock(`
          Dear %%FirstName%% %%LastName%%,<br>
          %%[ IF NOT EMPTY(CompanyName) THEN ]%%
            From %%CompanyName%%<br>
          %%[ ENDIF ]%%
        `)
      }
    };
  }
}