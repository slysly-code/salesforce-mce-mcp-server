// helpers/email-templates.js
export class EmailTemplates {
  static getWelcomeTemplate(firstName = 'Friend', productName = 'Our Service') {
    const builder = new EmailBuilder();
    
    return builder
      .create('Welcome Email', `Welcome to ${productName}!`)
      .addSection(
        new Section().addContent(
          new ImageBlock('https://via.placeholder.com/600x200', {
            alt: 'Welcome Banner'
          })
        )
      )
      .addSection(
        new Section().addContent(
          new TextBlock(`
            <h1>Welcome, ${new PersonalizationBlock('FirstName', firstName).render()}!</h1>
            <p>We're thrilled to have you join our community.</p>
          `)
        )
      )
      .addSection(
        new TwoColumnSection(
          new ImageBlock('content-builder/assets/icon-feature1.png'),
          new TextBlock('<h3>Feature 1</h3><p>Discover amazing features...</p>')
        )
      )
      .addSection(
        new Section().addContent(
          new ButtonBlock('Get Started', 'https://example.com/start', {
            backgroundColor: '#28a745'
          })
        )
      );
  }

  static getNewsletterTemplate() {
    const builder = new EmailBuilder();
    
    return builder
      .create('Newsletter', 'Your Monthly Update')
      .addSection(
        new Section().addContent(
          new ImageBlock('content-builder/assets/newsletter-header.png')
        )
      )
      .addSection(
        new Section().addContent(
          new PersonalizationBlock('FirstName', 'Subscriber', {
            prefix: '<h2>Hello, ',
            suffix: '!</h2>'
          })
        )
      )
      .addSection(
        new Section().addContent(
          new EditorialBlock('Main article content goes here')
        )
      )
      .addSection(
        new ThreeColumnSection(
          new TextBlock('<h4>Article 1</h4><p>Summary...</p>'),
          new TextBlock('<h4>Article 2</h4><p>Summary...</p>'),
          new TextBlock('<h4>Article 3</h4><p>Summary...</p>')
        )
      );
  }

  static getPromoTemplate(discountPercent = 20, promoCode = 'SAVE20') {
    const builder = new EmailBuilder();
    
    return builder
      .create('Promotional Email', `${discountPercent}% Off - Limited Time!`)
      .addSection(
        new Section({
          backgroundColor: '#ff6b6b',
          padding: '40px'
        }).addContent(
          new TextBlock(
            `<h1 style="color: white; text-align: center;">${discountPercent}% OFF EVERYTHING!</h1>`,
            { style: { color: 'white' } }
          )
        )
      )
      .addSection(
        new Section().addContent(
          new TextBlock(`
            <p style="text-align: center; font-size: 18px;">
              Use code: <strong>${promoCode}</strong>
            </p>
          `)
        )
      )
      .addSection(
        new Section().addContent(
          new ButtonBlock('Shop Now', 'https://example.com/shop', {
            backgroundColor: '#ff6b6b'
          })
        )
      );
  }
}