#!/usr/bin/env node

/**
 * Remote MCP Server for Salesforce
 * A remote MCP server that exposes Salesforce functionality via HTTP
 */

import express, { Request, Response, NextFunction } from 'express';
import * as dotenv from "dotenv";
import cors from 'cors';

import { createSalesforceConnection } from "./utils/connection.js";
import { SEARCH_OBJECTS, handleSearchObjects } from "./tools/search.js";
import { DESCRIBE_OBJECT, handleDescribeObject } from "./tools/describe.js";
import { QUERY_RECORDS, handleQueryRecords, QueryArgs } from "./tools/query.js";
import { AGGREGATE_QUERY, handleAggregateQuery, AggregateQueryArgs } from "./tools/aggregateQuery.js";
import { DML_RECORDS, handleDMLRecords, DMLArgs } from "./tools/dml.js";
import { MANAGE_OBJECT, handleManageObject, ManageObjectArgs } from "./tools/manageObject.js";
import { MANAGE_FIELD, handleManageField, ManageFieldArgs } from "./tools/manageField.js";
import { MANAGE_FIELD_PERMISSIONS, handleManageFieldPermissions, ManageFieldPermissionsArgs } from "./tools/manageFieldPermissions.js";
import { SEARCH_ALL, handleSearchAll, SearchAllArgs, WithClause } from "./tools/searchAll.js";
import { READ_APEX, handleReadApex, ReadApexArgs } from "./tools/readApex.js";
import { WRITE_APEX, handleWriteApex, WriteApexArgs } from "./tools/writeApex.js";
import { READ_APEX_TRIGGER, handleReadApexTrigger, ReadApexTriggerArgs } from "./tools/readApexTrigger.js";
import { WRITE_APEX_TRIGGER, handleWriteApexTrigger, WriteApexTriggerArgs } from "./tools/writeApexTrigger.js";
import { EXECUTE_ANONYMOUS, handleExecuteAnonymous, ExecuteAnonymousArgs } from "./tools/executeAnonymous.js";
import { MANAGE_DEBUG_LOGS, handleManageDebugLogs, ManageDebugLogsArgs } from "./tools/manageDebugLogs.js";
import { ConnectionConfig } from './types/connection.js';

dotenv.config();

// Configuration from environment variables
const SECRET_KEY = process.env.SECRET_KEY || "";
const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";
const REQUIRE_AUTH = (process.env.REQUIRE_AUTH || "true").toLowerCase() === "true";

// List of all tools
const ALL_TOOLS = [
  SEARCH_OBJECTS,
  DESCRIBE_OBJECT,
  QUERY_RECORDS,
  AGGREGATE_QUERY,
  DML_RECORDS,
  MANAGE_OBJECT,
  MANAGE_FIELD,
  MANAGE_FIELD_PERMISSIONS,
  SEARCH_ALL,
  READ_APEX,
  WRITE_APEX,
  READ_APEX_TRIGGER,
  WRITE_APEX_TRIGGER,
  EXECUTE_ANONYMOUS,
  MANAGE_DEBUG_LOGS
];

// Express app
const app = express();
app.use(express.json());
app.use(cors());

// Authentication Middleware
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Skip auth if not required (for local development)
  if (!REQUIRE_AUTH) {
    return next();
  }

  // Skip auth if SECRET_KEY is not configured
  if (!SECRET_KEY) {
    console.warn("SECRET_KEY not configured but REQUIRE_AUTH is true");
    return next();
  }

  // Only check auth for /mcp endpoint with POST method
  if (req.path === "/mcp" && req.method === "POST") {
    try {
      const body = req.body;
      const method = body?.method;

      // Only require auth for tools/call
      if (method === "tools/call") {
        const providedKey = req.headers['x-secret-key'] as string;

        if (!providedKey) {
          console.warn(`Missing x-secret-key header from ${req.ip} for tools/call`);
          return res.status(401).json({
            jsonrpc: "2.0",
            error: {
              code: -32001,
              message: "Authentication required for tool execution"
            },
            id: body?.id
          });
        }

        if (providedKey !== SECRET_KEY) {
          console.warn(`Invalid x-secret-key from ${req.ip} for tools/call`);
          return res.status(401).json({
            jsonrpc: "2.0",
            error: {
              code: -32001,
              message: "Invalid authentication for tool execution"
            },
            id: body?.id
          });
        }
      }
    } catch (error) {
      console.error("Error in auth middleware:", error);
    }
  }

  next();
};

