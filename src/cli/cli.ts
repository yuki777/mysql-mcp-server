#!/usr/bin/env node

import { program } from 'commander';
import { ConfigManager } from '../config/config';
import { MCPServer } from '../core/mcp-server';
import { startMCPServer } from './utils/server-utils';
import fs from 'fs';
import path from 'path';

// パッケージ情報を読み込み
const packageJsonPath = path.resolve(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

/**
 * CLI実装
 */
async function main() {
  // コマンドラインオプションの設定
  program
    .name('mysql-mcp-server')
    .description('MySQL MCP Server - ローカルMySQLデータベースとLLMを接続')
    .version(packageJson.version)
    .option('-h, --host <host>', 'MySQLホスト', 'localhost')
    .option('-p, --port <port>', 'MySQLポート', '3306')
    .option('-u, --user <user>', 'MySQLユーザー', 'root')
    .option('--password <password>', 'MySQLパスワード', '')
    .option('-d, --database <database>', 'デフォルトデータベース')
    .option('-c, --config <path>', '設定ファイルパス')
    .option('--server-port <port>', 'MCPサーバーポート', '3000')
    .option('--server-host <host>', 'MCPサーバーホスト', 'localhost')
    .option('--query-timeout <ms>', 'クエリタイムアウト(ミリ秒)', '30000')
    .option('--max-results <count>', '最大結果行数', '1000')
    .option('--debug', 'デバッグモード');

  program.parse(process.argv);
  const options = program.opts();

  try {
    // 設定マネージャーの初期化
    const configManager = new ConfigManager(options.config);

    // コマンドライン引数からの設定を適用
    const cliConfig = {
      dbHost: options.host,
      dbPort: parseInt(options.port, 10),
      dbUser: options.user,
      dbPassword: options.password,
      dbName: options.database,
      port: parseInt(options.serverPort, 10),
      host: options.serverHost,
      queryTimeout: parseInt(options.queryTimeout, 10),
      maxResultSize: parseInt(options.maxResults, 10),
      debug: options.debug
    };

    configManager.applyCommandLineArgs(cliConfig);

    const mcpServer = new MCPServer(configManager);
    
    // SQLによる接続確認メッセージ
    console.log('MySQL MCP Serverを起動しています...');
    console.log(`ホスト: ${configManager.getMySQLConfig().host}:${configManager.getMySQLConfig().port}`);
    if (configManager.getMySQLConfig().database) {
      console.log(`データベース: ${configManager.getMySQLConfig().database}`);
    }
    
    // MCPサーバーを初期化
    await mcpServer.initialize();

    // MCPサーバーを起動
    const serverConfig = configManager.getConfig().server;
    await startMCPServer(mcpServer, serverConfig.port, serverConfig.host);
    
    console.log(`MySQL MCP Serverが起動しました。http://${serverConfig.host}:${serverConfig.port}/ で接続できます。`);
    
    // 終了シグナルを処理
    process.on('SIGINT', async () => {
      console.log('MySQLサーバー接続を終了しています...');
      await mcpServer.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('MySQLサーバー接続を終了しています...');
      await mcpServer.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

// メイン関数を実行
main().catch(error => {
  console.error('致命的なエラーが発生しました:', error);
  process.exit(1);
});
