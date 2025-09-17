#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const parseXml = promisify(parseString);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load all documentation files
let documentation = {};
const docFiles = ['mcp-documentation.json', 'journey-builder-examples.json', 'soap-examples.json'];

docFiles.forEach(file => {
  try {
    // Fix: Load from docs folder instead of root
    const docPath = join(__dirname, 'docs', file); // Add 'docs' to path
    const content = JSON.parse(readFileSync(filePath, 'utf8'));
    const key = file.replace('.json', '').replace(/-/g, '_');
    documentation[key] = content;
    console.error(`✓ Loaded ${file}`);
  } catch (error) {
    console.error(`✗ Could not load ${file}:`, error.message);
  }
});

class MarketingCloudServer {
	
	determineOptimalRoute(operation, params = {}) {
  // Operations that should ALWAYS use REST
  const restPreferred = [
    'list_emails', 'create_email', 'update_email',
    'list_journeys', 'create_journey', 'publish_journey',
    'get_contacts', 'create_contact',
    'list_data_extensions'
  ];
  
  getEmailFilter(type = 'all') {
  const filters = {
    'all': 'assetType.id in (207,208,209)',
    'html': 'assetType.name eq \'htmlemail\'',
    'template': 'assetType.name eq \'templatebasedemail\''
  };
  return filters[type] || filters['all'];
}
  
  // Operations better suited for SOAP
  const soapPreferred = [
    'bulk_data_import', // When rows > 1000
    'complex_retrieve',  // Multi-table queries
    'automation_trigger'
  ];
  
  // Check data size for intelligent routing
  if (operation.includes('data') && params.rowCount > 1000) {
    console.error(`Routing to SOAP for bulk operation (${params.rowCount} rows)`);
    return 'SOAP';
  }
  
  if (restPreferred.includes(operation)) {
    console.error(`Routing to REST for ${operation} (optimal performance)`);
    return 'REST';
  }
  
  if (soapPreferred.includes(operation)) {
    console.error(`Routing to SOAP for ${operation} (better for this operation)`);
    return 'SOAP';
  }
  
  // Default to REST
  console.error(`Defaulting to REST for ${operation}`);
  return 'REST';
}
	
