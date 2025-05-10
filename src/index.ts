import { ConfigManager } from './config/config.js';
import { MCPServer } from './core/mcp-server.js';
import { startMCPServer } from './utils/server-utils.js';

/**
 * アプリケーションのメインエントリーポイント
 */
async function main() {
  try {
    // 設定マネージャーの初期化
    const configManager = new ConfigManager();

    // MCPサーバーの初期化
    const mcpServer = new MCPServer(configManager);
    await mcpServer.initialize();

    // サーバーの起動
    const serverConfig = configManager.getConfig().server;
    await startMCPServer(mcpServer, serverConfig.port, serverConfig.host);
    
    console.log(`MySQL MCP Serverが起動しました。http://${serverConfig.host}:${serverConfig.port}/ で接続できます。`);
    
    // シグナルハンドラーの設定
    process.on('SIGINT', async () => {
      console.log('サーバーをシャットダウンしています...');
      await mcpServer.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('サーバーをシャットダウンしています...');
      await mcpServer.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('アプリケーションの起動に失敗しました:', error);
    process.exit(1);
  }
}

// アプリケーションを開始
main().catch(error => {
  console.error('致命的なエラーが発生しました:', error);
  process.exit(1);
});
