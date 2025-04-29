#!/usr/bin/env node

/**
 * MySQL MCP Server の接続管理機能をテストするためのスクリプト
 * 
 * このスクリプトは、MCPサーバーを起動し、接続管理ツールを使って
 * データベースへの接続、切断、接続状態の確認などの操作をテストします。
 * 
 * 使用方法：
 * node test-connection-management.js
 */

const { spawn } = require('child_process');
const readline = require('readline');

// サーバープロセス
let serverProcess;

// サーバーとの通信用のオブジェクト
const server = {
  // リクエストIDカウンター
  requestId: 0,
  
  // リクエストを送信する関数
  sendRequest: function(toolName, args = {}) {
    const requestId = `req_${++this.requestId}`;
    const request = {
      type: 'tool_request',
      request: {
        request_id: requestId,
        tool: toolName,
        arguments: args
      }
    };
    
    console.log(`\n>> リクエスト送信: ${toolName}`);
    console.log(JSON.stringify(args, null, 2));
    
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
    return requestId;
  }
};

// テストシナリオの実行
async function runTests() {
  console.log('=== MySQL MCP Server 接続管理テスト ===\n');
  
  // 1. 接続状態の確認（未接続）
  console.log('\n=== テスト 1: 接続状態の確認（初期状態）===');
  await delay(1000); // サーバーの起動を待つ
  server.sendRequest('get_connection_status');
  await delay(500);
  
  // 2. クエリ実行（接続なし - エラー）
  console.log('\n=== テスト 2: 接続なしでクエリ実行（エラー）===');
  server.sendRequest('execute_query', { query: 'SELECT 1' });
  await delay(500);
  
  // 3. データベースに接続
  console.log('\n=== テスト 3: データベースに接続 ===');
  server.sendRequest('connect_database', {
    host: 'localhost',
    port: 13306, // プロジェクトのデフォルトMySQLポート
    user: 'root',
    password: '',
    database: 'mysql' // 標準データベース
  });
  await delay(1000);
  
  // 4. 接続状態の確認（接続済み）
  console.log('\n=== テスト 4: 接続状態の確認（接続後）===');
  server.sendRequest('get_connection_status');
  await delay(500);
  
  // 5. クエリ実行（接続あり - 成功）
  console.log('\n=== テスト 5: 接続ありでクエリ実行 ===');
  server.sendRequest('execute_query', { query: 'SELECT 1 AS success' });
  await delay(500);
  
  // 6. データベース切断
  console.log('\n=== テスト 6: データベース切断 ===');
  server.sendRequest('disconnect_database');
  await delay(500);
  
  // 7. 接続状態の確認（切断後）
  console.log('\n=== テスト 7: 接続状態の確認（切断後）===');
  server.sendRequest('get_connection_status');
  await delay(500);
  
  // 8. 別接続設定でデータベースに再接続
  console.log('\n=== テスト 8: 別データベースに接続 ===');
  server.sendRequest('connect_database', {
    host: 'localhost',
    port: 13306,
    user: 'root',
    password: '',
    database: 'information_schema' // 別のデータベース
  });
  await delay(1000);
  
  // 9. テーブル一覧取得（別データベース）
  console.log('\n=== テスト 9: テーブル一覧の取得 ===');
  server.sendRequest('get_tables');
  await delay(500);

  console.log('\n\nすべてのテストが完了しました。5秒後に終了します...');
  await delay(5000);
  terminate();
}

// ユーティリティ関数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// サーバーの起動
function startServer() {
  console.log('MCPサーバーを起動しています...');
  serverProcess = spawn('node', ['dist/cli/cli.js', '--debug']);
  
  // エラーが発生したかのフラグ
  let hasError = false;
  
  // サーバーの標準出力を処理
  serverProcess.stdout.on('data', (data) => {
    try {
      const responses = data.toString().trim().split('\n');
      
      for (const response of responses) {
        if (!response.trim()) continue;
        
        const parsed = JSON.parse(response);
        
        if (parsed.type === 'tool_response') {
          const toolResponse = parsed.response;
          console.log(`<< レスポンス受信: ${toolResponse.request_id || '不明なリクエストID'}`);
          
          if (toolResponse.error) {
            console.log(`エラー: ${toolResponse.error}`);
            
            // エラーが想定内かどうかをチェック
            const isExpectedError = checkIfExpectedError(toolResponse.error);
            
            if (!isExpectedError) {
              // 想定外のエラーの場合はフラグを設定し、エラーコード1で終了
              hasError = true;
              console.log('\nテスト失敗: 想定外のエラーが検出されたため中断します');
              terminate(1);
            } else {
              // 想定内のエラーの場合は次のテストに進む
              console.log('(想定内のエラーなので、テストを続行します)');
            }
          } else {
            console.log(JSON.stringify(toolResponse.result, null, 2));
          }
        } else if (parsed.type === 'error') {
          console.log(`<< エラーレスポンス:`);
          console.log(`エラー: ${parsed.error}`);
          
          // エラーが想定内かどうかをチェック
          const isExpectedError = checkIfExpectedError(parsed.error);
          
          if (!isExpectedError) {
            // 想定外のエラーの場合はフラグを設定し、エラーコード1で終了
            hasError = true;
            console.log('\nテスト失敗: 想定外のエラーが検出されたため中断します');
            terminate(1);
          } else {
            // 想定内のエラーの場合は次のテストに進む
            console.log('(想定内のエラーなので、テストを続行します)');
          }
        } else if (parsed.type === 'server_info') {
          console.log(`<< サーバー情報受信:`);
          console.log(JSON.stringify(parsed.info, null, 2));
        } else {
          console.log(`<< 未知のレスポンスタイプ: ${parsed.type}`);
          console.log(JSON.stringify(parsed, null, 2));
        }
      }
    } catch (e) {
      console.log('サーバー出力（解析不能）:', data.toString());
    }
  });
  
  // サーバーの標準エラー出力を処理
  serverProcess.stderr.on('data', (data) => {
    console.log('サーバーログ:', data.toString().trim());
  });
  
  // サーバープロセスの終了を処理
  serverProcess.on('close', (code) => {
    console.log(`サーバーが終了しました。終了コード: ${code}`);
    process.exit(code);
  });
}

/**
 * 想定されたエラーかどうかをチェック
 * @param {string} errorMessage エラーメッセージ
 * @returns {boolean} 想定内のエラーならtrue
 */
function checkIfExpectedError(errorMessage) {
  // 想定されるエラーメッセージのリスト
  const expectedErrors = [
    'Database not connected. Please use connect_database tool first',
    'Query execution failed: Database not connected',
    'Empty query',
    'Invalid query',
    'Missing required parameter'
  ];
  
  // エラーメッセージに想定内のものが含まれているかチェック
  return expectedErrors.some(expected => errorMessage.includes(expected));
}

// 終了処理
function terminate(exitCode = 0) {
  if (serverProcess) {
    console.log('サーバーを終了しています...');
    serverProcess.kill();
  }
  process.exit(exitCode);
}

// Ctrl+C などでの終了時の処理
process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);

// メイン処理
startServer();
runTests();
