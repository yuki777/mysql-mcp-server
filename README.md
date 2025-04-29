# MySQL MCP Server

MySQL Model Context Protocol（MCP）サーバーは、ローカル環境のMySQLデータベースに接続し、大規模言語モデル（LLM）がSQLクエリを実行できるようにするツールです。

## 機能

- **MySQLクエリの実行**: LLMからSQLクエリを直接実行
- **データベース情報の取得**: データベース一覧、テーブル一覧、テーブル構造の確認
- **MCP準拠**: Model Context Protocol に対応し、LLMと統合可能

## インストールと使用方法

### NPXでの実行

```bash
npx mysql-mcp-server --host localhost --port 3306 --user root --password yourpassword --database mydb
```

### オプション

| オプション | 説明 | デフォルト値 |
|----------|------|-------------|
| `-h, --host <host>` | MySQLホスト | localhost |
| `-p, --port <port>` | MySQLポート | 3306 |
| `-u, --user <user>` | MySQLユーザー | root |
| `--password <password>` | MySQLパスワード | (空文字) |
| `-d, --database <database>` | デフォルトデータベース | (オプション) |
| `-c, --config <path>` | 設定ファイルパス | (オプション) |
| `--server-port <port>` | MCPサーバーのポート | 3000 |
| `--server-host <host>` | MCPサーバーのホスト | localhost |
| `--query-timeout <ms>` | クエリタイムアウト(ミリ秒) | 30000 |
| `--max-results <count>` | 最大結果行数 | 1000 |
| `--debug` | デバッグモード | false |

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
    "port": 3306,
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
npx mysql-mcp-server -c ./mysql-mcp-config.json
```

## 提供されるMCPツール

| ツール名 | 説明 | 必須パラメータ |
|---------|------|-------------|
| execute_query | MySQLクエリを実行します | query: SQL文 |
| get_databases | 利用可能なデータベースの一覧を取得します | なし |
| get_tables | 指定したデータベース内のテーブル一覧を取得します | database (オプション) |
| describe_table | 指定したテーブルの構造を取得します | table |

## 使用例

### クエリ実行例

```bash
curl -X POST http://localhost:3000/tools -H "Content-Type: application/json" -d '{"tool":"execute_query","arguments":{"query":"SELECT * FROM users LIMIT 5"}}'
```

### テーブル構造の取得例

```bash
curl -X POST http://localhost:3000/tools -H "Content-Type: application/json" -d '{"tool":"describe_table","arguments":{"table":"users"}}'
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
