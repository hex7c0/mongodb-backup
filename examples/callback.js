'use strict';
/**
 * @file callback example
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
  root: __dirname, // write files into this dir
  callback: function(err) {

    if (err) {
      console.error(err);
    } else {
      console.log('finish');
    }
  }
});
