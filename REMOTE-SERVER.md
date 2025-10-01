# Remote MCP Server for Salesforce

This is a remote Model Context Protocol (MCP) server that exposes Salesforce functionality via HTTP. It allows you to interact with Salesforce from any MCP client over the network.

## Features

- **HTTP Transport**: Uses HTTP instead of stdio for remote access
- **Header-based Authentication**: Accepts Salesforce credentials as HTTP headers
- **Security**: Optional secret key authentication for tool execution
- **MCP Spec Compliant**: Follows the Model Context Protocol specification
- **All Salesforce Tools**: Includes all the tools from the stdio version

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Server Configuration
PORT=8080                    # Port to run the server on
HOST=0.0.0.0                # Host to bind to
SECRET_KEY=your-secret-key  # Secret key for authentication
REQUIRE_AUTH=true           # Whether to require authentication
```

## Running the Server

```bash
# Start the remote server
npm run start:remote

# Or run directly
node dist/remote-server.js
```

## API Endpoints

### Health Check
```
GET /health
```
Returns the health status of the server.

### Root Information
```
GET /
```
Returns information about the server and available endpoints.

### List Tools
```
GET /tools
```
Returns a list of all available Salesforce tools.

### MCP JSON-RPC Endpoint
```
POST /mcp
```
Main endpoint for MCP JSON-RPC requests.

## Authentication

The server supports two types of authentication:

### 1. Tool Execution Authentication
Required for `tools/call` method. Pass the secret key as a header:
```
x-secret-key: your-secret-key
```

### 2. Salesforce Credentials
Pass Salesforce credentials as headers for each request:
```
x-salesforce-username: your-username@example.com
x-salesforce-password: your-password
x-salesforce-token: your-security-token (optional)
x-salesforce-instance-url: https://login.salesforce.com (optional)
```

**Note**: The connection type is always set to `User_Password` as it's the most common and reliable method for remote access.

## Example Requests

### Initialize
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

### List Tools
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

### Call Tool
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
        "fields": ["Id", "Name"],
        "limit": 10
      }
    },
    "id": 3
  }'
```

## Available Tools

All tools from the stdio version are available:

1. **salesforce_search_objects** - Search for Salesforce objects by pattern
2. **salesforce_describe_object** - Get detailed information about an object
3. **salesforce_query_records** - Query records using SOQL
4. **salesforce_aggregate_query** - Execute aggregate queries with GROUP BY
5. **salesforce_dml_records** - Perform DML operations (insert, update, delete, upsert)
6. **salesforce_manage_object** - Create or update custom objects
7. **salesforce_manage_field** - Create or update custom fields
8. **salesforce_manage_field_permissions** - Manage field-level security
9. **salesforce_search_all** - Search across multiple objects using SOSL
10. **salesforce_read_apex** - Read Apex classes
11. **salesforce_write_apex** - Create or update Apex classes
12. **salesforce_read_apex_trigger** - Read Apex triggers
13. **salesforce_write_apex_trigger** - Create or update Apex triggers
14. **salesforce_execute_anonymous** - Execute anonymous Apex code
15. **salesforce_manage_debug_logs** - Manage debug logs

## Deployment

### Docker
Create a `Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8080

CMD ["node", "dist/remote-server.js"]
```

Build and run:
```bash
docker build -t salesforce-mcp-server .
docker run -p 8080:8080 -e SECRET_KEY=your-secret-key salesforce-mcp-server
```

### Cloud Providers
The server can be deployed to any cloud provider that supports Node.js applications:
- Google Cloud Run
- AWS Elastic Beanstalk
- Azure App Service
- Heroku
- Railway
- Render

## Security Considerations

1. **Always use HTTPS in production** to protect credentials in transit
2. **Set a strong SECRET_KEY** for tool execution authentication
3. **Consider rate limiting** to prevent abuse
4. **Log all tool executions** for audit purposes
5. **Use environment variables** for sensitive configuration
6. **Implement IP whitelisting** if possible
7. **Rotate credentials regularly**

## Differences from Stdio Version

| Feature | Stdio Version | Remote Version |
|---------|--------------|----------------|
| Transport | stdin/stdout | HTTP |
| Authentication | Environment variables only | Headers + environment variables |
| Connection Type | Configurable | Always User_Password |
| Deployment | Local only | Can be deployed remotely |
| Discovery | N/A | Supports /tools endpoint |

## Troubleshooting

### Connection Issues
- Verify Salesforce credentials are correct
- Check if your IP is whitelisted in Salesforce
- Ensure the instance URL is correct

### Authentication Errors
- Verify the x-secret-key header is set correctly
- Check that REQUIRE_AUTH is set appropriately

### Tool Execution Failures
- Check the Salesforce credentials headers
- Verify the user has the necessary permissions
- Review server logs for detailed error messages

## Support

For issues and questions:
- Check the main README.md for general information
- Review Salesforce documentation for tool-specific questions
- Check server logs for detailed error messages

