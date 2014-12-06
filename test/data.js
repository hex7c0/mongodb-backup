'use strict';
/**
 * @file data test
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
  var client = require('mongodb').MongoClient;
  var BSON = require('bson').BSONPure.BSON;
  var URI = process.env.URI;
} catch (MODULE_NOT_FOUND) {
  console.error(MODULE_NOT_FOUND);
  process.exit(1);
}

/*
 * test module
 */
describe('data', function() {

  var DOCS = {};
  var ROOT = __dirname + '/dump';
  this.timeout(10000);

  describe('query', function() {

    it('should return data from "logins" collection', function(done) {

      client.connect(URI, function(err, db) {

        db.collection('logins', function(err, collection) {

          collection.find({}).toArray(function(err, docs) {

            assert.equal(docs.length > 0, true, 'not empty collection');
            for (var i = 0, ii = docs.length; i < ii; i++) {
              DOCS[docs[i]._id] = docs[i];
            }
            db.close();
            done();
          });
        });
      });
    });
  });

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
            var docs = fs.readdirSync(collection);
            assert.equal(docs.length, Object.keys(DOCS).length, 'forget?');
            docs.forEach(function(third) { // document

              var document = collection + '/' + third;
              assert.equal(extname(third), '.json');
              var _id = third.split('.json')[0];
              var data = require(document);
              // JSON error on id and Date
              assert.equal(data._id, DOCS[_id]._id);
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
            var docs = fs.readdirSync(collection);
            assert.equal(docs.length, Object.keys(DOCS).length, 'forget?');
            docs.forEach(function(third) { // document

              var document = collection + '/' + third;
              assert.equal(extname(third), '.bson');
              var _id = third.split('.bson')[0];
              var data = BSON.deserialize(fs.readFileSync(document, {
                encoding: null
              }));
              assert.deepEqual(data, DOCS[_id]);
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
});
