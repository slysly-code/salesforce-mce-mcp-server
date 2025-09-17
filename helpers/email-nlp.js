// helpers/email-nlp.js
export class EmailNLPBuilder {
  constructor(emailBuilder) {
    this.builder = emailBuilder;
    this.intents = {
      'add_header': /add.*header|create.*header|include.*logo/i,
      'add_image': /add.*image|insert.*image|include.*picture/i,
      'add_text': /add.*text|write.*content|include.*paragraph/i,
      'add_button': /add.*button|create.*cta|call to action/i,
      'add_columns': /two.*column|split.*layout|side by side/i,
      'add_personalization': /add.*name|personalize|dynamic.*content/i,
      'add_footer': /add.*footer|imprint|unsubscribe/i
    };
  }

  async processCommand(command) {
    for (const [intent, pattern] of Object.entries(this.intents)) {
      if (pattern.test(command)) {
        return this.handleIntent(intent, command);
      }
    }
    
    return {
      error: "I didn't understand. Try: 'Add a header with logo' or 'Create two columns with image and text'"
    };
  }

  handleIntent(intent, command) {
    switch(intent) {
      case 'add_header':
        return this.addHeader(command);
      case 'add_image':
        return this.addImage(command);
      case 'add_text':
        return this.addText(command);
      case 'add_button':
        return this.addButton(command);
      case 'add_columns':
        return this.addColumns(command);
      case 'add_personalization':
        return this.addPersonalization(command);
      case 'add_footer':
        return this.addFooter(command);
    }
  }

  addHeader(command) {
    const commonBlocks = ContentLibrary.getCommonBlocks();
    this.builder.addSection(
      new Section().addContent(commonBlocks.header.logo)
    );
    return { success: true, message: "Header with logo added" };
  }

  addImage(command) {
    // Extract image details from command
    const internal = /internal|repository|asset/i.test(command);
    const source = internal 
      ? 'content-builder/assets/default-image.png'
      : 'https://via.placeholder.com/600x300';
    
    this.builder.addSection(
      new Section().addContent(
        new ImageBlock(source, { alt: 'Image' })
      )
    );
    return { success: true, message: "Image block added" };
  }

  addColumns(command) {
    // Parse column content from command
    const hasImage = /image/i.test(command);
    const hasText = /text/i.test(command);
    
    const leftContent = hasImage 
      ? new ImageBlock('content-builder/assets/side-image.png')
      : new TextBlock('<p>Left column content</p>');
      
    const rightContent = hasText
      ? new TextBlock('<p>Right column content</p>')
      : new EmptyBlock();
    
    this.builder.addSection(
      new TwoColumnSection(leftContent, rightContent)
    );
    return { success: true, message: "Two-column section added" };
  }
}