'use strict';
/**
 * @file parser test
 * @module mongodb-backup
 * @subpackage test
 * @version 0.0.1
 * @author hex7c0 <hex7c0@gmail.com>
 * @license GPLv3
 */

/*
 * initialize module
 */
var backup = require('..');
var assert = require('assert');
var URI = process.env.URI;

/*
 * test module
 */
describe('parser', function () {

  var ROOT = __dirname + '/dump';

  it('should check custom parser', function (done) {

    var c = 0;
    backup({
      uri: URI,
      dbName: 'backup-tests',
      root: ROOT,
      collections: ['logins'],
      parser: function (docs, name, next) {

        c++;
        assert.equal(Array.isArray(docs), false);
        assert.equal(typeof name, 'string');
        assert.equal(typeof next, 'undefined');
        // next();
      },
      callback: function (err) {

        assert.ifError(err);
        assert.equal(c > 0, true);
        done();
      }
    });
  });
});
