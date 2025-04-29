# MySQL MCP Server

MySQL Model Context Protocol（MCP）サーバーは、ローカル環境のMySQLデータベースに接続し、大規模言語モデル（LLM）がSQLクエリを実行できるようにするツールです。

## 要件

- **Node.js**: 20.0.0以上
- **MySQL**: 5.7以上のMySQLまたはMariaDBサーバー

## 機能

- **MySQLクエリの実行**: LLMからSQLクエリを直接実行
- **データベース情報の取得**: データベース一覧、テーブル一覧、テーブル構造の確認
- **MCP準拠**: Model Context Protocol に対応し、LLMと統合可能
- **stdio通信**: 標準入出力を使用してLLMと通信、ポートバインドなし
- **接続情報の保存**: データベース接続情報をローカルに保存し再利用

## インストールと使用方法

### NPXでの一時実行

```bash
 npx -y https://github.com/yuki777/mysql-mcp-server --host 127.0.0.1 --port 13306 --user root
```

### オプション

| オプション | 説明 | デフォルト値 |
|----------|------|-------------|
| `-h, --host <host>` | MySQLホスト | localhost |
| `-p, --port <port>` | MySQLポート | 13306 |
| `-u, --user <user>` | MySQLユーザー | root |
| `--password <password>` | MySQLパスワード | (空文字) |
| `-d, --database <database>` | デフォルトデータベース | (オプション) |
| `-c, --config <path>` | 設定ファイルパス | (オプション) |
| `--auto-connect` | サーバー起動時に自動的にデータベースに接続 | false |
| `--server-port <port>` | MCPサーバーポート（stdioモードでは使用されません） | 3000 |
| `--server-host <host>` | MCPサーバーホスト（stdioモードでは使用されません） | localhost |
| `--query-timeout <ms>` | クエリタイムアウト(ミリ秒) | 30000 |
| `--max-results <count>` | 最大結果行数 | 1000 |
| `--debug` | デバッグモード | false |

### 接続情報の保存と再利用

MySQL MCP Serverは、正常に接続したデータベースの情報をローカルに保存します。これにより、次回の起動時に接続情報を自動的に再利用できます。保存された接続情報は、ユーザーのホームディレクトリにある `.mysql-mcp-connections.json` ファイルに保存されます。

接続情報には以下が含まれます：
- ホスト名
- ポート番号
- ユーザー名
- パスワード
- データベース名（設定されている場合）

### 設定ファイルの使用

設定ファイル（JSON形式）を使用して接続情報を設定することもできます：

```json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "mysql": {
    "host": "localhost",
    "port": 13306,
    "user": "root",
    "password": "yourpassword",
    "database": "mydb"
  },
  "debug": false,
  "queryTimeout": 30000,
  "maxResultSize": 1000
}
```

設定ファイルを使用する場合:

```bash
npx -y https://github.com/yuki777/mysql-mcp-server -c ./mysql-mcp-config.json
```

## 通信方式

MySQL MCP ServerはMCP (Model Context Protocol) に準拠した「stdio」モードで動作します。これにより特定のポートにバインドせず、標準入出力を介して通信します。これには次のような利点があります：

1. **ポート競合の回避**: 特定のポートを使用しないため、ポート競合の問題が発生しません
2. **セキュリティ向上**: ネットワーク通信を使用しないため、ネットワークレベルの攻撃リスクが軽減
3. **簡素なプロセス間通信**: LLMとの通信がシンプル化

### 注意点

- stdioモードでは、JSON形式のメッセージをやり取りします
- 一行に一つのJSONメッセージを送信する必要があります
- エラー情報と接続ログは標準エラー（stderr）に出力されます

## 提供されるMCPツール

### データベース接続管理

| ツール名 | 説明 | 必須パラメータ |
|---------|------|-------------|
| connect_database | データベースに接続します | host, port, user |
| disconnect_database | 現在のデータベース接続を切断します | なし |
| get_connection_status | データベース接続の状態を取得します | なし |

### SQLクエリ操作

| ツール名 | 説明 | 必須パラメータ |
|---------|------|-------------|
| execute_query | MySQLクエリを実行します | query: SQL文 |
| get_databases | 利用可能なデータベースの一覧を取得します | なし |
| get_tables | 指定したデータベース内のテーブル一覧を取得します | database (オプション) |
| describe_table | 指定したテーブルの構造を取得します | table |

## 接続管理機能

MySQL MCP Serverでは、サーバーの起動とデータベース接続を分離することができます。このアプローチにより以下のメリットがあります：

1. **接続情報なしでの起動**: サーバーはデータベース接続情報がなくても起動可能
2. **複数データベースへの接続**: サーバー起動後に異なるデータベースへ接続の切り替えが可能
3. **シンプルなインストール**: `npx -y https://github.com/yuki777/mysql-mcp-server` だけで実行可能

### 接続管理の使用方法

1. **自動接続なしでサーバーを起動**:
   ```bash
   npx -y https://github.com/yuki777/mysql-mcp-server
   ```

2. **接続ツールを使用してデータベースに接続**:
   ```json
   {
     "type": "tool_call",
     "request_id": "req_1",
     "tool": "connect_database",
     "arguments": {
       "host": "localhost",
       "port": 3306,
       "user": "root",
       "password": "your_password",
       "database": "your_db"
     }
   }
   ```

3. **接続状態の確認**:
   ```json
   {
     "type": "tool_call",
     "request_id": "req_2",
     "tool": "get_connection_status",
     "arguments": {}
   }
   ```

4. **接続の切断**:
   ```json
   {
     "type": "tool_call",
     "request_id": "req_3",
     "tool": "disconnect_database",
     "arguments": {}
   }
   ```

### テスト用スクリプト

リポジトリには `test-connection-management.js` というテストスクリプトが含まれています。このスクリプトを使用して、接続管理機能をテストできます：

```bash
node test-connection-management.js
```

## 開発者向け情報

### 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone [repository-url]
cd mysql-mcp-server

# 依存関係のインストール
npm install

# 開発モードでの実行
npm run dev
```

### ビルド

```bash
npm run build
```

## ライセンス

ISC

## 貢献

バグレポートや機能リクエスト、プルリクエストを歓迎します。