  constructor() {
    this.server = new Server(
      {
        name: 'salesforce-marketing-cloud-engagement',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tokens = new Map(); // Cache tokens by BU
    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'mce_v1_health',
          description: 'Health check tool. Echoes input and confirms server readiness.',
          inputSchema: {
            type: 'object',
            properties: {
              ping: {
                type: 'string',
                default: 'pong',
                description: 'Echo payload',
              },
            },
          },
        },
        {
          name: 'mce_v1_rest_request',
          description: 'Generic REST request for Salesforce Marketing Cloud Engagement',
          inputSchema: {
            type: 'object',
            properties: {
              method: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
              },
              path: {
                type: 'string',
                description: 'Path under REST base, e.g., /asset/v1/content/assets',
              },
              query: {
                type: 'object',
                description: 'Query parameters',
              },
              headers: {
                type: 'object',
                description: 'Additional headers',
              },
              body: {
                type: ['object', 'string'],
                description: 'Request body',
              },
              businessUnitId: {
                type: 'string',
                description: 'Business Unit ID (MID) for scoped token',
              },
            },
            required: ['method', 'path'],
          },
        },
        {
          name: 'mce_v1_soap_request',
          description: 'Generic SOAP request for Salesforce Marketing Cloud Engagement',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['Create', 'Retrieve', 'Update', 'Delete', 'Perform', 'Configure'],
                description: 'SOAP action to perform',
              },
              objectType: {
                type: 'string',
                description: 'Marketing Cloud object type (e.g., DataExtension, Email)',
              },
              properties: {
                type: 'array',
                items: { type: 'string' },
                description: 'Properties to retrieve (for Retrieve action)',
              },
              filter: {
                type: 'object',
                description: 'Filter criteria for Retrieve',
              },
              objects: {
                type: 'array',
                description: 'Objects to create/update',
              },
              options: {
                type: 'object',
                description: 'SOAP options',
              },
              businessUnitId: {
                type: 'string',
                description: 'Business Unit ID (MID) for scoped operations',
              },
            },
            required: ['action', 'objectType'],
          },
        },
        {
          name: 'mce_v1_documentation',
          description: 'Returns Marketing Cloud Engagement documentation and examples',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'mce_v1_health':
            return {
              content: [
                {
                  type: 'text',
                  text: `ok=true echo=${args.ping || 'pong'}`,
                },
              ],
            };

          case 'mce_v1_rest_request':
            return await this.handleRestRequest(args);

          case 'mce_v1_soap_request':
            return await this.handleSoapRequest(args);

          case 'mce_v1_documentation':
            return {
              content: [
                {
                  type: 'text',
                  text: this.getDocumentation(),
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Error in ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async getAccessToken(businessUnitId) {
    // Check cache
    const cached = this.tokens.get(businessUnitId || 'default');
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    const subdomain = process.env.MCE_SUBDOMAIN;
    const clientId = process.env.MCE_CLIENT_ID;
    const clientSecret = process.env.MCE_CLIENT_SECRET;

    if (!subdomain || !clientId || !clientSecret) {
      throw new Error('Missing required environment variables: MCE_SUBDOMAIN, MCE_CLIENT_ID, MCE_CLIENT_SECRET');
    }

    const tokenUrl = `https://${subdomain}.auth.marketingcloudapis.com/v2/token`;
    const tokenData = {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    };

    if (businessUnitId) {
      tokenData.account_id = businessUnitId;
    }

    try {
      const response = await axios.post(tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const tokenInfo = {
        access_token: response.data.access_token,
        rest_instance_url: response.data.rest_instance_url,
        soap_instance_url: response.data.soap_instance_url,
        expires_in: response.data.expires_in,
        expiresAt: Date.now() + (response.data.expires_in - 60) * 1000,
      };

      this.tokens.set(businessUnitId || 'default', tokenInfo);
      return tokenInfo;
    } catch (error) {
      console.error('Token acquisition failed:', error.response?.data || error.message);
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  async handleRestRequest(args) {
    try {
      const tokenInfo = await this.getAccessToken(args.businessUnitId || process.env.MCE_DEFAULT_MID);
      
      // Build URL
      const baseUrl = tokenInfo.rest_instance_url;
      let url = `${baseUrl}${args.path}`;
      
      // Add query parameters
      if (args.query) {
        const params = new URLSearchParams();
        Object.entries(args.query).forEach(([key, value]) => {
          if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value);
          }
        });
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      // Build headers
      const headers = {
        'Authorization': `Bearer ${tokenInfo.access_token}`,
        'Content-Type': 'application/json',
        ...args.headers,
      };

      console.error(`Making ${args.method} request to: ${url}`);

      // Make request
      const response = await axios({
        method: args.method,
        url: url,
        headers: headers,
        data: args.body,
        validateStatus: () => true, // Don't throw on any status
      });

      console.error(`Response status: ${response.status}`);
      
      // Return the actual response data
      let responseContent = '';
      
      if (response.data) {
        if (typeof response.data === 'object') {
          responseContent = JSON.stringify(response.data, null, 2);
        } else {
          responseContent = String(response.data);
        }
      } else {
        responseContent = `HTTP ${response.status} (empty response)`;
      }

      console.error(`Response preview: ${responseContent.substring(0, 500)}`);

      return {
        content: [
          {
            type: 'text',
            text: responseContent,
          },
        ],
      };
    } catch (error) {
      console.error('REST request failed:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  }

  async handleSoapRequest(args) {
    try {
      console.error('\n=== SOAP REQUEST DEBUG START ===');
      console.error('Input args:', JSON.stringify(args, null, 2));
      
      const tokenInfo = await this.getAccessToken(args.businessUnitId || process.env.MCE_DEFAULT_MID);
      console.error('Token acquired successfully');
      console.error('SOAP Instance URL:', tokenInfo.soap_instance_url);
      
      // Use the soap_instance_url from token response
      const soapUrl = tokenInfo.soap_instance_url + 'Service.asmx';
      console.error('Full SOAP URL:', soapUrl);
      
      // Build SOAP envelope based on action
      const soapEnvelope = this.buildSoapEnvelope(args, tokenInfo.access_token);
      console.error('\n=== SOAP ENVELOPE ===');
      console.error(soapEnvelope);
      console.error('=== END SOAP ENVELOPE ===\n');
      
      // Make SOAP request
      console.error('Sending SOAP request...');
      const response = await axios.post(soapUrl, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml; charset=UTF-8',
          'SOAPAction': args.action,
        },
        maxBodyLength: Infinity,
        validateStatus: () => true,
      });

      console.error('\n=== SOAP RESPONSE ===');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Headers:', JSON.stringify(response.headers, null, 2));
      console.error('Response Data (first 2000 chars):');
      console.error(String(response.data).substring(0, 2000));
      console.error('=== END SOAP RESPONSE ===\n');

      // If it's an error response, try to parse it
      if (response.status !== 200) {
        console.error('Non-200 status, attempting to parse error...');
        
        try {
          const parsed = await parseXml(response.data, {
            explicitArray: false,
            ignoreAttrs: true,
          });
          console.error('Parsed error response:', JSON.stringify(parsed, null, 2));
          
          // Try to extract fault details
          if (parsed['soap:Envelope'] && parsed['soap:Envelope']['soap:Body']) {
            const body = parsed['soap:Envelope']['soap:Body'];
            if (body['soap:Fault']) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `SOAP Fault: ${JSON.stringify(body['soap:Fault'], null, 2)}`,
                  },
                ],
              };
            }
          }
        } catch (e) {
          console.error('Could not parse error as XML:', e.message);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `SOAP Error (${response.status}): ${response.data}`,
            },
          ],
        };
      }

      // Parse successful XML response
      console.error('Attempting to parse successful response...');
      try {
        const parsed = await parseXml(response.data, {
          explicitArray: false,
          ignoreAttrs: true,
          tagNameProcessors: [(name) => name.replace(':', '_')],
        });
        
        console.error('Successfully parsed response');
        console.error('=== SOAP REQUEST DEBUG END ===\n');
        
        // Extract the response body
        let responseBody = parsed;
        if (parsed['soap_Envelope'] && parsed['soap_Envelope']['soap_Body']) {
          responseBody = parsed['soap_Envelope']['soap_Body'];
        } else if (parsed['s_Envelope'] && parsed['s_Envelope']['s_Body']) {
          responseBody = parsed['s_Envelope']['s_Body'];
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(responseBody, null, 2),
            },
          ],
        };
      } catch (parseError) {
        console.error('XML Parse Error:', parseError);
        return {
          content: [
            {
              type: 'text',
              text: response.data,
            },
          ],
        };
      }
    } catch (error) {
      console.error('=== SOAP REQUEST EXCEPTION ===');
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      if (error.response) {
        console.error('Error Response Status:', error.response.status);
        console.error('Error Response Data:', error.response.data);
      }
      console.error('=== END SOAP REQUEST EXCEPTION ===\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `SOAP Error: ${error.message}`,
          },
        ],
      };
    }
  }

  buildSoapEnvelope(args, accessToken) {
    const subdomain = process.env.MCE_SUBDOMAIN;
    
    let body = '';
    
    if (args.action === 'Create') {
      body = this.buildCreateBody(args);
    } else if (args.action === 'Retrieve') {
      body = this.buildRetrieveBody(args);
    } else if (args.action === 'Update') {
      body = this.buildUpdateBody(args);
    } else if (args.action === 'Delete') {
      body = this.buildDeleteBody(args);
    } else {
      throw new Error(`Unsupported SOAP action: ${args.action}`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <a:Action s:mustUnderstand="1">${args.action}</a:Action>
    <a:To s:mustUnderstand="1">https://${subdomain}.soap.marketingcloudapis.com/Service.asmx</a:To>
    <fueloauth xmlns="http://exacttarget.com">${accessToken}</fueloauth>
  </s:Header>
  <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    ${body}
  </s:Body>
</s:Envelope>`;
  }

 buildCreateBody(args) {
  if (args.objectType === 'DataExtension') {
    const de = args.objects && args.objects[0] || {};
    let fieldsXml = '';
    
    if (de.fields && de.fields.length > 0) {
      fieldsXml = de.fields.map(field => `
      <Fields>
        <Field>
          <Name>${field.name}</Name>
          <FieldType>${field.fieldType || 'Text'}</FieldType>
          ${field.maxLength ? `<MaxLength>${field.maxLength}</MaxLength>` : ''}
          ${field.isPrimaryKey ? `<IsPrimaryKey>true</IsPrimaryKey>` : ''}
          ${field.isRequired ? `<IsRequired>true</IsRequired>` : ''}
        </Field>
      </Fields>`).join('');
    }

    return `
    <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <Objects xsi:type="DataExtension">
        <CustomerKey>${de.customerKey || de.name}</CustomerKey>
        <Name>${de.name}</Name>
        ${de.description ? `<Description>${de.description}</Description>` : ''}
        ${de.isSendable ? `<IsSendable>true</IsSendable>` : ''}
        ${de.isSendable && de.sendableDataExtensionField ? `
        <SendableDataExtensionField>
          <Name>${de.sendableDataExtensionField}</Name>
          <FieldType>EmailAddress</FieldType>
        </SendableDataExtensionField>
        <SendableSubscriberField>
          <Name>${de.sendableSubscriberField || '_SubscriberKey'}</Name>
        </SendableSubscriberField>` : ''}
        ${fieldsXml}
      </Objects>
    </CreateRequest>`;
  }
    
    // Generic create for other object types
    const obj = args.objects && args.objects[0] || {};
    return `
    <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <Objects xsi:type="${args.objectType}">
        ${this.buildObjectProperties(obj)}
      </Objects>
    </CreateRequest>`;
  }

  buildRetrieveBody(args) {
    const filter = args.filter ? this.buildFilter(args.filter) : '';
    const properties = args.properties ? args.properties.map(p => `<Properties>${p}</Properties>`).join('') : '';
    
    return `
    <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <RetrieveRequest>
        <ObjectType>${args.objectType}</ObjectType>
        ${properties}
        ${filter}
      </RetrieveRequest>
    </RetrieveRequestMsg>`;
  }

  buildUpdateBody(args) {
    const obj = args.objects && args.objects[0] || {};
    return `
    <UpdateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <Objects xsi:type="${args.objectType}">
        ${this.buildObjectProperties(obj)}
      </Objects>
    </UpdateRequest>`;
  }

  buildDeleteBody(args) {
    const obj = args.objects && args.objects[0] || {};
    return `
    <DeleteRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <Objects xsi:type="${args.objectType}">
        ${this.buildObjectProperties(obj)}
      </Objects>
    </DeleteRequest>`;
  }

  buildFilter(filter) {
    if (!filter) return '';
    
    return `
      <Filter xsi:type="SimpleFilterPart">
        <Property>${filter.property}</Property>
        <SimpleOperator>${filter.operator}</SimpleOperator>
        <Value>${filter.value}</Value>
      </Filter>`;
  }

  buildObjectProperties(obj) {
    if (!obj) return '';
    
    return Object.entries(obj)
      .map(([key, value]) => {
        // Skip complex objects for now
        if (typeof value === 'object' && !Array.isArray(value)) {
          return '';
        }
        if (Array.isArray(value)) {
          return '';
        }
        return `<${key}>${value}</${key}>`;
      })
      .join('');
  }

  getDocumentation() {
    return JSON.stringify(documentation, null, 2);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Marketing Cloud Engagement MCP server running v1.0.0');
    console.error('Documentation files loaded:', Object.keys(documentation).join(', '));
  }
}

const server = new MarketingCloudServer();
server.run().catch(console.error);