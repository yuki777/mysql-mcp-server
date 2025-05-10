import { MCPServerDefinition, MCPToolDefinition, MCPResourceDefinition, MCPToolRequest, MCPToolResponse, MySQLConfig, NamedStoredConnection } from './types';
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
   * @param autoConnect 自動的にデータベースに接続するかどうか
   */
  public async initialize(autoConnect: boolean = false): Promise<void> {
    try {
      // MySQLコネクションを初期化（接続は行わない）
      await this.mysqlConnection.initialize(autoConnect);
      console.error('MySQL MCP Server initialized');

      if (autoConnect && this.mysqlConnection.isConnectedToDatabase()) {
        // 接続成功時は設定を保存
        this.configManager.saveCurrentConnection();
      }
    } catch (error) {
      console.error('Failed to initialize MCP Server:', error);
      throw error;
    }
  }

  /**
   * ツールとリソースを登録
   */
  private registerTools(): void {
    // -- データベース接続管理ツール --

    // connect_database ツール
    this.registerTool({
      name: 'connect_database',
      description: 'データベースに接続します',
      inputSchema: {
        type: 'object',
        properties: {
          host: {
            type: 'string',
            description: 'MySQLホスト'
          },
          port: {
            type: 'number',
            description: 'MySQLポート'
          },
          user: {
            type: 'string',
            description: 'MySQLユーザー'
          },
          password: {
            type: 'string',
            description: 'MySQLパスワード'
          },
          database: {
            type: 'string',
            description: 'データベース名（オプション）'
          },
          profileName: {
            type: 'string',
            description: '接続プロファイル名（オプション）。接続後、この名前で保存されます'
          }
        },
        required: ['host', 'port', 'user']
      }
    }, this.connectDatabase.bind(this));
    
    // connect_by_profile ツール
    this.registerTool({
      name: 'connect_by_profile',
      description: '保存済み接続プロファイルを使用してデータベースに接続します',
      inputSchema: {
        type: 'object',
        properties: {
          profileName: {
            type: 'string',
            description: '接続プロファイル名'
          }
        },
        required: ['profileName']
      }
    }, this.connectByProfile.bind(this));

    // disconnect_database ツール
    this.registerTool({
      name: 'disconnect_database',
      description: '現在のデータベース接続を切断します',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }, this.disconnectDatabase.bind(this));

    // get_connection_status ツール
    this.registerTool({
      name: 'get_connection_status',
      description: 'データベース接続の状態を取得します',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }, this.getConnectionStatus.bind(this));
    
    // list_profiles ツール
    this.registerTool({
      name: 'list_profiles',
      description: '保存済みの接続プロファイル一覧を取得します',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }, this.listProfiles.bind(this));
    
    // get_profile ツール
    this.registerTool({
      name: 'get_profile',
      description: '指定した名前の接続プロファイルの詳細を取得します',
      inputSchema: {
        type: 'object',
        properties: {
          profileName: {
            type: 'string',
            description: 'プロファイル名'
          }
        },
        required: ['profileName']
      }
    }, this.getProfile.bind(this));
    
    // add_profile ツール
    this.registerTool({
      name: 'add_profile',
      description: '新しい接続プロファイルを追加または更新します',
      inputSchema: {
        type: 'object',
        properties: {
          profileName: {
            type: 'string',
            description: 'プロファイル名'
          },
          host: {
            type: 'string',
            description: 'MySQLホスト'
          },
          port: {
            type: 'number',
            description: 'MySQLポート'
          },
          user: {
            type: 'string',
            description: 'MySQLユーザー'
          },
          password: {
            type: 'string',
            description: 'MySQLパスワード'
          },
          database: {
            type: 'string',
            description: 'データベース名（オプション）'
          }
        },
        required: ['profileName', 'host', 'port', 'user']
      }
    }, this.addProfile.bind(this));
    
    // remove_profile ツール
    this.registerTool({
      name: 'remove_profile',
      description: '指定した名前の接続プロファイルを削除します',
      inputSchema: {
        type: 'object',
        properties: {
          profileName: {
            type: 'string',
            description: 'プロファイル名'
          }
        },
        required: ['profileName']
      }
    }, this.removeProfile.bind(this));

    // -- SQLクエリ関連ツール --
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
      // 接続状態のチェック
      if (!this.mysqlConnection.isConnectedToDatabase()) {
        throw new Error('Database not connected. Please use connect_database tool first.');
      }

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
      // 接続状態のチェック
      if (!this.mysqlConnection.isConnectedToDatabase()) {
        throw new Error('Database not connected. Please use connect_database tool first.');
      }

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
      // 接続状態のチェック
      if (!this.mysqlConnection.isConnectedToDatabase()) {
        throw new Error('Database not connected. Please use connect_database tool first.');
      }

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
      // 接続状態のチェック
      if (!this.mysqlConnection.isConnectedToDatabase()) {
        throw new Error('Database not connected. Please use connect_database tool first.');
      }

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
   * データベース接続ツール
   * @param args 接続引数
   */
  private async connectDatabase(args: Record<string, any>): Promise<any> {
    try {
      const { host, port, user, password, database, profileName } = args as {
        host: string;
        port: number;
        user: string;
        password?: string;
        database?: string;
        profileName?: string;
      };
      
      // 現在の接続があれば切断
      if (this.mysqlConnection.isConnectedToDatabase()) {
        await this.mysqlConnection.close();
      }
      
      // 新しい接続設定を適用
      const newConfig: MySQLConfig = {
        host,
        port,
        user,
        password: password || '',
        database,
      };
      
      this.mysqlConnection.updateConfig(newConfig);
      this.configManager.updateMySQLConfig(newConfig);
      
      // 接続実行
      await this.mysqlConnection.connect();
      
      // 接続情報を保存（プロファイル名付き）
      const savedProfileName = this.configManager.saveCurrentConnection(profileName);
      
      return {
        success: true,
        connection: this.mysqlConnection.getConnectionInfo(),
        profileName: savedProfileName
      };
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw new Error(`Database connection failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * プロファイル名による接続ツール
   * @param args 引数
   */
  private async connectByProfile(args: Record<string, any>): Promise<any> {
    try {
      const { profileName } = args as { profileName: string };
      
      // プロファイルの取得
      const profile = this.configManager.getProfile(profileName);
      if (!profile) {
        throw new Error(`プロファイル "${profileName}" が見つかりません`);
      }
      
      // 現在の接続があれば切断
      if (this.mysqlConnection.isConnectedToDatabase()) {
        await this.mysqlConnection.close();
      }
      
      // プロファイルの接続設定を適用
      const newConfig: MySQLConfig = {
        host: profile.host,
        port: profile.port,
        user: profile.user,
        password: profile.password,
        database: profile.database,
      };
      
      this.mysqlConnection.updateConfig(newConfig);
      this.configManager.updateMySQLConfig(newConfig);
      
      // 接続実行
      await this.mysqlConnection.connect();
      
      return {
        success: true,
        connection: this.mysqlConnection.getConnectionInfo(),
        profileName: profile.name
      };
    } catch (error) {
      console.error('Failed to connect by profile:', error);
      throw new Error(`プロファイル接続失敗: ${(error as Error).message}`);
    }
  }
  
  /**
   * データベース切断ツール
   */
  private async disconnectDatabase(): Promise<any> {
    await this.mysqlConnection.close();
    return {
      success: true,
      message: 'Database disconnected'
    };
  }
  
  /**
   * 接続状態取得ツール
   */
  private async getConnectionStatus(): Promise<any> {
    // 現在の接続情報を取得
    const connectionInfo = this.mysqlConnection.isConnectedToDatabase()
      ? this.mysqlConnection.getConnectionInfo()
      : null;
    
    // 現在使用中のプロファイル名を特定（あれば）
    let currentProfileName: string | null = null;
    if (connectionInfo) {
      const profiles = this.configManager.getStoredConnections();
      const currentProfile = profiles.find(p => 
        p.host === connectionInfo.host &&
        p.port === connectionInfo.port &&
        p.user === connectionInfo.user &&
        p.database === connectionInfo.database
      );
      
      if (currentProfile) {
        currentProfileName = currentProfile.name;
      }
    }
    
    return {
      isConnected: this.mysqlConnection.isConnectedToDatabase(),
      connectionInfo: connectionInfo,
      currentProfileName: currentProfileName
    };
  }
  
  /**
   * プロファイル一覧取得ツール
   */
  private async listProfiles(): Promise<any> {
    const profiles = this.configManager.getStoredConnections();
    return {
      profiles: profiles.map(p => ({
        name: p.name,
        host: p.host,
        port: p.port,
        user: p.user,
        database: p.database || null
      }))
    };
  }
  
  /**
   * プロファイル取得ツール
   */
  private async getProfile(args: Record<string, any>): Promise<any> {
    const { profileName } = args as { profileName: string };
    
    const profile = this.configManager.getProfile(profileName);
    if (!profile) {
      throw new Error(`プロファイル "${profileName}" が見つかりません`);
    }
    
    return {
      profile: {
        name: profile.name,
        host: profile.host,
        port: profile.port,
        user: profile.user,
        database: profile.database || null
      }
    };
  }
  
  /**
   * プロファイル追加ツール
   */
  private async addProfile(args: Record<string, any>): Promise<any> {
    const { profileName, host, port, user, password, database } = args as {
      profileName: string;
      host: string;
      port: number;
      user: string;
      password?: string;
      database?: string;
    };
    
    const newProfile: NamedStoredConnection = {
      name: profileName,
      host,
      port,
      user,
      password: password || '',
      database
    };
    
    // 一時的に設定を更新して保存
    const originalConfig = { ...this.configManager.getMySQLConfig() };
    this.configManager.updateMySQLConfig(newProfile);
    const savedName = this.configManager.saveCurrentConnection(profileName);
    
    // 元の設定に戻す（現在の接続には影響させない）
    this.configManager.updateMySQLConfig(originalConfig);
    
    return {
      success: true,
      profileName: savedName
    };
  }
  
  /**
   * プロファイル削除ツール
   */
  private async removeProfile(args: Record<string, any>): Promise<any> {
    const { profileName } = args as { profileName: string };
    
    const result = this.configManager.removeProfile(profileName);
    return {
      success: result,
      message: result ? `プロファイル "${profileName}" を削除しました` : `プロファイル "${profileName}" は存在しません`
    };
  }

  /**
   * 接続を閉じる
   */
  public async close(): Promise<void> {
    await this.mysqlConnection.close();
    console.log('MySQL MCP Server closed');
  }
}
