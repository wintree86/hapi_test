'use strict';
const Hapi = require('hapi');
const server = new Hapi.Server();

// server.register 되어야 하는 모듈
const Good = require('good'); // 모니터링
const Vision = require('vision'); // template 변환
const Inert = require('inert'); // Static file and directory handler for hapi.js
const Lout = require('lout'); // api docs generator

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
server.register([ { register: Good, options:goodOptions }, Vision, Inert, Lout ], (err) => {
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