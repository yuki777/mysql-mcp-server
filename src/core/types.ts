/**
 * MySQL MCP Server の型定義
 */

// MCP Protocol の基本型定義
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}

export interface MCPResourceDefinition {
  name: string;
  description: string;
  uriTemplate: string;
}

export interface MCPServerDefinition {
  name: string;
  version: string;
  tools: MCPToolDefinition[];
  resources: MCPResourceDefinition[];
}

export interface MCPToolRequest {
  tool: string;
  arguments: Record<string, any>;
}

export interface MCPToolResponse {
  result: any;
  error?: string;
}

export interface MCPResourceRequest {
  uri: string;
}

export interface MCPResourceResponse {
  content: any;
  error?: string;
}

// MySQL 関連の型定義
export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  ssl?: string | object;
  connectionLimit?: number;
  timezone?: string;
  charset?: string;
}

// 保存された接続情報の型定義
export interface StoredConnection {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
}

// 名前付き接続情報の型定義
export interface NamedStoredConnection extends StoredConnection {
  name: string;  // プロファイル名
}

export interface QueryResult {
  data: any[];
  fields?: any[];
  metadata?: {
    affectedRows?: number;
    insertId?: number;
    changedRows?: number;
  };
  truncated?: boolean;
  totalRows?: number;
}

// アプリケーション設定の型定義
export interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  mysql: MySQLConfig;
  debug: boolean;
  queryTimeout?: number; // ミリ秒単位
  maxResultSize?: number; // 行数
}
