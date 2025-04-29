#!/usr/bin/env node

import { program } from 'commander';
import { ConfigManager } from '../config/config';
import { MCPServer } from '../core/mcp-server';
import { startStdioMCPServer } from '../utils/stdio-server-utils';
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
    .option('--auto-connect', 'サーバー起動時に自動的にデータベースに接続', false)
    .option('--server-port <port>', 'MCPサーバーポート（stdioモードでは使用されません）', '3000')
    .option('--server-host <host>', 'MCPサーバーホスト（stdioモードでは使用されません）', 'localhost')
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
      debug: options.debug,
      autoConnect: options.autoConnect
    };

    configManager.applyCommandLineArgs(cliConfig);

    const mcpServer = new MCPServer(configManager);
    
    console.error('MySQL MCP Serverを起動しています...');
    
    // 接続情報の表示
    if (options.autoConnect) {
      console.error(`自動接続: ${configManager.getMySQLConfig().host}:${configManager.getMySQLConfig().port}`);
      if (configManager.getMySQLConfig().database) {
        console.error(`データベース: ${configManager.getMySQLConfig().database}`);
      }
    } else {
      console.error('自動接続: オフ (connect_database ツールを使用して接続してください)');
    }
    
    // MCPサーバーを初期化（autoConnectフラグに基づいて接続の有無を決定）
    await mcpServer.initialize(options.autoConnect);

    // stdio mode で MCPサーバーを起動
    await startStdioMCPServer(mcpServer);
    
    // 終了シグナルを処理
    process.on('SIGINT', async () => {
      console.error('MySQLサーバー接続を終了しています...');
      await mcpServer.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('MySQLサーバー接続を終了しています...');
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
