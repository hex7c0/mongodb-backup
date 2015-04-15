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
describe('parser', function() {

  var ROOT = __dirname + '/dump';

  it('should check custom parser', function(done) {

    var c = 0;
    backup({
      uri: URI,
      root: ROOT,
      collections: [ 'logins' ],
      parser: function(docs, name, next) {

        c++;
        assert.equal(Array.isArray(docs), true);
        assert.equal(typeof name, 'string');
        assert.equal(typeof next, 'function');
        next();
      },
      callback: function() {

        assert.equal(c > 0, true);
        done();
      }
    });
  });
});
