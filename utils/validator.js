export class Validator {
  static validateEmailParams(params) {
    const required = ['name', 'subject', 'content'];
    const missing = required.filter(field => !params[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    if (params.subject.length > 100) {
      throw new Error('Subject line must be 100 characters or less');
    }
    
    return true;
  }
}