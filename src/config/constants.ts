/**
 * 定数定義
 * ESモジュール対応
 */

// 設定ファイルのパス
export const CONFIG_FILES = {
  // プロジェクトルートの設定ファイル
  ROOT: 'mysql-mcp-config.json',
  // ユーザーホームディレクトリの設定ファイル
  HOME: '.mysql-mcp-config.json',
  // 現在接続中のデータベース情報を保存するファイル
  CONNECTIONS: '.mysql-mcp-connections.json'
};

// デフォルト設定
export const DEFAULT_VALUES = {
  // クエリタイムアウト（ミリ秒）
  QUERY_TIMEOUT: 30000,
  // 最大結果行数
  MAX_RESULT_SIZE: 1000,
  // サーバーポート
  SERVER_PORT: 3000
};

// 環境変数名
export const ENV_VARS = {
  // サーバー設定
  MCP_SERVER_PORT: 'MCP_SERVER_PORT',
  MCP_SERVER_HOST: 'MCP_SERVER_HOST',
  // データベース設定
  DB_HOST: 'DB_HOST',
  DB_PORT: 'DB_PORT',
  DB_USER: 'DB_USER',
  DB_PASSWORD: 'DB_PASSWORD',
  DB_DATABASE: 'DB_DATABASE',
  // その他の設定
  DEBUG: 'DEBUG',
  QUERY_TIMEOUT: 'QUERY_TIMEOUT',
  MAX_RESULT_SIZE: 'MAX_RESULT_SIZE'
};
