'use strict';
/**
 * @file issue #10 test
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
var mongodb = require('mongodb');
var BSON = require('bson');

var MongoClient = mongodb.MongoClient;
var MLong = mongodb.Long;
var BLong = BSON.Long;
var Uri = process.env.URI;
var Root = __dirname + '/dump';
var Collection = 'test_10';

/*
 * test module
 */
describe('issue10', function () {

  var NInt64, SInt64, NLong, SLong;

  describe('create new collection', function () {

    it('should create long number', function (done) {

      var long1 = MLong.fromNumber(100);
      var long2 = BLong.fromNumber(100);
      assert.deepEqual(long1, long2);
      var long1 = MLong.fromString('100');
      var long2 = BLong.fromString('100');
      assert.deepEqual(long1, long2);

      NInt64 = 1000576093407275579;
      SInt64 = '1000576093407275579';
      NLong = MLong.fromNumber(NInt64);
      SLong = MLong.fromString(SInt64);

      done();
    });
    it('should create "' + Collection + '" collection', function (done) {

      MongoClient.connect(Uri, function (err, client) {
        var db = client.db('test');

        assert.ifError(err);
        db.createCollection(Collection, function (err, collection) {

          assert.ifError(err);
          collection.deleteMany({}, function (err, result) { // remove previous data

            assert.ifError(err);
            collection.insertMany([{
              _id: 'nint64',
              d: NInt64,
              t: 'foo1'
            }, {
              _id: 'sint64',
              d: SInt64,
              t: 'foo2'
            }, {
              _id: 'nlong',
              d: NLong,
              t: 'foo3'
            }, {
              _id: 'slong',
              d: SLong,
              t: 'foo4'
            }], function (err, result) {
              console.log(result);
              assert.ifError(err);
              assert.equal(result.acknowledged, true);
              assert.equal(result.insertedCount, 4);
              client.close();
              done();
            });
          });
        });
      });
    });
  });

  describe('backup', function () {

    it('should build 1 directory and 4 files', function (done) {

      backup({
        uri: Uri,
        dbName: 'backup-tests',
        root: Root,
        collections: [Collection],
        callback: function (err) {

          assert.ifError(err);
          setTimeout(done, 500);
        }
      });
    });
  });

  describe('deserialize', function () {

    var database, collection;
    var nint64_file, nlong_file, sint64_file, slong_file;

    it('should find 2 files', function (done) {

      var first = fs.readdirSync(Root);
      assert.equal(first.length, 1, 'database');

      database = Root + '/' + first[0];
      assert.equal(fs.statSync(database).isDirectory(), true);

      var second = fs.readdirSync(database);
      assert.equal(second.length, 1, 'collection');
      assert.equal(second[0], Collection);

      collection = database + '/' + second[0];
      assert.equal(fs.statSync(collection).isDirectory(), true);

      var docs = fs.readdirSync(collection);
      assert.equal(docs.length, 4);
      nint64_file = collection + '/' + docs[0];
      nlong_file = collection + '/' + docs[1];
      sint64_file = collection + '/' + docs[2];
      slong_file = collection + '/' + docs[3];

      docs.forEach(function (file) {

        var p = collection + '/' + file;
        assert.equal(fs.statSync(p).isFile(), true);
        assert.equal(extname(p), '.bson');
      });

      done();
    });
    it('should deserialize nint64 file', function (done) {

      var data = BSON.deserialize(fs.readFileSync(nint64_file));
      assert.strictEqual(data._id, 'nint64');
      assert.deepEqual(data.d, NInt64);
      assert.strictEqual(data.t, 'foo1');
      fs.unlink(nint64_file, done);
    });
    it('should deserialize sint64 file', function (done) {

      var data = BSON.deserialize(fs.readFileSync(sint64_file));
      assert.strictEqual(data._id, 'sint64');
      assert.deepEqual(data.d, SInt64);
      assert.strictEqual(data.t, 'foo2');
      fs.unlink(sint64_file, done);
    });
    it('should deserialize nlong file', function (done) {

      var data = BSON.deserialize(fs.readFileSync(nlong_file));
      assert.strictEqual(data._id, 'nlong');
      assert.deepEqual(data.d, NLong);
      assert.strictEqual(data.t, 'foo3');
      fs.unlink(nlong_file, done);
    });
    it('should deserialize slong file', function (done) {

      var data = BSON.deserialize(fs.readFileSync(slong_file));
      assert.strictEqual(data._id, 'slong');
      assert.deepEqual(data.d, SLong);
      assert.strictEqual(data.t, 'foo4');
      fs.unlink(slong_file, done);
    });
    it('should remove dirs', function (done) {

      fs.rmdirSync(collection);
      fs.rmdirSync(database);
      done();
    });
  });

});
