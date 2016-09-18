'use strict';
/**
 * @file structure test
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
var fs = require('fs');
var extname = require('path').extname;
var URI = process.env.URI;

var pad = function(val, len) {

  var val = String(val);
  var len = len || 2;
  while (val.length < len) {
    val = '0' + val;
  }
  return val;
};

/*
 * test module
 */
describe('structure', function() {

  var ROOT = __dirname + '/dump';

  describe('with query', function() {

    describe('errors', function() {

      it('should return error beacause collection does not exist',
        function(done) {

          backup({
            uri: URI,
            root: ROOT,
            collections: [ 'foobar' ],
            callback: function(err) {

              assert.notEqual(err, null);
              assert.ok(/does not exist/.test(err.message));
              fs.readdirSync(ROOT).forEach(function(first) { // database

                var database = ROOT + '/' + first;
                fs.stat(database + '/foobar', function(err) {

                  assert.notEqual(err, null);
                  // assert.ok(/no such file or directory/.test(err.message));
                  done();
                });
              });
            }
          });
        });
      it('should return error beacause collections does not exist',
        function(done) {

          backup({
            uri: URI,
            root: ROOT,
            collections: [ 'foo', 'bar' ],
            callback: function(err) {

              assert.notEqual(err, null);
              assert.ok(/does not exist/.test(err.message));
              fs.readdirSync(ROOT).forEach(function(first) { // database

                var database = ROOT + '/' + first;
                fs.stat(database + '/foo', function(err) {

                  assert.notEqual(err, null);
                  // assert.ok(/no such file or directory/.test(err.message));
                  fs.stat(database + '/bar', function(err) {

                    assert.notEqual(err, null);
                    // assert.ok(/no such file or directory/.test(err.message));
                    done();
                  });
                });
              });
            }
          });
        });
    });

    describe('collections', function() {

      it('should build 1 directory (*.json)', function(done) {

        backup({
          uri: URI,
          root: ROOT,
          collections: [ 'logins', 'auths' ],
          parser: 'json',
          callback: function(err) {

            assert.ifError(err);
            setTimeout(function() {

              fs.readdirSync(ROOT).forEach(function(first) { // database

                var database = ROOT + '/' + first;
                assert.equal(fs.statSync(database).isDirectory(), true);
                var second = fs.readdirSync(database);
                assert.equal(second.length, 2);
                assert.equal(second[0], 'auths');
                assert.equal(second[1], 'logins');

                var collection = database + '/' + second[0];
                assert.ok(fs.statSync(collection).isDirectory());
                fs.readdirSync(collection).forEach(function(third) { // document

                  assert.equal(extname(third), '.json');
                  var document = collection + '/' + third;
                  fs.unlinkSync(document);
                });
                fs.rmdirSync(collection);

                var collection = database + '/' + second[1];
                assert.ok(fs.statSync(collection).isDirectory());
                fs.readdirSync(collection).forEach(function(third) { // document

                  assert.equal(extname(third), '.json');
                  var document = collection + '/' + third;
                  fs.unlinkSync(document);
                });
                fs.rmdirSync(collection);

                fs.rmdirSync(database);
              });
              done();
            }, 500);
          }
        });
      });
      it('should build 1 directory (*.bson)', function(done) {

        backup({
          uri: URI,
          root: ROOT,
          collections: [ 'logins', 'auths' ],
          parser: 'bson',
          callback: function(err) {

            assert.ifError(err);
            setTimeout(function() {

              fs.readdirSync(ROOT).forEach(function(first) { // database

                var database = ROOT + '/' + first;
                assert.equal(fs.statSync(database).isDirectory(), true);
                var second = fs.readdirSync(database);
                assert.equal(second.length, 2);
                assert.equal(second[0], 'auths');
                assert.equal(second[1], 'logins');

                var collection = database + '/' + second[0];
                assert.ok(fs.statSync(collection).isDirectory());
                fs.readdirSync(collection).forEach(function(third) { // document

                  assert.equal(extname(third), '.bson');
                  var document = collection + '/' + third;
                  fs.unlinkSync(document);
                });
                fs.rmdirSync(collection);

                var collection = database + '/' + second[1];
                assert.ok(fs.statSync(collection).isDirectory());
                fs.readdirSync(collection).forEach(function(third) { // document

                  assert.equal(extname(third), '.bson');
                  var document = collection + '/' + third;
                  fs.unlinkSync(document);
                });
                fs.rmdirSync(collection);

                fs.rmdirSync(database);
              });
              done();
            }, 500);
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
          callback: function(err) {

            assert.ifError(err);
            setTimeout(function() {

              fs.readdirSync(ROOT).forEach(function(first) { // database

                var database = ROOT + '/' + first;
                assert.equal(fs.statSync(database).isDirectory(), true);
                fs.readdirSync(database).forEach(function(second) { // collection

                  var collection = database + '/' + second;
                  assert.ok(fs.statSync(collection).isDirectory());
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
            }, 500);
          }
        });
      });
      it('should build any directories (*.bson)', function(done) {

        backup({
          uri: URI,
          root: ROOT,
          parser: 'bson',
          callback: function(err) {

            assert.ifError(err);
            setTimeout(function() {

              fs.readdirSync(ROOT).forEach(function(first) { // database

                var database = ROOT + '/' + first;
                assert.equal(fs.statSync(database).isDirectory(), true);
                fs.readdirSync(database).forEach(function(second) { // collection

                  var collection = database + '/' + second;
                  assert.ok(fs.statSync(collection).isDirectory());
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
            }, 500);
          }
        });
      });
    });

    describe('tar', function() {

      var path = ROOT + '/t1.tar';
      it('should check that tar file not exist before test', function(done) {

        assert.equal(fs.existsSync(path), false);
        done();
      });
      it('should make a tar file', function(done) {

        backup({
          uri: URI,
          root: ROOT,
          tar: 't1.tar',
          callback: function(err) {

            assert.ifError(err);
            assert.equal(fs.existsSync(path), true);
            fs.unlink(path, done);
          }
        });
      });
      it('should check that buffer dir not exist', function(done) {

        var paths = __dirname + '/../dump';
        assert.equal(fs.existsSync(paths), true); // stay alive
        assert.equal(fs.readdirSync(paths).length, 0, 'empty dir');
        done();
      });
    });

    describe('logger', function() {

      var l = 'l1.log';
      var date = new Date();
      var dailyF = date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1)
        + '-' + pad(date.getUTCDate()) + '.' + l;
      it('should check that log file not exist before test', function(done) {

        assert.equal(fs.existsSync(l), false);
        assert.equal(fs.existsSync(dailyF), false);
        done();
      });
      it('should make a log file', function(done) {

        backup({
          uri: URI,
          root: ROOT,
          logger: l,
          callback: function(err) {

            assert.ifError(err);
            assert.equal(fs.existsSync(dailyF), true);
            fs.unlink(dailyF, done);
          }
        });
      });
      it('should remove dirs', function(done) {

        fs.readdirSync(ROOT).forEach(function(first) { // database

          var database = ROOT + '/' + first;
          assert.equal(fs.statSync(database).isDirectory(), true);
          fs.readdirSync(database).forEach(function(second) { // collection

            var collection = database + '/' + second;
            assert.ok(fs.statSync(collection).isDirectory());
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

  describe('with parallelCollectionScan', function() {

    describe('errors', function() {

      it('should return error beacause collection does not exist',
        function(done) {

          backup({
            uri: URI,
            root: ROOT,
            collections: [ 'foobar' ],
            numCursors: 2,
            callback: function(err) {

              assert.notEqual(err, null);
              assert.ok(/does not exist/.test(err.message));
              fs.readdirSync(ROOT).forEach(function(first) { // database

                var database = ROOT + '/' + first;
                fs.stat(database + '/foobar', function(err) {

                  assert.notEqual(err, null);
                  // assert.ok(/no such file or directory/.test(err.message));
                  done();
                });
              });
            }
          });
        });
      it('should return error beacause collections does not exist',
        function(done) {

          backup({
            uri: URI,
            root: ROOT,
            collections: [ 'foo', 'bar' ],
            numCursors: 2,
            callback: function(err) {

              assert.notEqual(err, null);
              assert.ok(/does not exist/.test(err.message));
              fs.readdirSync(ROOT).forEach(function(first) { // database

                var database = ROOT + '/' + first;
                fs.stat(database + '/foo', function(err) {

                  assert.notEqual(err, null);
                  // assert.ok(/no such file or directory/.test(err.message));
                  fs.stat(database + '/bar', function(err) {

                    assert.notEqual(err, null);
                    // assert.ok(/no such file or directory/.test(err.message));
                    done();
                  });
                });
              });
            }
          });
        });
    });

    describe('collections', function() {

      it('should build 1 directory (*.json)', function(done) {

        backup({
          uri: URI,
          root: ROOT,
          collections: [ 'logins', 'auths' ],
          parser: 'json',
          numCursors: 2,
          callback: function(err) {

            assert.ifError(err);
            setTimeout(function() {

              fs.readdirSync(ROOT).forEach(function(first) { // database

                var database = ROOT + '/' + first;
                assert.equal(fs.statSync(database).isDirectory(), true);
                var second = fs.readdirSync(database);
                assert.equal(second.length, 2);
                assert.equal(second[0], 'auths');
                assert.equal(second[1], 'logins');

                var collection = database + '/' + second[0];
                assert.ok(fs.statSync(collection).isDirectory());
                fs.readdirSync(collection).forEach(function(third) { // document

                  assert.equal(extname(third), '.json');
                  var document = collection + '/' + third;
                  fs.unlinkSync(document);
                });
                fs.rmdirSync(collection);

                var collection = database + '/' + second[1];
                assert.ok(fs.statSync(collection).isDirectory());
                fs.readdirSync(collection).forEach(function(third) { // document

                  assert.equal(extname(third), '.json');
                  var document = collection + '/' + third;
                  fs.unlinkSync(document);
                });
                fs.rmdirSync(collection);

                fs.rmdirSync(database);
              });
              done();
            }, 500);
          }
        });
      });
      it('should build 1 directory (*.bson)', function(done) {

        backup({
          uri: URI,
          root: ROOT,
          collections: [ 'logins', 'auths' ],
          parser: 'bson',
          numCursors: 2,
          callback: function(err) {

            assert.ifError(err);
            setTimeout(function() {

              fs.readdirSync(ROOT).forEach(function(first) { // database

                var database = ROOT + '/' + first;
                assert.equal(fs.statSync(database).isDirectory(), true);
                var second = fs.readdirSync(database);
                assert.equal(second.length, 2);
                assert.equal(second[0], 'auths');
                assert.equal(second[1], 'logins');

                var collection = database + '/' + second[0];
                assert.ok(fs.statSync(collection).isDirectory());
                fs.readdirSync(collection).forEach(function(third) { // document

                  assert.equal(extname(third), '.bson');
                  var document = collection + '/' + third;
                  fs.unlinkSync(document);
                });
                fs.rmdirSync(collection);

                var collection = database + '/' + second[1];
                assert.ok(fs.statSync(collection).isDirectory());
                fs.readdirSync(collection).forEach(function(third) { // document

                  assert.equal(extname(third), '.bson');
                  var document = collection + '/' + third;
                  fs.unlinkSync(document);
                });
                fs.rmdirSync(collection);

                fs.rmdirSync(database);
              });
              done();
            }, 500);
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
          numCursors: 2,
          callback: function(err) {

            assert.ifError(err);
            setTimeout(function() {

              fs.readdirSync(ROOT).forEach(function(first) { // database

                var database = ROOT + '/' + first;
                assert.equal(fs.statSync(database).isDirectory(), true);
                fs.readdirSync(database).forEach(function(second) { // collection

                  var collection = database + '/' + second;
                  assert.ok(fs.statSync(collection).isDirectory());
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
            }, 500);
          }
        });
      });
      it('should build any directories (*.bson)', function(done) {

        backup({
          uri: URI,
          root: ROOT,
          parser: 'bson',
          numCursors: 2,
          callback: function(err) {

            assert.ifError(err);
            setTimeout(function() {

              fs.readdirSync(ROOT).forEach(function(first) { // database

                var database = ROOT + '/' + first;
                assert.equal(fs.statSync(database).isDirectory(), true);
                fs.readdirSync(database).forEach(function(second) { // collection

                  var collection = database + '/' + second;
                  assert.ok(fs.statSync(collection).isDirectory());
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
            }, 500);
          }
        });
      });
    });

    describe('tar', function() {

      var path = ROOT + '/t2.tar';
      it('should check that tar file not exist before test', function(done) {

        assert.equal(fs.existsSync(path), false);
        done();
      });
      it('should make a tar file', function(done) {

        backup({
          uri: URI,
          root: ROOT,
          tar: 't2.tar',
          numCursors: 2,
          callback: function(err) {

            assert.ifError(err);
            assert.equal(fs.existsSync(path), true);
            fs.unlink(path, done);
          }
        });
      });
      it('should check that buffer dir not exist', function(done) {

        var paths = __dirname + '/../dump';
        assert.equal(fs.existsSync(paths), true); // stay alive
        assert.equal(fs.readdirSync(paths).length, 0, 'empty dir');
        done();
      });
    });

    describe('logger', function() {

      var l = 'l2.log';
      var date = new Date();
      var dailyF = date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1)
        + '-' + pad(date.getUTCDate()) + '.' + l;
      it('should check that log file not exist before test', function(done) {

        assert.equal(fs.existsSync(l), false);
        assert.equal(fs.existsSync(dailyF), false);
        done();
      });
      it('should make a log file', function(done) {

        backup({
          uri: URI,
          root: ROOT,
          logger: l,
          numCursors: 2,
          callback: function(err) {

            assert.ifError(err);
            assert.equal(fs.existsSync(dailyF), true);
            fs.unlink(dailyF, done);
          }
        });
      });
      it('should remove dirs', function(done) {

        fs.readdirSync(ROOT).forEach(function(first) { // database

          var database = ROOT + '/' + first;
          assert.equal(fs.statSync(database).isDirectory(), true);
          fs.readdirSync(database).forEach(function(second) { // collection

            var collection = database + '/' + second;
            assert.ok(fs.statSync(collection).isDirectory());
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
});
