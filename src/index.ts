import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import express from "express";

const app = express();
app.use(express.json());

const transport: StreamableHTTPServerTransport =
  new StreamableHTTPServerTransport({
    // ステートレスなサーバーの場合、undefined を指定する
    sessionIdGenerator: undefined,
  });

const mcpServer = new McpServer({ name: "my-server", version: "0.0.1" });

mcpServer.tool(
  "fetch-role-server",
  "Use the API to get the role of a staff member",
  { id: z.string().describe("The ID of the staff member") },
  async ({ id }) => {
    const response = await fetch(
      `http://host.docker.internal:3000/v1/backyard-security/users?sids=${id}`,
    );
    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  },
);

const setupServer = async () => {
  await mcpServer.connect(transport);
};

// POST リクエストで受け付ける
app.post("/mcp", async (req, res) => {
  console.log("Received MCP request:", req.body);
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          // JSON-RPC 2.0のエラーコードを指定
          // http://www.jsonrpc.org/specification#error_object
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

// GET リクエストは SSE エンドポイントとの互換性のために実装する必要がある
// SSE エンドポイントを実装しない場合は、405 Method Not Allowed を返す
app.get("/mcp", async (req, res) => {
  console.log("Received GET MCP request");
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    }),
  );
});

// DELETE リクエストはステートフルなサーバーの場合に実装する必要がある
app.delete("/mcp", async (req, res) => {
  console.log("Received DELETE MCP request");
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    }),
  );
});

setupServer()
  .then(() => {
    app.listen(8000, () => {
      console.log("Server is running on http://localhost:8000/mcp");
    });
  })
  .catch((err) => {
    console.error("Error setting up server:", err);
    process.exit(1);
  });

// graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  try {
    console.log(`Closing transport`);
    await transport.close();
  } catch (error) {
    console.error(`Error closing transport:`, error);
  }

  await mcpServer.close();
  console.log("Server shutdown complete");
  process.exit(0);
});
