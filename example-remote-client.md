# Example Remote MCP Client Usage

This document shows how to use the remote Salesforce MCP server from various clients.

## Using curl

### Initialize the connection
```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {},
    "id": 1
  }'
```

### List available tools
```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'
```

### Query Salesforce records
```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "x-secret-key: your-secret-key" \
  -H "x-salesforce-username: your-username@example.com" \
  -H "x-salesforce-password: your-password" \
  -H "x-salesforce-token: your-security-token" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "salesforce_query_records",
      "arguments": {
        "objectName": "Account",
        "fields": ["Id", "Name", "Industry"],
        "limit": 5
      }
    },
    "id": 3
  }'
```

## Using JavaScript/TypeScript

```typescript
interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: number;
}

interface MCPResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  id: number;
}

class SalesforceMCPClient {
  private baseUrl: string;
  private secretKey: string;
  private salesforceCredentials: {
    username: string;
    password: string;
    token?: string;
    instanceUrl?: string;
  };
  private requestId: number = 0;

  constructor(
    baseUrl: string,
    secretKey: string,
    salesforceCredentials: {
      username: string;
      password: string;
      token?: string;
      instanceUrl?: string;
    }
  ) {
    this.baseUrl = baseUrl;
    this.secretKey = secretKey;
    this.salesforceCredentials = salesforceCredentials;
  }

  private async request(method: string, params?: any): Promise<MCPResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication headers for tools/call
    if (method === 'tools/call') {
      headers['x-secret-key'] = this.secretKey;
      headers['x-salesforce-username'] = this.salesforceCredentials.username;
      headers['x-salesforce-password'] = this.salesforceCredentials.password;
      if (this.salesforceCredentials.token) {
        headers['x-salesforce-token'] = this.salesforceCredentials.token;
      }
      if (this.salesforceCredentials.instanceUrl) {
        headers['x-salesforce-instance-url'] = this.salesforceCredentials.instanceUrl;
      }
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: ++this.requestId,
    };

    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    return response.json();
  }

  async initialize() {
    return this.request('initialize');
  }

  async listTools() {
    return this.request('tools/list');
  }

  async callTool(name: string, args: any) {
    return this.request('tools/call', {
      name,
      arguments: args,
    });
  }

  // Helper methods for specific tools
  async queryRecords(objectName: string, fields: string[], whereClause?: string, limit?: number) {
    return this.callTool('salesforce_query_records', {
      objectName,
      fields,
      whereClause,
      limit,
    });
  }

  async searchObjects(searchPattern: string) {
    return this.callTool('salesforce_search_objects', {
      searchPattern,
    });
  }

  async describeObject(objectName: string) {
    return this.callTool('salesforce_describe_object', {
      objectName,
    });
  }

  async dmlRecords(operation: 'insert' | 'update' | 'delete' | 'upsert', objectName: string, records: any[], externalIdField?: string) {
    return this.callTool('salesforce_dml_records', {
      operation,
      objectName,
      records,
      externalIdField,
    });
  }
}

// Example usage
async function main() {
  const client = new SalesforceMCPClient(
    'http://localhost:8080',
    'your-secret-key',
    {
      username: 'your-username@example.com',
      password: 'your-password',
      token: 'your-security-token',
      instanceUrl: 'https://login.salesforce.com',
    }
  );

  // Initialize
  const initResponse = await client.initialize();
  console.log('Initialized:', initResponse);

  // List tools
  const toolsResponse = await client.listTools();
  console.log('Available tools:', toolsResponse.result?.tools?.length);

  // Query accounts
  const queryResponse = await client.queryRecords('Account', ['Id', 'Name', 'Industry'], undefined, 5);
  console.log('Query result:', queryResponse.result?.content[0]?.text);
}

main().catch(console.error);
```

## Using Python

```python
import requests
import json

class SalesforceMCPClient:
    def __init__(self, base_url, secret_key, salesforce_credentials):
        self.base_url = base_url
        self.secret_key = secret_key
        self.salesforce_credentials = salesforce_credentials
        self.request_id = 0

    def _request(self, method, params=None):
        headers = {
            'Content-Type': 'application/json',
        }

        # Add authentication headers for tools/call
        if method == 'tools/call':
            headers['x-secret-key'] = self.secret_key
            headers['x-salesforce-username'] = self.salesforce_credentials['username']
            headers['x-salesforce-password'] = self.salesforce_credentials['password']
            if 'token' in self.salesforce_credentials:
                headers['x-salesforce-token'] = self.salesforce_credentials['token']
            if 'instance_url' in self.salesforce_credentials:
                headers['x-salesforce-instance-url'] = self.salesforce_credentials['instance_url']

        self.request_id += 1
        request_body = {
            'jsonrpc': '2.0',
            'method': method,
            'params': params or {},
            'id': self.request_id,
        }

        response = requests.post(
            f'{self.base_url}/mcp',
            headers=headers,
            json=request_body
        )
        
        return response.json()

    def initialize(self):
        return self._request('initialize')

    def list_tools(self):
        return self._request('tools/list')

    def call_tool(self, name, arguments):
        return self._request('tools/call', {
            'name': name,
            'arguments': arguments
        })

    # Helper methods
    def query_records(self, object_name, fields, where_clause=None, limit=None):
        args = {
            'objectName': object_name,
            'fields': fields
        }
        if where_clause:
            args['whereClause'] = where_clause
        if limit:
            args['limit'] = limit
        
        return self.call_tool('salesforce_query_records', args)

    def search_objects(self, search_pattern):
        return self.call_tool('salesforce_search_objects', {
            'searchPattern': search_pattern
        })

    def describe_object(self, object_name):
        return self.call_tool('salesforce_describe_object', {
            'objectName': object_name
        })

# Example usage
if __name__ == '__main__':
    client = SalesforceMCPClient(
        base_url='http://localhost:8080',
        secret_key='your-secret-key',
        salesforce_credentials={
            'username': 'your-username@example.com',
            'password': 'your-password',
            'token': 'your-security-token',
            'instance_url': 'https://login.salesforce.com'
        }
    )

    # Initialize
    init_response = client.initialize()
    print('Initialized:', init_response)

    # List tools
    tools_response = client.list_tools()
    print(f"Available tools: {len(tools_response['result']['tools'])}")

    # Query accounts
    query_response = client.query_records('Account', ['Id', 'Name', 'Industry'], limit=5)
    print('Query result:', query_response['result']['content'][0]['text'])
```

## Security Best Practices

1. **Always use HTTPS in production** - Never send credentials over plain HTTP
2. **Store credentials securely** - Use environment variables or secure vaults
3. **Rotate the SECRET_KEY regularly**
4. **Use IP whitelisting** when possible
5. **Monitor access logs** for suspicious activity
6. **Set up rate limiting** to prevent abuse

## Environment Variables for Client

When deploying the client, use environment variables:

```bash
export SALESFORCE_MCP_URL="https://your-server.com"
export SALESFORCE_MCP_SECRET="your-secret-key"
export SALESFORCE_USERNAME="your-username@example.com"
export SALESFORCE_PASSWORD="your-password"
export SALESFORCE_TOKEN="your-security-token"
```

Then in your code:
```typescript
const client = new SalesforceMCPClient(
  process.env.SALESFORCE_MCP_URL!,
  process.env.SALESFORCE_MCP_SECRET!,
  {
    username: process.env.SALESFORCE_USERNAME!,
    password: process.env.SALESFORCE_PASSWORD!,
    token: process.env.SALESFORCE_TOKEN,
  }
);
```

