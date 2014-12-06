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
  var backup = require('..');
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

      backup({
        uri: URI,
        root: ROOT,
        collections: [ 'logins' ],
        parser: 'json',
        callback: function() {

          fs.readdirSync(ROOT).forEach(function(first) { // database

            var database = ROOT + '/' + first;
            if (fs.statSync(database).isDirectory() === false) {
              return;
            }
            var second = fs.readdirSync(database);
            assert.equal(second.length, 1);
            assert.equal(second[0], 'logins');
            var collection = database + '/' + second[0];
            if (fs.statSync(collection).isDirectory() === false) {
              return;
            }
            fs.readdirSync(collection).forEach(function(third) { // document

              assert.equal(extname(third), '.json');
              var document = collection + '/' + third;
              fs.unlinkSync(document);
            });
            fs.rmdirSync(collection);
            fs.rmdirSync(database);
          });
          done();
        }
      });
    });
    it('should build 1 directory (*.bson)', function(done) {

      backup({
        uri: URI,
        root: ROOT,
        collections: [ 'logins' ],
        parser: 'bson',
        callback: function() {

          fs.readdirSync(ROOT).forEach(function(first) { // database

            var database = ROOT + '/' + first;
            if (fs.statSync(database).isDirectory() === false) {
              return;
            }
            var second = fs.readdirSync(database);
            assert.equal(second.length, 1);
            assert.equal(second[0], 'logins');
            var collection = database + '/' + second[0];
            if (fs.statSync(collection).isDirectory() === false) {
              return;
            }
            fs.readdirSync(collection).forEach(function(third) { // document

              assert.equal(extname(third), '.bson');
              var document = collection + '/' + third;
              fs.unlinkSync(document);
            });
            fs.rmdirSync(collection);
            fs.rmdirSync(database);
          });
          done();
        }
      });
    });
  });

  describe('parser', function() {

    it('should build any directories (*.json)', function(done) {

      backup({
        uri: URI,
        root: ROOT,
        parser: 'json',
        callback: function() {

          fs.readdirSync(ROOT).forEach(function(first) { // database

            var database = ROOT + '/' + first;
            if (fs.statSync(database).isDirectory() === false) {
              return;
            }
            fs.readdirSync(database).forEach(function(second) { // collection

              var collection = database + '/' + second;
              if (fs.statSync(collection).isDirectory() === false) {
                return;
              }
              fs.readdirSync(collection).forEach(function(third) { // document

                assert.equal(extname(third), '.json');
                var document = collection + '/' + third;
                fs.unlinkSync(document);
              });
              fs.rmdirSync(collection);
            });
            fs.rmdirSync(database);
          });
          done();
        }
      });
    });
    it('should build any directories (*.bson)', function(done) {

      backup({
        uri: URI,
        root: ROOT,
        parser: 'bson',
        callback: function() {

          fs.readdirSync(ROOT).forEach(function(first) { // database

            var database = ROOT + '/' + first;
            if (fs.statSync(database).isDirectory() === false) {
              return;
            }
            fs.readdirSync(database).forEach(function(second) { // collection

              var collection = database + '/' + second;
              if (fs.statSync(collection).isDirectory() === false) {
                return;
              }
              fs.readdirSync(collection).forEach(function(third) { // document

                assert.equal(extname(third), '.bson');
                var document = collection + '/' + third;
                fs.unlinkSync(document);
              });
              fs.rmdirSync(collection);
            });
            fs.rmdirSync(database);
          });
          done();
        }
      });
    });
  });

  describe('tar', function() {

    it('should make a tar file', function(done) {

      backup({
        uri: URI,
        root: ROOT,
        tar: 't1.tar',
        callback: function() {

          var path = ROOT + '/t1.tar';
          assert.equal(fs.existsSync(path), true);
          fs.unlink(path, function() {

            done();
          });
        }
      });
    });
    it('should check that buffer dir not exist', function(done) {

      var path = __dirname + '/../dump';
      assert.equal(fs.existsSync(path), true); // stay alive
      assert.equal(fs.readdirSync(path).length, 0, 'empty dir');
      done();
    });
    it('should remove dirs', function(done) {

      fs.readdirSync(ROOT).forEach(function(first) { // database

        var database = ROOT + '/' + first;
        if (fs.statSync(database).isDirectory() === false) {
          return;
        }
        fs.readdirSync(database).forEach(function(second) { // collection

          var collection = database + '/' + second;
          if (fs.statSync(collection).isDirectory() === false) {
            return;
          }
          fs.readdirSync(collection).forEach(function(third) { // document

            assert.equal(extname(third), '.bson');
            var document = collection + '/' + third;
            fs.unlinkSync(document);
          });
          fs.rmdirSync(collection);
        });
        fs.rmdirSync(database);
      });
      done();
    });
  });

  describe('logger', function() {

    it('should make a log file', function(done) {

      backup({
        uri: URI,
        root: ROOT,
        logger: 'l1.log',
        callback: function() {

          var path = 'l1.log';
          assert.equal(fs.existsSync(path), true);
          fs.unlink(path, function() {

            done();
          });
        }
      });
    });
    it('should check that buffer dir not exist', function(done) {

      var path = __dirname + '/../dump';
      assert.equal(fs.existsSync(path), true); // stay alive
      assert.equal(fs.readdirSync(path).length, 0, 'empty dir');
      done();
    });
    it('should remove dirs', function(done) {

      fs.readdirSync(ROOT).forEach(function(first) { // database

        var database = ROOT + '/' + first;
        if (fs.statSync(database).isDirectory() === false) {
          return;
        }
        fs.readdirSync(database).forEach(function(second) { // collection

          var collection = database + '/' + second;
          if (fs.statSync(collection).isDirectory() === false) {
            return;
          }
          fs.readdirSync(collection).forEach(function(third) { // document

            assert.equal(extname(third), '.bson');
            var document = collection + '/' + third;
            fs.unlinkSync(document);
          });
          fs.rmdirSync(collection);
        });
        fs.rmdirSync(database);
      });
      done();
    });
  });
});
