'use strict';
/**
 * @file structure test
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
  var monitode = require('..');
  var assert = require('assert');
  var fs = require('fs');
  var extname = require('path').extname;
  var URI = process.env.URI;
} catch (MODULE_NOT_FOUND) {
  console.error(MODULE_NOT_FOUND);
  process.exit(1);
}

/*
 * test module
 */
describe('structure', function() {

  var ROOT = __dirname + '/dump';
  this.timeout(10000);

  describe('collections', function() {

    it('should build 1 directory (*.json)', function(done) {

      monitode({
        uri: URI,
        root: ROOT,
        collections: [ 'logins' ],
        parser: 'json',
        callback: function() {

          fs.readdirSync(ROOT).forEach(function(first) { // database

            var second = ROOT + '/' + first;
            if (!fs.statSync(second).isDirectory()) {
              return;
            }
            var third = fs.readdirSync(second);
            assert.equal(third.length, 1);
            third = third[0];
            assert.equal(third, 'logins');
            var last = second + '/' + third;
            if (!fs.statSync(last).isDirectory()) {
              return;
            }
            fs.readdirSync(last).forEach(function(item) { // documents

              assert.equal(extname(item), '.json');
              fs.unlinkSync(last + '/' + item);
            });
          });
          done();
        }
      });
    });
    it('should build 1 directory (*.bson)', function(done) {

      monitode({
        uri: URI,
        root: ROOT,
        collections: [ 'logins' ],
        parser: 'bson',
        callback: function() {

          fs.readdirSync(ROOT).forEach(function(first) { // database

            var second = ROOT + '/' + first;
            if (!fs.statSync(second).isDirectory()) {
              return;
            }
            var third = fs.readdirSync(second);
            assert.equal(third.length, 1);
            third = third[0];
            assert.equal(third, 'logins');
            var last = second + '/' + third;
            if (!fs.statSync(last).isDirectory()) {
              return;
            }
            fs.readdirSync(last).forEach(function(item) { // documents

              assert.equal(extname(item), '.bson');
              fs.unlinkSync(last + '/' + item);
            });
          });
          done();
        }
      });
    });
  });

  describe('parser', function() {

    it('should build any directories (*.json)', function(done) {

      monitode({
        uri: URI,
        root: ROOT,
        parser: 'json',
        callback: function() {

          fs.readdirSync(ROOT).forEach(function(first) { // database

            var second = ROOT + '/' + first;
            if (!fs.statSync(second).isDirectory()) {
              return;
            }
            fs.readdirSync(second).forEach(function(third) { // collections

              var last = second + '/' + third;
              if (!fs.statSync(last).isDirectory()) {
                return;
              }
              fs.readdirSync(last).forEach(function(item) { // documents

                assert.equal(extname(item), '.json');
                fs.unlinkSync(last + '/' + item);
              });
            });
          });
          done();
        }
      });
    });
    it('should build any directories (*.bson)', function(done) {

      monitode({
        uri: URI,
        root: ROOT,
        parser: 'bson',
        callback: function() {

          fs.readdirSync(ROOT).forEach(function(first) { // database

            var second = ROOT + '/' + first;
            if (!fs.statSync(second).isDirectory()) {
              return;
            }
            fs.readdirSync(second).forEach(function(third) { // collections

              var last = second + '/' + third;
              if (!fs.statSync(last).isDirectory()) {
                return;
              }
              fs.readdirSync(last).forEach(function(item) { // documents

                assert.equal(extname(item), '.bson');
                fs.unlinkSync(last + '/' + item);
              });
            });
          });
          done();
        }
      });
    });
  });

  describe('tar', function() {

    it('should make a tar file', function(done) {

      monitode({
        uri: URI,
        root: ROOT,
        tar: 't1.tar',
        callback: function() {

          assert.equal(fs.existsSync(ROOT + '/t1.tar'), true);
          fs.unlink(ROOT + '/t1.tar', function() {

            done();
          });
        }
      });
    });
    it('should check that buffer dir not exist', function(done) {

      assert.equal(fs.existsSync(__dirname + '/../dump'), false);
      done();
    });
  });
});
