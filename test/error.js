'use strict';
/**
 * @file error test
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

/*
 * test module
 */
describe('error', function() {

  it('should return missing uri', function(done) {

    var mex = /missing uri option/;
    assert.throws(function() {

      backup();
    }, mex);
    assert.throws(function() {

      backup({});
    }, mex);
    assert.throws(function() {

      backup({
        root: 'ciao'
      });
    }, mex);
    done();
  });
  it('should return parser root', function(done) {

    var mex = /missing parser option/;
    assert.throws(function() {

      backup({
        uri: 'ciao',
        root: 'ciao',
        parser: 'ciao'
      });
    }, mex);
    done();
  });
  it('should return wrong uri', function(done) {

    var mex = /invalid schema, expected mongodb/;
    assert.throws(function() {

      backup({
        uri: 'ciao',
        root: 'ciao'
      });
    }, mex);
    done();
  });

  describe('root', function() {

    it('should return missing root', function(done) {

      var mex = /missing root option/;
      assert.throws(function() {

        backup({
          uri: 'ciao'
        });
      }, mex);
      done();
    });
    it('should return different error message (exists)', function(done) {

      var mex = /invalid schema, expected mongodb/;
      assert.throws(function() {

        backup({
          uri: 'ciao',
          root: __dirname
        });
      }, mex);
      done();
    });
    it('should return different error message (not file)', function(done) {

      var mex = /root option is not a directory/;
      assert.throws(function() {

        backup({
          uri: 'ciao',
          root: __dirname + '/error.js'
        });
      }, mex);
      done();
    });
  });
});
