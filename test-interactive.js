const fs = require('fs');
const { spawn } = require('child_process');
const readline = require('readline');

// MCPサーバーを起動
const mcpServer = spawn('node', [
  'dist/cli/cli.js',
  '--host', '127.0.0.1',
  '--port', '13306',
  '--user', 'root',
  '--database', 'mysql'
]);

// 標準出力からの読み込み設定
let serverReady = false;
const outputChunks = [];

mcpServer.stdout.on('data', (data) => {
  const dataStr = data.toString();
  console.log(`サーバー出力: ${dataStr}`);
  outputChunks.push(dataStr);
  
  // サーバー情報が出力されたら準備完了のサイン
  if (dataStr.includes('"type":"server_info"')) {
    serverReady = true;
    sendRequests();
  }
});

mcpServer.stderr.on('data', (data) => {
  console.error(`サーバーエラー: ${data}`);
});

mcpServer.on('close', (code) => {
  console.log(`サーバープロセスが終了しました。コード: ${code}`);
});

// リクエストを送信
function sendRequests() {
  console.log('リクエストの送信を開始します...');
  
  // データベース一覧の取得
  const getDatabasesRequest = {
    type: 'tool_request',
    request: {
      tool: 'get_databases',
      arguments: {}
    }
  };
  
  console.log('データベース一覧を取得します...');
  mcpServer.stdin.write(JSON.stringify(getDatabasesRequest) + '\n');
  
  // 少し待ってからテーブル一覧を取得
  setTimeout(() => {
    const getTablesRequest = {
      type: 'tool_request',
      request: {
        tool: 'get_tables',
        arguments: {
          database: 'mysql'
        }
      }
    };
    
    console.log('テーブル一覧を取得します...');
    mcpServer.stdin.write(JSON.stringify(getTablesRequest) + '\n');
    
    // 少し待ってからSQLクエリを実行
    setTimeout(() => {
      const executeQueryRequest = {
        type: 'tool_request',
        request: {
          tool: 'execute_query',
          arguments: {
            query: 'SELECT User, Host FROM mysql.user LIMIT 3'
          }
        }
      };
      
      console.log('SQLクエリを実行します...');
      mcpServer.stdin.write(JSON.stringify(executeQueryRequest) + '\n');
      
      // テスト終了後にサーバーを終了
      setTimeout(() => {
        console.log('テスト完了。サーバーを終了します...');
        mcpServer.kill('SIGINT');
      }, 2000);
    }, 2000);
  }, 2000);
}

// 10秒後にタイムアウトでプロセス終了
setTimeout(() => {
  console.log('タイムアウト。プロセスを終了します。');
  mcpServer.kill('SIGINT');
  process.exit(1);
}, 10000);
