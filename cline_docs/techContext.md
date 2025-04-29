# MySQL MCP Server - 技術的背景

## 使用技術
- **言語**: TypeScript
- **ランタイム**: Node.js
- **データベース**: MySQL (接続クライアント)
- **Webフレームワーク**: Express
- **パッケージ管理**: npm

## 主要依存関係
- **mysql2**: MySQLデータベース接続用クライアント
- **typescript**: TypeScript言語サポート
- **ts-node**: TypeScriptファイルの直接実行
- **nodemon**: 開発時の自動リロード
- **express**: Webアプリケーションフレームワーク
- **commander**: コマンドラインインターフェース
- **cors**: CORSミドルウェア
- **body-parser**: リクエストボディの解析

## プロジェクト構造
```
mysql-mcp-server/
├── dist/               # コンパイル済みのJavaScriptファイル
├── src/
│   ├── cli/            # CLIインターフェース
│   │   └── utils/      # CLI関連のユーティリティ
│   ├── config/         # 設定管理
│   ├── core/           # MCPコア機能
│   ├── mysql/          # MySQL接続
│   ├── utils/          # 共通ユーティリティ
│   └── index.ts        # メインエントリーポイント
├── cline_docs/         # プロジェクト文書
├── package.json        # パッケージ情報
└── tsconfig.json       # TypeScript設定
```

## 開発環境セットアップ
1. **前提条件**:
   - Node.js (v16以上)
   - npm
   - MySQL サーバー (ローカルまたはリモート)

2. **開発ビルド手順**:
   ```bash
   # リポジトリのクローン
   git clone [repository-url]
   cd mysql-mcp-server

   # 依存関係のインストール
   npm install

   # 開発モードでの実行
   npm run dev
   ```

3. **本番ビルド**:
   ```bash
   # ビルド実行
   npm run build

   # 実行
   npm start
   ```

## 設定方法
### 環境変数
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_DATABASE=test
MCP_SERVER_PORT=3000
MCP_SERVER_HOST=localhost
QUERY_TIMEOUT=30000
MAX_RESULT_SIZE=1000
DEBUG=true
```

### 設定ファイル (JSON)
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

### コマンドライン引数
```bash
npx mysql-mcp-server --host localhost --port 3306 --user root --password yourpassword --database mydb
```

## 技術的制約
1. MySQLサーバーへのネットワーク接続が必要
2. 適切なデータベース権限が必要
3. クエリタイムアウトの設定による長時間実行クエリの制限（デフォルト30秒）
4. データ返却サイズの制限（デフォルト1000行、大量データの場合はLIMIT句の使用を推奨）
5. 現時点ではリソースアクセス機能は未実装
