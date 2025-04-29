import fs from 'fs';
import path from 'path';
import { AppConfig, MySQLConfig, StoredConnection } from '../core/types';
import { CONFIG_FILES, DEFAULT_VALUES, ENV_VARS } from './constants';

/**
 * アプリケーション設定を管理するクラス
 */
export class ConfigManager {
  private config: AppConfig;
  private configFilePath?: string;
  private connections: StoredConnection[] = [];
  private connectionsFilePath: string;

  /**
   * デフォルト設定
   */
  private static readonly DEFAULT_CONFIG: AppConfig = {
    server: {
      port: DEFAULT_VALUES.SERVER_PORT,
      host: 'localhost'
    },
    mysql: {
      host: 'localhost',
      port: 13306,
      user: 'root',
      password: '',
      database: undefined
    },
    debug: false,
    queryTimeout: DEFAULT_VALUES.QUERY_TIMEOUT,
    maxResultSize: DEFAULT_VALUES.MAX_RESULT_SIZE
  };

  /**
   * コンストラクタ
   * @param configPath 設定ファイルのパス（オプション）
   */
  constructor(configPath?: string) {
    this.config = { ...ConfigManager.DEFAULT_CONFIG };
    this.configFilePath = configPath;
    
    // 接続情報ファイルのパスを設定
    this.connectionsFilePath = this.getConnectionsFilePath();
    
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

    // 3. 保存された接続情報があれば読み込み
    this.loadStoredConnections();

    // 4. 環境変数から設定を上書き
    this.loadFromEnvironment();
  }

  /**
   * 接続情報ファイルのパスを取得
   */
  private getConnectionsFilePath(): string {
    // ホームディレクトリを使用
    if (process.env.HOME) {
      return path.resolve(process.env.HOME, CONFIG_FILES.CONNECTIONS);
    }
    
    // ホームディレクトリが取得できない場合は現在のディレクトリ
    return path.resolve(process.cwd(), CONFIG_FILES.CONNECTIONS);
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
        if (fs.existsSync(path.resolve(process.cwd(), CONFIG_FILES.ROOT))) {
          configPath = path.resolve(process.cwd(), CONFIG_FILES.ROOT);
        } 
        // ホームディレクトリ
        else if (process.env.HOME && fs.existsSync(path.resolve(process.env.HOME, CONFIG_FILES.HOME))) {
          configPath = path.resolve(process.env.HOME, CONFIG_FILES.HOME);
        }
      }

      if (configPath && fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        const fileConfig = JSON.parse(configData);
        
        // 設定をマージ
        this.mergeConfig(fileConfig);
        
        console.error(`設定ファイルを読み込みました: ${configPath}`);
      }
    } catch (error) {
      console.error('設定ファイルの読み込みエラー:', error);
    }
  }

  /**
   * 保存された接続情報を読み込み
   */
  private loadStoredConnections(): void {
    try {
      if (fs.existsSync(this.connectionsFilePath)) {
        const connectionsData = fs.readFileSync(this.connectionsFilePath, 'utf8');
        this.connections = JSON.parse(connectionsData);
        
        // 最後の接続情報を現在の設定として適用（存在する場合）
        if (this.connections.length > 0) {
          const lastConnection = this.connections[this.connections.length - 1];
          this.config.mysql = { ...this.config.mysql, ...lastConnection };
          console.error(`前回の接続情報を読み込みました: ${lastConnection.host}:${lastConnection.port}`);
        }
      }
    } catch (error) {
      console.error('接続情報の読み込みエラー:', error);
    }
  }

  /**
   * 現在の接続情報を保存
   */
  public saveCurrentConnection(): void {
    try {
      // 現在の接続情報を取得
      const currentConnection: StoredConnection = {
        host: this.config.mysql.host,
        port: this.config.mysql.port,
        user: this.config.mysql.user,
        password: this.config.mysql.password,
        database: this.config.mysql.database
      };

      // 同一の接続情報が既に存在するか確認
      const existingIndex = this.connections.findIndex(conn => 
        conn.host === currentConnection.host && 
        conn.port === currentConnection.port && 
        conn.user === currentConnection.user
      );

      // 既存の接続情報を更新または新規追加
      if (existingIndex >= 0) {
        this.connections[existingIndex] = currentConnection;
      } else {
        // 新しい接続情報を追加（上限10件）
        this.connections.push(currentConnection);
        if (this.connections.length > 10) {
          this.connections.shift(); // 最も古い接続情報を削除
        }
      }

      // ファイルに保存
      fs.writeFileSync(this.connectionsFilePath, JSON.stringify(this.connections, null, 2));
      console.error(`接続情報を保存しました: ${this.connectionsFilePath}`);
    } catch (error) {
      console.error('接続情報の保存エラー:', error);
    }
  }

  /**
   * 環境変数から設定を読み込み
   */
  private loadFromEnvironment(): void {
    // サーバー設定
    const serverPort = process.env[ENV_VARS.MCP_SERVER_PORT];
    if (serverPort) {
      this.config.server.port = parseInt(serverPort, 10);
    }
    
    const serverHost = process.env[ENV_VARS.MCP_SERVER_HOST];
    if (serverHost) {
      this.config.server.host = serverHost;
    }

    // MySQL設定
    const dbHost = process.env[ENV_VARS.DB_HOST];
    if (dbHost) {
      this.config.mysql.host = dbHost;
    }
    
    const dbPort = process.env[ENV_VARS.DB_PORT];
    if (dbPort) {
      this.config.mysql.port = parseInt(dbPort, 10);
    }
    
    const dbUser = process.env[ENV_VARS.DB_USER];
    if (dbUser) {
      this.config.mysql.user = dbUser;
    }
    
    const dbPassword = process.env[ENV_VARS.DB_PASSWORD];
    if (dbPassword) {
      this.config.mysql.password = dbPassword;
    }
    
    const dbDatabase = process.env[ENV_VARS.DB_DATABASE];
    if (dbDatabase) {
      this.config.mysql.database = dbDatabase;
    }

    // その他の設定
    const debugValue = process.env[ENV_VARS.DEBUG];
    if (debugValue && ['true', '1', 'yes'].includes(debugValue.toLowerCase())) {
      this.config.debug = true;
    }
    
    const timeoutValue = process.env[ENV_VARS.QUERY_TIMEOUT];
    if (timeoutValue) {
      this.config.queryTimeout = parseInt(timeoutValue, 10);
    }
    
    const resultSizeValue = process.env[ENV_VARS.MAX_RESULT_SIZE];
    if (resultSizeValue) {
      this.config.maxResultSize = parseInt(resultSizeValue, 10);
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
    return this.config.queryTimeout || DEFAULT_VALUES.QUERY_TIMEOUT;
  }

  /**
   * 最大結果サイズ設定を取得
   */
  public getMaxResultSize(): number {
    return this.config.maxResultSize || DEFAULT_VALUES.MAX_RESULT_SIZE;
  }

  /**
   * デバッグモードかどうかを確認
   */
  public isDebugMode(): boolean {
    return this.config.debug;
  }

  /**
   * 保存済み接続情報の一覧を取得
   */
  public getStoredConnections(): StoredConnection[] {
    return this.connections;
  }
}
