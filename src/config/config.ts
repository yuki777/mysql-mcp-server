import fs from 'fs';
import path from 'path';
import { AppConfig, MySQLConfig } from '../core/types';

/**
 * アプリケーション設定を管理するクラス
 */
export class ConfigManager {
  private config: AppConfig;
  private configFilePath?: string;

  /**
   * デフォルト設定
   */
  private static readonly DEFAULT_CONFIG: AppConfig = {
    server: {
      port: 3000,
      host: 'localhost'
    },
    mysql: {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: undefined
    },
    debug: false,
    queryTimeout: 30000,
    maxResultSize: 1000
  };

  /**
   * コンストラクタ
   * @param configPath 設定ファイルのパス（オプション）
   */
  constructor(configPath?: string) {
    this.config = { ...ConfigManager.DEFAULT_CONFIG };
    this.configFilePath = configPath;
    
    // 設定の初期化
    this.initializeConfig();
  }

  /**
   * 設定を初期化
   */
  private initializeConfig(): void {
    // 1. デフォルト設定から開始（すでにコンストラクタで設定）

    // 2. 設定ファイルがある場合は読み込み
    this.loadConfigFile();

    // 3. 環境変数から設定を上書き
    this.loadFromEnvironment();
  }

  /**
   * 設定ファイルから設定を読み込み
   */
  private loadConfigFile(): void {
    try {
      let configPath = this.configFilePath;

      // 設定ファイルパスが指定されていない場合は、デフォルトの場所を探す
      if (!configPath) {
        // カレントディレクトリ
        if (fs.existsSync(path.resolve(process.cwd(), 'mysql-mcp-config.json'))) {
          configPath = path.resolve(process.cwd(), 'mysql-mcp-config.json');
        } 
        // ホームディレクトリ
        else if (process.env.HOME && fs.existsSync(path.resolve(process.env.HOME, '.mysql-mcp-config.json'))) {
          configPath = path.resolve(process.env.HOME, '.mysql-mcp-config.json');
        }
      }

      if (configPath && fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        const fileConfig = JSON.parse(configData);
        
        // 設定をマージ
        this.mergeConfig(fileConfig);
        
        console.log(`Loaded config from: ${configPath}`);
      }
    } catch (error) {
      console.error('Error loading config file:', error);
    }
  }

  /**
   * 環境変数から設定を読み込み
   */
  private loadFromEnvironment(): void {
    // サーバー設定
    if (process.env.MCP_SERVER_PORT) {
      this.config.server.port = parseInt(process.env.MCP_SERVER_PORT, 10);
    }
    if (process.env.MCP_SERVER_HOST) {
      this.config.server.host = process.env.MCP_SERVER_HOST;
    }

    // MySQL設定
    if (process.env.DB_HOST) {
      this.config.mysql.host = process.env.DB_HOST;
    }
    if (process.env.DB_PORT) {
      this.config.mysql.port = parseInt(process.env.DB_PORT, 10);
    }
    if (process.env.DB_USER) {
      this.config.mysql.user = process.env.DB_USER;
    }
    if (process.env.DB_PASSWORD) {
      this.config.mysql.password = process.env.DB_PASSWORD;
    }
    if (process.env.DB_DATABASE) {
      this.config.mysql.database = process.env.DB_DATABASE;
    }

    // その他の設定
    if (process.env.DEBUG && ['true', '1', 'yes'].includes(process.env.DEBUG.toLowerCase())) {
      this.config.debug = true;
    }
    if (process.env.QUERY_TIMEOUT) {
      this.config.queryTimeout = parseInt(process.env.QUERY_TIMEOUT, 10);
    }
    if (process.env.MAX_RESULT_SIZE) {
      this.config.maxResultSize = parseInt(process.env.MAX_RESULT_SIZE, 10);
    }
  }

  /**
   * 設定をマージ
   * @param newConfig 新しい設定
   */
  private mergeConfig(newConfig: Partial<AppConfig>): void {
    // サーバー設定
    if (newConfig.server) {
      this.config.server = {
        ...this.config.server,
        ...newConfig.server
      };
    }

    // MySQL設定
    if (newConfig.mysql) {
      this.config.mysql = {
        ...this.config.mysql,
        ...newConfig.mysql
      };
    }

    // その他の設定
    if (newConfig.debug !== undefined) {
      this.config.debug = newConfig.debug;
    }
    if (newConfig.queryTimeout !== undefined) {
      this.config.queryTimeout = newConfig.queryTimeout;
    }
    if (newConfig.maxResultSize !== undefined) {
      this.config.maxResultSize = newConfig.maxResultSize;
    }
  }

  /**
   * コマンドライン引数の設定を適用
   * @param args コマンドライン引数
   */
  public applyCommandLineArgs(args: Record<string, any>): void {
    // サーバー設定
    if (args.port) {
      this.config.server.port = args.port;
    }
    if (args.host) {
      this.config.server.host = args.host;
    }

    // MySQL設定
    if (args.dbHost) {
      this.config.mysql.host = args.dbHost;
    }
    if (args.dbPort) {
      this.config.mysql.port = args.dbPort;
    }
    if (args.dbUser) {
      this.config.mysql.user = args.dbUser;
    }
    if (args.dbPassword) {
      this.config.mysql.password = args.dbPassword;
    }
    if (args.dbName) {
      this.config.mysql.database = args.dbName;
    }

    // その他の設定
    if (args.debug !== undefined) {
      this.config.debug = args.debug;
    }
    if (args.queryTimeout !== undefined) {
      this.config.queryTimeout = args.queryTimeout;
    }
    if (args.maxResultSize !== undefined) {
      this.config.maxResultSize = args.maxResultSize;
    }
  }

  /**
   * 全ての設定を取得
   */
  public getConfig(): AppConfig {
    return this.config;
  }

  /**
   * MySQL接続設定を取得
   */
  public getMySQLConfig(): MySQLConfig {
    return this.config.mysql;
  }

  /**
   * クエリタイムアウト設定を取得
   */
  public getQueryTimeout(): number {
    return this.config.queryTimeout || 30000;
  }

  /**
   * 最大結果サイズ設定を取得
   */
  public getMaxResultSize(): number {
    return this.config.maxResultSize || 1000;
  }

  /**
   * デバッグモードかどうかを確認
   */
  public isDebugMode(): boolean {
    return this.config.debug;
  }
}
