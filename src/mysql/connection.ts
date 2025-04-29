import mysql, { Pool, PoolConnection, PoolOptions, SslOptions, RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2/promise';
import { MySQLConfig, QueryResult } from '../core/types';

/**
 * MySQLデータベース接続を管理するクラス
 */
export class MySQLConnection {
  private pool: Pool | null = null;
  private config: MySQLConfig;
  private isConnected: boolean = false;
  private queryTimeout: number;

  /**
   * コンストラクタ
   * @param config MySQL接続設定
   * @param queryTimeout クエリタイムアウト（ミリ秒）
   */
  constructor(config: MySQLConfig, queryTimeout: number = 30000) {
    this.config = config;
    this.queryTimeout = queryTimeout;
  }

  /**
   * MySQL接続プールを初期化
   */
  public async initialize(): Promise<void> {
    try {
      if (this.pool) {
        return;
      }

      const poolOptions: PoolOptions = {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        ssl: this.config.ssl as string | SslOptions | undefined,
        connectionLimit: this.config.connectionLimit || 10,
        timezone: this.config.timezone || 'local',
        charset: this.config.charset || 'utf8mb4',
      };

      this.pool = mysql.createPool(poolOptions);
      
      // 接続テスト
      await this.ping();
      this.isConnected = true;
      
      console.log(`MySQL connection established to ${this.config.host}:${this.config.port}`);
    } catch (error) {
      this.isConnected = false;
      console.error('Failed to initialize MySQL connection pool:', error);
      throw new Error(`MySQL connection failed: ${(error as Error).message}`);
    }
  }

  /**
   * 接続状態を確認
   * @returns 接続状態
   */
  public isConnectedToDatabase(): boolean {
    return this.isConnected;
  }

  /**
   * 接続を確認（ping）
   */
  public async ping(): Promise<boolean> {
    if (!this.pool) {
      throw new Error('Connection pool not initialized');
    }
    
    const conn = await this.pool.getConnection();
    try {
      await conn.ping();
      return true;
    } finally {
      conn.release();
    }
  }

  /**
   * SQLクエリを実行
   * @param sql SQLクエリ文
   * @param params クエリパラメータ
   * @returns クエリ結果
   */
  public async executeQuery(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.pool) {
      await this.initialize();
    }

    if (!this.pool) {
      throw new Error('Connection pool not initialized');
    }

    const conn = await this.pool.getConnection();
    try {
      // クエリタイムアウトの設定
      await conn.query(`SET SESSION MAX_EXECUTION_TIME=${Math.floor(this.queryTimeout / 1000) * 1000}`);
      
      const [rows, fields] = await conn.query(sql, params);
      
      // クエリ結果の整形
      if (Array.isArray(rows)) {
        return {
          data: rows as any[],
          fields: fields as any[]
        };
      } else {
        // INSERT, UPDATE, DELETE 等の結果
        const okPacket = rows as OkPacket | ResultSetHeader;
        return {
          data: [],
          metadata: {
            affectedRows: okPacket.affectedRows,
            insertId: okPacket.insertId,
            changedRows: 'changedRows' in okPacket ? okPacket.changedRows : undefined
          }
        };
      }
    } catch (error) {
      console.error('Query execution failed:', error);
      throw new Error(`Query failed: ${(error as Error).message}`);
    } finally {
      conn.release();
    }
  }

  /**
   * トランザクションを取得
   * @returns トランザクション用の接続
   */
  public async getTransaction(): Promise<PoolConnection> {
    if (!this.pool) {
      await this.initialize();
    }

    if (!this.pool) {
      throw new Error('Connection pool not initialized');
    }

    const conn = await this.pool.getConnection();
    await conn.beginTransaction();
    return conn;
  }

  /**
   * 接続を閉じる
   */
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('MySQL connection pool closed');
    }
  }
}
