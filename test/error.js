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
// import
try {
  var backup = require('..');
  var assert = require('assert');
} catch (MODULE_NOT_FOUND) {
  console.error(MODULE_NOT_FOUND);
  process.exit(1);
}

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
