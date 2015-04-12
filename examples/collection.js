'use strict';
/**
 * @file collection example
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
backup({
  uri: 'uri', // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
  root: __dirname,
  collections: [ 'logins' ]
});
