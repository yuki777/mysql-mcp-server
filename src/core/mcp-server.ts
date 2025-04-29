import { MCPServerDefinition, MCPToolDefinition, MCPResourceDefinition, MCPToolRequest, MCPToolResponse } from './types';
import { ConfigManager } from '../config/config';
import { MySQLConnection } from '../mysql/connection';

/**
 * MCP サーバーのメインクラス
 */
export class MCPServer {
  private serverDefinition: MCPServerDefinition;
  private configManager: ConfigManager;
  private mysqlConnection: MySQLConnection;
  private tools: Map<string, (args: Record<string, any>) => Promise<any>>;
  
  /**
   * コンストラクタ
   * @param configManager 設定マネージャー
   */
  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.mysqlConnection = new MySQLConnection(
      configManager.getMySQLConfig(),
      configManager.getQueryTimeout()
    );
    
    this.tools = new Map();
    
    // サーバー定義の初期化
    this.serverDefinition = {
      name: 'mysql-mcp-server',
      version: '1.0.0',
      tools: [],
      resources: []
    };
    
    // ツールとリソースの登録
    this.registerTools();
  }

  /**
   * サーバーを初期化
   */
  public async initialize(): Promise<void> {
    try {
      // MySQL 接続の初期化
      await this.mysqlConnection.initialize();
      console.log('MySQL MCP Server initialized');
    } catch (error) {
      console.error('Failed to initialize MCP Server:', error);
      throw error;
    }
  }

  /**
   * ツールとリソースを登録
   */
  private registerTools(): void {
    // execute_query ツール
    this.registerTool({
      name: 'execute_query',
      description: 'MySQLクエリを実行します',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '実行するSQLクエリ'
          },
          params: {
            type: 'array',
            items: { type: 'any' },
            description: 'クエリパラメータ（オプション）'
          }
        },
        required: ['query']
      }
    }, this.executeQuery.bind(this));

    // get_databases ツール
    this.registerTool({
      name: 'get_databases',
      description: '利用可能なデータベースの一覧を取得します',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }, this.getDatabases.bind(this));

    // get_tables ツール
    this.registerTool({
      name: 'get_tables',
      description: '指定したデータベース内のテーブル一覧を取得します',
      inputSchema: {
        type: 'object',
        properties: {
          database: {
            type: 'string',
            description: 'データベース名（指定しない場合は現在選択されているデータベース）'
          }
        }
      }
    }, this.getTables.bind(this));

    // describe_table ツール
    this.registerTool({
      name: 'describe_table',
      description: '指定したテーブルの構造を取得します',
      inputSchema: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: 'テーブル名'
          },
          database: {
            type: 'string',
            description: 'データベース名（指定しない場合は現在選択されているデータベース）'
          }
        },
        required: ['table']
      }
    }, this.describeTable.bind(this));
  }

  /**
   * ツールを登録
   * @param definition ツール定義
   * @param handler ツールハンドラー関数
   */
  private registerTool(
    definition: MCPToolDefinition,
    handler: (args: Record<string, any>) => Promise<any>
  ): void {
    this.serverDefinition.tools.push(definition);
    this.tools.set(definition.name, handler);
  }

  /**
   * サーバー定義を取得
   */
  public getServerDefinition(): MCPServerDefinition {
    return this.serverDefinition;
  }

  /**
   * ツールを実行
   * @param request ツールリクエスト
   */
  public async executeTool(request: MCPToolRequest): Promise<MCPToolResponse> {
    try {
      const { tool, arguments: args } = request;
      const handler = this.tools.get(tool);

      if (!handler) {
        return {
          result: null,
          error: `Unknown tool: ${tool}`
        };
      }

      const result = await handler(args);
      return { result };
    } catch (error) {
      console.error(`Error executing tool:`, error);
      return {
        result: null,
        error: (error as Error).message
      };
    }
  }

  /**
   * SQLクエリ実行ツール
   * @param args クエリ引数
   */
  private async executeQuery(args: Record<string, any>): Promise<any> {
    try {
      const { query, params = [] } = args as { query: string; params?: any[] };
      
      if (!query || query.trim() === '') {
        throw new Error('Empty query');
      }

      // クエリ実行前のログ
      if (this.configManager.isDebugMode()) {
        console.log(`Executing query: ${query}`);
        if (params.length > 0) {
          console.log(`With params:`, params);
        }
      }

      const result = await this.mysqlConnection.executeQuery(query, params);
      
      // 結果の行数制限
      const maxResults = this.configManager.getMaxResultSize();
      if (Array.isArray(result.data) && result.data.length > maxResults) {
        result.data = result.data.slice(0, maxResults);
        result.truncated = true;
        result.totalRows = result.data.length;
      }

      return result;
    } catch (error) {
      throw new Error(`Query execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * データベース一覧取得ツール
   */
  private async getDatabases(): Promise<any> {
    try {
      const result = await this.mysqlConnection.executeQuery('SHOW DATABASES');
      return {
        databases: result.data.map((row: any) => row.Database)
      };
    } catch (error) {
      throw new Error(`Failed to get databases: ${(error as Error).message}`);
    }
  }

  /**
   * テーブル一覧取得ツール
   * @param args 引数
   */
  private async getTables(args: Record<string, any>): Promise<any> {
    try {
      const { database } = args as { database?: string };
      let query = 'SHOW TABLES';
      
      if (database) {
        query = `SHOW TABLES FROM \`${database}\``;
      }
      
      const result = await this.mysqlConnection.executeQuery(query);
      
      // 結果の形式がデータベースによって異なるため、一律の形式に変換
      const tables = result.data.map((row: any) => {
        // 最初のカラム名を取得
        const firstCol = Object.keys(row)[0];
        return row[firstCol];
      });
      
      return { tables };
    } catch (error) {
      throw new Error(`Failed to get tables: ${(error as Error).message}`);
    }
  }

  /**
   * テーブル構造取得ツール
   * @param args 引数
   */
  private async describeTable(args: Record<string, any>): Promise<any> {
    try {
      const { table, database } = args as { table: string; database?: string };
      let tableReference = table;
      
      if (database) {
        tableReference = `\`${database}\`.\`${table}\``;
      } else {
        tableReference = `\`${table}\``;
      }
      
      // テーブルの構造を取得
      const describeResult = await this.mysqlConnection.executeQuery(`DESCRIBE ${tableReference}`);
      
      // インデックス情報を取得
      const indexResult = await this.mysqlConnection.executeQuery(`SHOW INDEX FROM ${tableReference}`);
      
      // 外部キー情報を取得 (information_schemaから取得)
      let currentDb = database;
      if (!currentDb) {
        // 現在のデータベースを取得
        const dbResult = await this.mysqlConnection.executeQuery('SELECT DATABASE() as db');
        currentDb = dbResult.data[0]?.db;
      }
      
      const fkQuery = `
        SELECT 
          COLUMN_NAME, 
          REFERENCED_TABLE_NAME, 
          REFERENCED_COLUMN_NAME
        FROM 
          INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE 
          TABLE_SCHEMA = ? AND
          TABLE_NAME = ? AND
          REFERENCED_TABLE_NAME IS NOT NULL`;
      
      const fkResult = currentDb ? 
        await this.mysqlConnection.executeQuery(fkQuery, [currentDb, table]) :
        { data: [] };
      
      return {
        columns: describeResult.data,
        indexes: indexResult.data,
        foreignKeys: fkResult.data
      };
    } catch (error) {
      throw new Error(`Failed to describe table: ${(error as Error).message}`);
    }
  }

  /**
   * 接続を閉じる
   */
  public async close(): Promise<void> {
    await this.mysqlConnection.close();
    console.log('MySQL MCP Server closed');
  }
}
