'use strict';
/**
 * @file web stream example
 * @module mongodb-backup
 * @subpackage examples
 * @version 0.0.1
 * @author hex7c0 <hex7c0@gmail.com>
 * @license GPLv3
 */

/*
 * initialize module
 */
var backup = require('..'); // use require('mongodb-backup') instead

/*
 * use
 */
var http = require('http');
http.createServer(function(req, res) {

  res.writeHead(200, {
    'Content-Type': 'application/x-tar' // force header for tar download
  });

  backup({
    uri: 'uri', // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
    collections: [ 'logins' ], // save this collection only
    stream: res, // send stream into client response
  });
}).listen(3000);
console.log('Server running at http://127.0.0.1:3000/');
