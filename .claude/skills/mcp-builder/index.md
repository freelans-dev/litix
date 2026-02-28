---
description: "Construir MCP servers em Node.js e Python"
---

# MCP Builder — Build MCP Servers

## Overview
Skill para criar MCP (Model Context Protocol) servers customizados em Node.js ou Python.

## Workflow

### 1. Requirements
- Define server purpose and capabilities
- List tools to expose
- Define resources to serve
- Identify authentication requirements

### 2. Scaffold
Choose runtime:
- **Node.js**: Uses `@modelcontextprotocol/sdk`
- **Python**: Uses `mcp` package

### 3. Implementation

#### Node.js Template
```typescript
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new Server({ name: "my-mcp", version: "1.0.0" }, {
  capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: "my_tool", description: "...", inputSchema: {...} }]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
```

#### Python Template
```python
from mcp.server import Server
from mcp.server.stdio import stdio_server

server = Server("my-mcp")

@server.tool()
async def my_tool(arg: str) -> str:
    return "result"

async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write)
```

### 4. Testing
- Test with MCP Inspector
- Validate tool schemas
- Test error handling

### 5. Registration
- Add to `.claude/mcp.json` or Docker MCP catalog
- Configure authentication

## Usage
```
/mcp-builder --name "litix-data" --runtime node --tools search,lookup
```

## Agent
Primary: `@devops` (Gage)
