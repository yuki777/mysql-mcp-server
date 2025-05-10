import express from 'express';
import { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { MCPServer } from '../../core/mcp-server.js';
import { MCPToolRequest, MCPToolResponse, MCPResourceRequest, MCPResourceResponse } from '../../core/types.js';

/**
 * MCP サーバーを起動
 * @param mcpServer MCPサーバーインスタンス
 * @param port ポート番号
 * @param host ホスト名
 */
export async function startMCPServer(mcpServer: MCPServer, port: number, host: string): Promise<any> {
  const app: Application = express();

  // CORS設定
  app.use(cors());
  
  // JSONボディの解析
  app.use(bodyParser.json({ limit: '10mb' }));
  
  // サーバー情報エンドポイント
  app.get('/', (req: Request, res: Response) => {
    const serverInfo = mcpServer.getServerDefinition();
    res.json(serverInfo);
  });

  // ツール実行エンドポイント
  app.post('/tools', (req: Request, res: Response) => {
    try {
      const toolRequest: MCPToolRequest = req.body;
      
      if (!toolRequest.tool || toolRequest.tool.trim() === '') {
        res.status(400).json({
          error: 'Tool name is required'
        });
        return;
      }

      mcpServer.executeTool(toolRequest)
        .then((response: MCPToolResponse) => {
          res.json(response);
        })
        .catch((error: Error) => {
          console.error('Tool execution error:', error);
          res.status(500).json({
            result: null,
            error: `Internal server error: ${error.message}`
          });
        });
    } catch (error) {
      console.error('Tool request parsing error:', error);
      res.status(400).json({
        result: null,
        error: `Invalid tool request: ${(error as Error).message}`
      });
    }
  });

  // リソースアクセスエンドポイント
  app.get('/resources/:uri(*)', (req: Request, res: Response) => {
    try {
      const resourceRequest: MCPResourceRequest = {
        uri: req.params.uri
      };
      
      if (!resourceRequest.uri || resourceRequest.uri.trim() === '') {
        res.status(400).json({
          error: 'Resource URI is required'
        });
        return;
      }
      
      // 現在は、リソースアクセスは実装されていない
      const response: MCPResourceResponse = {
        content: null,
        error: 'Resource access not implemented'
      };
      
      res.json(response);
    } catch (error) {
      console.error('Resource access error:', error);
      res.status(500).json({
        content: null,
        error: `Internal server error: ${(error as Error).message}`
      });
    }
  });

  // エラーハンドリング
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({
      error: `Internal server error: ${err.message}`
    });
  });

  // サーバーの起動
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, host, () => {
        resolve(server);
      });
      
      server.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}
