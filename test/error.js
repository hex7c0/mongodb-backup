'use strict';
/**
 * @file error test
 * @module mongodb-backup
 * @package mongodb-backup
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

    var mex = 'missing uri option';
    try {
      backup();
    } catch (e) {
      assert.equal(e.message, mex);
    }
    try {
      backup({});
    } catch (e) {
      assert.equal(e.message, mex);
    }
    try {
      backup({
        root: 'ciao'
      });
    } catch (e) {
      assert.equal(e.message, mex);
    }
    done();
  });

  describe('root', function() {

    it('should return missing root', function(done) {

      var mex = 'missing root option';
      try {
        backup({
          uri: 'ciao'
        });
      } catch (e) {
        assert.equal(e.message, mex);
      }
      done();
    });
    it('should return different error message (exists)', function(done) {

      var mex = 'root option is not a directory';
      try {
        backup({
          uri: 'ciao',
          root: __dirname
        });
      } catch (e) {
        assert.notEqual(e.message, mex);
      }
      done();
    });
    it('should return different error message (not file)', function(done) {

      var mex = 'root option is not a directory';
      try {
        backup({
          uri: 'ciao',
          root: __dirname + '/error.js'
        });
      } catch (e) {
        assert.equal(e.message, mex);
      }
      done();
    });
  });

  it('should return parser root', function(done) {

    var mex = 'missing parser option';
    try {
      backup({
        uri: 'ciao',
        root: 'ciao',
        parser: 'ciao'
      });
    } catch (e) {
      assert.equal(e.message, mex);
    }
    done();
  });
  it('should return wrong uri', function(done) {

    var mex = 'URL must be in the format mongodb://user:pass@host:port/dbname';
    try {
      backup({
        uri: 'ciao',
        root: 'ciao'
      });
    } catch (e) {
      assert.equal(e.message, mex);
    }
    done();
  });
});