// Salesforce credentials middleware
const salesforceCredentialsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract Salesforce credentials from headers
  const username = req.headers['x-salesforce-username'] as string;
  const password = req.headers['x-salesforce-password'] as string;
  const token = req.headers['x-salesforce-token'] as string;
  const instanceUrl = req.headers['x-salesforce-instance-url'] as string;

  // Store credentials in request context
  (req as any).salesforceConfig = {
    type: 'User_Password', // Always use User_Password as requested
    username,
    password,
    token,
    loginUrl: instanceUrl || 'https://login.salesforce.com'
  } as ConnectionConfig;

  next();
};

app.use(authMiddleware);
app.use(salesforceCredentialsMiddleware);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "healthy", service: "mcp-salesforce-server" });
});

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    service: "MCP Salesforce Server",
    version: "1.0.0",
    description: "Model Context Protocol server for Salesforce operations",
    endpoints: {
      "/health": "Health check endpoint",
      "/mcp": "MCP JSON-RPC endpoint",
      "/tools": "List available tools"
    }
  });
});

// Tools list endpoint
app.get("/tools", (req: Request, res: Response) => {
  res.json({
    tools: ALL_TOOLS
  });
});

// Tool execution helper
async function executeTool(toolName: string, toolArguments: any, connectionConfig: ConnectionConfig) {
  const conn = await createSalesforceConnection(connectionConfig);
  
  switch (toolName) {
    case "salesforce_search_objects": {
      const { searchPattern } = toolArguments as { searchPattern: string };
      if (!searchPattern) throw new Error('searchPattern is required');
      return await handleSearchObjects(conn, searchPattern);
    }

    case "salesforce_describe_object": {
      const { objectName } = toolArguments as { objectName: string };
      if (!objectName) throw new Error('objectName is required');
      return await handleDescribeObject(conn, objectName);
    }

    case "salesforce_query_records": {
      const queryArgs = toolArguments as Record<string, unknown>;
      if (!queryArgs.objectName || !Array.isArray(queryArgs.fields)) {
        throw new Error('objectName and fields array are required for query');
      }
      const validatedArgs: QueryArgs = {
        objectName: queryArgs.objectName as string,
        fields: queryArgs.fields as string[],
        whereClause: queryArgs.whereClause as string | undefined,
        orderBy: queryArgs.orderBy as string | undefined,
        limit: queryArgs.limit as number | undefined
      };
      return await handleQueryRecords(conn, validatedArgs);
    }

    case "salesforce_aggregate_query": {
      const aggregateArgs = toolArguments as Record<string, unknown>;
      if (!aggregateArgs.objectName || !Array.isArray(aggregateArgs.selectFields) || !Array.isArray(aggregateArgs.groupByFields)) {
        throw new Error('objectName, selectFields array, and groupByFields array are required for aggregate query');
      }
      const validatedArgs: AggregateQueryArgs = {
        objectName: aggregateArgs.objectName as string,
        selectFields: aggregateArgs.selectFields as string[],
        groupByFields: aggregateArgs.groupByFields as string[],
        whereClause: aggregateArgs.whereClause as string | undefined,
        havingClause: aggregateArgs.havingClause as string | undefined,
        orderBy: aggregateArgs.orderBy as string | undefined,
        limit: aggregateArgs.limit as number | undefined
      };
      return await handleAggregateQuery(conn, validatedArgs);
    }

    case "salesforce_dml_records": {
      const dmlArgs = toolArguments as Record<string, unknown>;
      if (!dmlArgs.operation || !dmlArgs.objectName || !Array.isArray(dmlArgs.records)) {
        throw new Error('operation, objectName, and records array are required for DML');
      }
      const validatedArgs: DMLArgs = {
        operation: dmlArgs.operation as 'insert' | 'update' | 'delete' | 'upsert',
        objectName: dmlArgs.objectName as string,
        records: dmlArgs.records as Record<string, any>[],
        externalIdField: dmlArgs.externalIdField as string | undefined
      };
      return await handleDMLRecords(conn, validatedArgs);
    }

    case "salesforce_manage_object": {
      const objectArgs = toolArguments as Record<string, unknown>;
      if (!objectArgs.operation || !objectArgs.objectName) {
        throw new Error('operation and objectName are required for object management');
      }
      const validatedArgs: ManageObjectArgs = {
        operation: objectArgs.operation as 'create' | 'update',
        objectName: objectArgs.objectName as string,
        label: objectArgs.label as string | undefined,
        pluralLabel: objectArgs.pluralLabel as string | undefined,
        description: objectArgs.description as string | undefined,
        nameFieldLabel: objectArgs.nameFieldLabel as string | undefined,
        nameFieldType: objectArgs.nameFieldType as 'Text' | 'AutoNumber' | undefined,
        nameFieldFormat: objectArgs.nameFieldFormat as string | undefined,
        sharingModel: objectArgs.sharingModel as 'ReadWrite' | 'Read' | 'Private' | 'ControlledByParent' | undefined
      };
      return await handleManageObject(conn, validatedArgs);
    }

    case "salesforce_manage_field": {
      const fieldArgs = toolArguments as Record<string, unknown>;
      if (!fieldArgs.operation || !fieldArgs.objectName || !fieldArgs.fieldName) {
        throw new Error('operation, objectName, and fieldName are required for field management');
      }
      const validatedArgs: ManageFieldArgs = {
        operation: fieldArgs.operation as 'create' | 'update',
        objectName: fieldArgs.objectName as string,
        fieldName: fieldArgs.fieldName as string,
        label: fieldArgs.label as string | undefined,
        type: fieldArgs.type as string | undefined,
        required: fieldArgs.required as boolean | undefined,
        unique: fieldArgs.unique as boolean | undefined,
        externalId: fieldArgs.externalId as boolean | undefined,
        length: fieldArgs.length as number | undefined,
        precision: fieldArgs.precision as number | undefined,
        scale: fieldArgs.scale as number | undefined,
        referenceTo: fieldArgs.referenceTo as string | undefined,
        relationshipLabel: fieldArgs.relationshipLabel as string | undefined,
        relationshipName: fieldArgs.relationshipName as string | undefined,
        deleteConstraint: fieldArgs.deleteConstraint as 'Cascade' | 'Restrict' | 'SetNull' | undefined,
        picklistValues: fieldArgs.picklistValues as Array<{ label: string; isDefault?: boolean }> | undefined,
        description: fieldArgs.description as string | undefined,
        grantAccessTo: fieldArgs.grantAccessTo as string[] | undefined
      };
      return await handleManageField(conn, validatedArgs);
    }

    case "salesforce_manage_field_permissions": {
      const permArgs = toolArguments as Record<string, unknown>;
      if (!permArgs.operation || !permArgs.objectName || !permArgs.fieldName) {
        throw new Error('operation, objectName, and fieldName are required for field permissions management');
      }
      const validatedArgs: ManageFieldPermissionsArgs = {
        operation: permArgs.operation as 'grant' | 'revoke' | 'view',
        objectName: permArgs.objectName as string,
        fieldName: permArgs.fieldName as string,
        profileNames: permArgs.profileNames as string[] | undefined,
        readable: permArgs.readable as boolean | undefined,
        editable: permArgs.editable as boolean | undefined
      };
      return await handleManageFieldPermissions(conn, validatedArgs);
    }

    case "salesforce_search_all": {
      const searchArgs = toolArguments as Record<string, unknown>;
      if (!searchArgs.searchTerm || !Array.isArray(searchArgs.objects)) {
        throw new Error('searchTerm and objects array are required for search');
      }

      const objects = searchArgs.objects as Array<Record<string, unknown>>;
      if (!objects.every(obj => obj.name && Array.isArray(obj.fields))) {
        throw new Error('Each object must specify name and fields array');
      }

      const validatedArgs: SearchAllArgs = {
        searchTerm: searchArgs.searchTerm as string,
        searchIn: searchArgs.searchIn as "ALL FIELDS" | "NAME FIELDS" | "EMAIL FIELDS" | "PHONE FIELDS" | "SIDEBAR FIELDS" | undefined,
        objects: objects.map(obj => ({
          name: obj.name as string,
          fields: obj.fields as string[],
          where: obj.where as string | undefined,
          orderBy: obj.orderBy as string | undefined,
          limit: obj.limit as number | undefined
        })),
        withClauses: searchArgs.withClauses as WithClause[] | undefined,
        updateable: searchArgs.updateable as boolean | undefined,
        viewable: searchArgs.viewable as boolean | undefined
      };

      return await handleSearchAll(conn, validatedArgs);
    }

    case "salesforce_read_apex": {
      const apexArgs = toolArguments as Record<string, unknown>;
      
      const validatedArgs: ReadApexArgs = {
        className: apexArgs.className as string | undefined,
        namePattern: apexArgs.namePattern as string | undefined,
        includeMetadata: apexArgs.includeMetadata as boolean | undefined
      };

      return await handleReadApex(conn, validatedArgs);
    }

    case "salesforce_write_apex": {
      const apexArgs = toolArguments as Record<string, unknown>;
      if (!apexArgs.operation || !apexArgs.className || !apexArgs.body) {
        throw new Error('operation, className, and body are required for writing Apex');
      }
      
      const validatedArgs: WriteApexArgs = {
        operation: apexArgs.operation as 'create' | 'update',
        className: apexArgs.className as string,
        apiVersion: apexArgs.apiVersion as string | undefined,
        body: apexArgs.body as string
      };

      return await handleWriteApex(conn, validatedArgs);
    }

    case "salesforce_read_apex_trigger": {
      const triggerArgs = toolArguments as Record<string, unknown>;
      
      const validatedArgs: ReadApexTriggerArgs = {
        triggerName: triggerArgs.triggerName as string | undefined,
        namePattern: triggerArgs.namePattern as string | undefined,
        includeMetadata: triggerArgs.includeMetadata as boolean | undefined
      };

      return await handleReadApexTrigger(conn, validatedArgs);
    }

    case "salesforce_write_apex_trigger": {
      const triggerArgs = toolArguments as Record<string, unknown>;
      if (!triggerArgs.operation || !triggerArgs.triggerName || !triggerArgs.body) {
        throw new Error('operation, triggerName, and body are required for writing Apex trigger');
      }
      
      const validatedArgs: WriteApexTriggerArgs = {
        operation: triggerArgs.operation as 'create' | 'update',
        triggerName: triggerArgs.triggerName as string,
        objectName: triggerArgs.objectName as string | undefined,
        apiVersion: triggerArgs.apiVersion as string | undefined,
        body: triggerArgs.body as string
      };

      return await handleWriteApexTrigger(conn, validatedArgs);
    }

    case "salesforce_execute_anonymous": {
      const executeArgs = toolArguments as Record<string, unknown>;
      if (!executeArgs.apexCode) {
        throw new Error('apexCode is required for executing anonymous Apex');
      }
      
      const validatedArgs: ExecuteAnonymousArgs = {
        apexCode: executeArgs.apexCode as string,
        logLevel: executeArgs.logLevel as 'NONE' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'FINE' | 'FINER' | 'FINEST' | undefined
      };

      return await handleExecuteAnonymous(conn, validatedArgs);
    }

    case "salesforce_manage_debug_logs": {
      const debugLogsArgs = toolArguments as Record<string, unknown>;
      if (!debugLogsArgs.operation || !debugLogsArgs.username) {
        throw new Error('operation and username are required for managing debug logs');
      }
      
      const validatedArgs: ManageDebugLogsArgs = {
        operation: debugLogsArgs.operation as 'enable' | 'disable' | 'retrieve',
        username: debugLogsArgs.username as string,
        logLevel: debugLogsArgs.logLevel as 'NONE' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'FINE' | 'FINER' | 'FINEST' | undefined,
        expirationTime: debugLogsArgs.expirationTime as number | undefined,
        limit: debugLogsArgs.limit as number | undefined,
        logId: debugLogsArgs.logId as string | undefined,
        includeBody: debugLogsArgs.includeBody as boolean | undefined
      };

      return await handleManageDebugLogs(conn, validatedArgs);
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Main MCP endpoint
app.post("/mcp", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    console.log(`Received MCP request: ${JSON.stringify(body, null, 2)}`);

    const method = body?.method;
    const params = body?.params || {};
    const requestId = body?.id;

    // Route to appropriate handler based on method
    if (method === "initialize") {
      const result = {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
          prompts: null,
          resources: null
        },
        serverInfo: {
          name: "salesforce-mcp-server",
          version: "1.0.0"
        }
      };

      return res.json({
        jsonrpc: "2.0",
        result,
        id: requestId
      });
    } else if (method === "tools/list") {
      const result = {
        tools: ALL_TOOLS.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };

      return res.json({
        jsonrpc: "2.0",
        result,
        id: requestId
      });
    } else if (method === "tools/call") {
      const toolName = params?.name;
      const toolArguments = params?.arguments || {};

      // Get Salesforce connection config from request
      const connectionConfig = (req as any).salesforceConfig as ConnectionConfig;
      
      try {
        const toolResult = await executeTool(toolName, toolArguments, connectionConfig);
        
        const result = {
          content: toolResult.content.map((content: any) => ({
            type: content.type,
            text: content.text
          }))
        };

        return res.json({
          jsonrpc: "2.0",
          result,
          id: requestId
        });
      } catch (error) {
        return res.json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: `Tool execution error: ${error instanceof Error ? error.message : String(error)}`
          },
          id: requestId
        });
      }
    } else {
      // Method not found
      return res.json({
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        },
        id: requestId
      });
    }
  } catch (error) {
    console.error("Error handling MCP request:", error);
    return res.json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: `Internal error: ${error instanceof Error ? error.message : String(error)}`
      },
      id: req.body?.id || null
    });
  }
});

// Start the server
app.listen(PORT, HOST, () => {
  console.log(`Starting MCP Salesforce Server on ${HOST}:${PORT}`);
  console.log(`Authentication enabled: ${REQUIRE_AUTH}`);
  console.log(`Secret Key configured: ${SECRET_KEY ? 'Yes' : 'No'}`);
});

