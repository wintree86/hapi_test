'use strict';

const Pg = require('pg');
const pkg = require('../package.json');
var PG_CON = []; // this "global" is local to the plugin.
let run_once = false;

// db 정보
var dbConfig = {
    user: 'postgres',
    database: 'test',
    password: 'tmdahr1234',
    host: 'localhost',
    port: 5433,
    max:10, // max number of clients in the pool
    idleTimeoutMillis:30000, // how long a client is allowed to remain idle before being closed
};

// connect once and expose the connection via PG_CON
Pg.connect(dbConfig, function(err, client, done) {
    console.log('start pg connect!');
    if (err) {
        return server.log('error',err);
    }
    PG_CON.push({ client: client, done: done });
    return;
});

// requset 에다가 pg 정보를 넣음
function assign_connection(request, reply) {
    request.pg = exports.getCon();
    reply.continue();
};

exports.register = function(server, optinos, next) {
    server.ext('onPreAuth', function (request,reply) {
       // each conneciton created is shut down when the server stop
        if (!run_once) {
           run_once = true;
           server.on('stop', function() {
              PG_CON.forEach(function (con) {
                  con && con.client && con.client.readyForQuery && con.client.end();
                  con && con.done && con.done();
              });
              server.log(['info',pkg.name], 'DB connection Closed');
           });
        }
        if (PG_CON.length === 0) {
            console.log('in function');
            pg.connect(dbConfig, function(err,client, done) {
                PG_CON.push({ client: client, done: done});
                assign_connection(request, reply);
            });
        } else {
            assign_connection(request, reply);
        }
    });
    next();
};

exports.register.attributes = {
    pkg: pkg
};

exports.getCon = function() {
    return { client: PG_CON[0].client, done: PG_CON[0].done };
};

