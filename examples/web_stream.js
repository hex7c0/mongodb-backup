'use strict';
/**
 * @file web stream example
 * @module mongodb-backup
 * @subpackage examples
 * @version 0.0.0
 * @author hex7c0 <hex7c0@gmail.com>
 * @license GPLv3
 */

/*
 * initialize module
 */
// import
var backup = require('..'); // use require('mongodb-backup') instead

/*
 * use
 */

var http = require('http');
http.createServer(function(req, res) {

  res.writeHead(200, {
    'Content-Type': 'application/x-tar'
  });

  backup({
    uri: 'uri', // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
    collections: [ 'logins' ],
    tar: 'dump.tar', // just for enable tar
    stream: res
  });

}).listen(3000, '127.0.0.1');
