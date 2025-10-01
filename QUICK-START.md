# Quick Start Guide - Remote MCP Server

## What Was Built

Your Salesforce MCP server now has **two modes**:

1. **Local Mode** (original) - Works with Claude Desktop via stdio
2. **Remote Mode** (new) - HTTP server for remote deployment

## Quick Start - Remote Server

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Set Environment Variables
Create a `.env` file:
```bash
PORT=8080
HOST=0.0.0.0
SECRET_KEY=your-secret-key-here
REQUIRE_AUTH=true
```

### 4. Start the Server
```bash
npm run start:remote
```

The server will start on `http://localhost:8080`

### 5. Test It
```bash
# Health check
curl http://localhost:8080/health

# List tools
curl http://localhost:8080/tools

# Initialize MCP connection
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

### 6. Call a Tool
```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "x-secret-key: your-secret-key" \
  -H "x-salesforce-username: your-username@example.com" \
  -H "x-salesforce-password: your-password" \
  -H "x-salesforce-token: your-security-token" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"salesforce_query_records",
      "arguments":{
        "objectName":"Account",
        "fields":["Id","Name"],
        "limit":5
      }
    },
    "id":2
  }'
```

## Docker Deployment

### Build the Docker Image
```bash
docker build -t salesforce-mcp-server .
```

### Run the Container
```bash
docker run -p 8080:8080 \
  -e SECRET_KEY=your-secret-key \
  -e REQUIRE_AUTH=true \
  salesforce-mcp-server
```

## Key Features

### Authentication Headers
Pass Salesforce credentials in **every tool call request**:
- `x-secret-key` - Your server secret key
- `x-salesforce-username` - Salesforce username
- `x-salesforce-password` - Salesforce password
- `x-salesforce-token` - Security token (optional)
- `x-salesforce-instance-url` - Instance URL (optional, defaults to https://login.salesforce.com)

### Connection Type
The server **always uses User_Password authentication** - no need to specify the connection type.

### MCP Methods Supported
- `initialize` - Start MCP session (no auth required)
- `tools/list` - Get available tools (no auth required)
- `tools/call` - Execute a tool (requires auth)

## Files Created

### Core Implementation
- `/src/remote-server.ts` - Main HTTP server
- `/Dockerfile` - Docker configuration
- `/.dockerignore` - Docker build exclusions

### Documentation
- `/REMOTE-SERVER.md` - Complete remote server documentation
- `/example-remote-client.md` - Client implementation examples
- `/CONVERSION-SUMMARY.md` - Technical conversion details
- `/QUICK-START.md` - This file

### Testing
- `/test-remote-server.sh` - Server startup test

## Files Modified

### Dependencies
- `/package.json` - Added Express, CORS, and types

### Connection Layer
- `/src/utils/connection.ts` - Accepts credentials from parameters
- `/src/types/connection.ts` - Extended with credential fields

### Documentation
- `/README.md` - Added deployment options section

## What Stays the Same

The **original stdio server** (`/src/index.ts`) is **completely unchanged** and works exactly as before with Claude Desktop.

## Next Steps

### For Local Development
Just keep using the stdio version with Claude Desktop as you always have.

### For Remote Deployment
1. Choose a cloud platform (Cloud Run, AWS, Azure, etc.)
2. Configure HTTPS/SSL
3. Set up monitoring
4. Deploy the Docker container
5. Update clients to use the remote endpoint

## Documentation Links

- **Remote Server Details**: [REMOTE-SERVER.md](REMOTE-SERVER.md)
- **Client Examples**: [example-remote-client.md](example-remote-client.md)
- **Technical Details**: [CONVERSION-SUMMARY.md](CONVERSION-SUMMARY.md)
- **Main README**: [README.md](README.md)

## Security Reminders

⚠️ **Always use HTTPS in production**
⚠️ **Never commit credentials to git**
⚠️ **Set a strong SECRET_KEY**
⚠️ **Monitor access logs**
⚠️ **Implement rate limiting**

## Support

For issues or questions:
1. Check the documentation files
2. Review the example client code
3. Test with the included test script
4. File an issue on GitHub

## Success! 🎉

Your Salesforce MCP server is now ready for both local and remote deployment!

