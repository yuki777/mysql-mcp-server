#!/bin/bash

# リクエストをパイプして結果を取得するためのシェルスクリプト

# get_databases コマンドでテスト
echo "=== データベース一覧の取得 ==="
echo '{"type":"tool_request","request":{"tool":"get_databases","arguments":{}}}' | \
node dist/cli/cli.js --host 127.0.0.1 --port 13306 --user root

echo -e "\n\n=== テーブル一覧の取得 ==="
echo '{"type":"tool_request","request":{"tool":"get_tables","arguments":{"database":"mysql"}}}' | \
node dist/cli/cli.js --host 127.0.0.1 --port 13306 --user root

echo -e "\n\n=== テーブル構造の取得 ==="
echo '{"type":"tool_request","request":{"tool":"describe_table","arguments":{"table":"user","database":"mysql"}}}' | \
node dist/cli/cli.js --host 127.0.0.1 --port 13306 --user root

echo -e "\n\n=== クエリの実行 ==="
echo '{"type":"tool_request","request":{"tool":"execute_query","arguments":{"query":"SELECT User, Host FROM mysql.user LIMIT 3"}}}' | \
node dist/cli/cli.js --host 127.0.0.1 --port 13306 --user root
