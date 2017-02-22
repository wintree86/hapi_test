'use strict';
const Hapi = require('hapi');
const server = new Hapi.Server();

// server.register 되어야 하는 모듈
const Good = require('good'); // 모니터링
const Vision = require('vision'); // template 변환
const Inert = require('inert'); // Static file and directory handler for hapi.js
const Lout = require('lout'); // api docs generator
const pg = require('./lib/postgres');

// 서버 정보
server.connection({
    host:'localhost',
    port:'3000'
});

// 로그 옵션
const goodOptions = {
  ops: {
      interval: 1000
  },
  reporters: {
      console: [{
          module: 'good-squeeze',
          name: 'Squeeze',
          args: [{
              response: '*',
              log: '*'
          }]
      },{
          module: 'good-console'
      },'stdout'],
      file: [{
          module: 'good-squeeze',
          name: 'Squeeze',
          args: [{ response: '*' }]
      },{
          module: 'good-squeeze',
          name: 'SafeJson'
      },{
          module: 'good-file',
          args: [
              './logs/simple_todo.log'
          ]
      }]
  }
};

//server.register 시 option이 존재하는 경우 [] 안에 {} 형태로 넣어줘야 함
server.register([ { register: Good, options:goodOptions }, Vision, Inert, Lout, pg ], (err) => {
    // register error 시 처리
    if (err)
        return server.log('error',err);

    // view 엔진 셋팅
    server.views({
        engines:{
            'html':{
                module: require('handlebars')
            }
        },
        relativeTo: __dirname,
        path: 'views'
    });

    // server start
    server.start((err) => {
    if (err) {
        return server.log('error',err);
    }
    server.log('info', 'Simple Todo Server Running at: '+ server.info.uri);
   });
});

// route 를 밖에다가 되도 괜찮을까?
server.route({
    method:'GET',
    path: '/',
    handler: function(request, reply) {
        reply.view('index');
    }
});

server.route({
    method:'GET',
    path: '/db_test',
    handler: function(request, reply) {
        let query = 'select * from testa';
        request.pg.client.query(query, function(err, result) {
            return reply(result.rows);
        });
    }
});

server.route({
    method:'GET',
    path: '/todo',
    handler: function(request, reply) {
        let query = 'select * from simple_todo order by api_time desc';
        request.pg.client.query(query, function(err, result) {
            return reply(result.rows);
        });
    }
});

server.route({
    method:'POST',
    path: '/todo/new',
    handler: function(request, reply) {
        let api_time = new Date().getTime();
        let context = request.payload.context;
        let state = false;

        // 인자넣는 방식 1
        // 하나의 문자열로 만듬
        let query = `insert into simple_todo values (${api_time},\'${context}\',${state})`;
        request.pg.client.query(query, function(err, result) {
            if (err) {
                throw err;
            }
            return reply('ok');
        });
    }
});

server.route({
    method:'POST',
    path: '/todo/update',
    handler: function(request, reply) {
        let api_time = request.payload.api_time;
        // String to Boolean
        let state = (request.payload.state == 'true');

        // 인자넣는 방식 2
        // 인자가 들어가는 부분은 $1, $2 로 표기 ::을 이용해 타입명을 명시할 수 있음
        // 들어가는 인자는 query의 두번째 인자로 array 형태로 넣어줌
        let query = 'UPDATE simple_todo SET state = $1::boolean WHERE api_time = $2';
        request.pg.client.query(query, [state, api_time], function(err, result) {
            if (err) {
                throw err;
            }
            return reply(result);
        });
    }
});


server.route({
    method:'POST',
    path: '/todo/delete',
    handler: function(request, reply) {
        let api_time = request.payload.api_time;

        let query = 'DELETE FROM simple_todo WHERE api_time = $1';
        request.pg.client.query(query, [api_time], function(err, result) {
            if (err) {
                throw err;
            }
            return reply(result);
        });
    }
});

