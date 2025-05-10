import { MCPServer } from '../core/mcp-server.js';
import { MCPToolRequest, MCPToolResponse, MCPResourceRequest, MCPResourceResponse } from '../core/types.js';

/**
 * stdio を使用したMCPサーバーを起動
 * @param mcpServer MCPサーバーインスタンス
 */
export async function startStdioMCPServer(mcpServer: MCPServer): Promise<void> {
  console.error('MySQL MCP Server (stdioモード) を起動しています...');
  
  // 標準入力からのデータを処理
  process.stdin.setEncoding('utf8');
  
  let buffer = '';
  
  process.stdin.on('data', async (chunk: string) => {
    buffer += chunk;
    
    // 完全なJSONメッセージが届いたかチェック
    const messages = processBuffer();
    
    for (const message of messages) {
      try {
        await handleMessage(message);
      } catch (error) {
        sendErrorResponse((error as Error).message);
      }
    }
  });

  process.stdin.on('end', () => {
    console.error('stdin が終了しました。サーバーをシャットダウンしています...');
    mcpServer.close().catch(err => {
      console.error('MySQL接続を閉じるときにエラーが発生しました:', err);
    });
  });

  process.on('SIGINT', async () => {
    console.error('サーバーをシャットダウンしています...');
    await mcpServer.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('サーバーをシャットダウンしています...');
    await mcpServer.close();
    process.exit(0);
  });

  // サーバー情報を初期レスポンスとして送信
  sendServerInfo();

  /**
   * バッファから完全なJSONメッセージを処理
   * @returns 処理されたメッセージの配列
   */
  function processBuffer(): any[] {
    const messages: any[] = [];
    let newlineIndex: number;
    
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const messageStr = buffer.substring(0, newlineIndex).trim();
      buffer = buffer.substring(newlineIndex + 1);
      
      if (messageStr) {
        try {
          const message = JSON.parse(messageStr);
          messages.push(message);
        } catch (error) {
          console.error('JSONパースエラー:', error);
          sendErrorResponse(`不正なJSON形式: ${messageStr}`);
        }
      }
    }
    
    return messages;
  }

  /**
   * 受信メッセージを処理
   * @param message 受信したメッセージ
   */
  async function handleMessage(message: any): Promise<void> {
    // メッセージタイプに基づいて処理
    if (message.type === 'tool_request' && message.request) {
      await handleToolRequest(message.request);
    } else if (message.type === 'resource_request' && message.request) {
      await handleResourceRequest(message.request);
    } else if (message.type === 'server_info_request') {
      sendServerInfo();
    } else {
      sendErrorResponse('不明なメッセージタイプまたは無効なリクエスト形式');
    }
  }

  /**
   * ツールリクエストを処理
   * @param request ツールリクエスト
   */
  async function handleToolRequest(request: MCPToolRequest): Promise<void> {
    try {
      if (!request.tool || typeof request.tool !== 'string' || request.tool.trim() === '') {
        sendErrorResponse('ツール名が必要です');
        return;
      }

      const response: MCPToolResponse = await mcpServer.executeTool(request);
      
      sendResponse({
        type: 'tool_response',
        response
      });
    } catch (error) {
      sendErrorResponse(`ツール実行エラー: ${(error as Error).message}`);
    }
  }

  /**
   * リソースリクエストを処理
   * @param request リソースリクエスト
   */
  async function handleResourceRequest(request: MCPResourceRequest): Promise<void> {
    try {
      if (!request.uri || typeof request.uri !== 'string' || request.uri.trim() === '') {
        sendErrorResponse('リソースURIが必要です');
        return;
      }
      
      // 現在はリソースアクセスは実装されていない
      const response: MCPResourceResponse = {
        content: null,
        error: 'リソースアクセスは実装されていません'
      };
      
      sendResponse({
        type: 'resource_response',
        response
      });
    } catch (error) {
      sendErrorResponse(`リソースアクセスエラー: ${(error as Error).message}`);
    }
  }

  /**
   * サーバー情報を送信
   */
  function sendServerInfo(): void {
    const serverInfo = mcpServer.getServerDefinition();
    
    sendResponse({
      type: 'server_info',
      info: serverInfo
    });
  }

  /**
   * エラーレスポンスを送信
   * @param message エラーメッセージ
   */
  function sendErrorResponse(message: string): void {
    sendResponse({
      type: 'error',
      error: message
    });
  }

  /**
   * 標準出力に応答を送信
   * @param data 送信するデータ
   */
  function sendResponse(data: any): void {
    process.stdout.write(JSON.stringify(data) + '\n');
  }
}
