'use strict';
/**
 * @file stream test
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
var request = require('supertest');
var fs = require('fs');
var http = require('http');
var URI = process.env.URI;

/*
 * test module
 */
describe('stream', function() {

  var ROOT = __dirname + '/dump';

  describe('tar', function() {

    var app;
    var path0 = ROOT + '/from_web.tar';
    var path1 = ROOT + '/from_file.tar';

    describe('web', function() {

      it('should check that tar file not exist before test', function(done) {

        assert.equal(fs.existsSync(path0), false);
        done();
      });
      it('should create a web application', function(done) {

        app = http.createServer(function(req, res) {

          res.writeHead(200, {
            'Content-Type': 'application/x-tar'
          });

          backup({
            collections: [ 'logins', 'auths', 'wrong_name' ],
            uri: URI,
            stream: res
          });

        });
        done();
      });
      it('should send a request to web and write a tar file', function(done) {

        request(app).get('/').expect('Content-Type', /tar/).expect(200).end(
          function(err, res) {

            assert.ifError(err);
            fs.writeFile(path0, res.text, done);
          });
      });
      it('should check that buffer dir not exist', function(done) {

        var paths = __dirname + '/../dump';
        assert.equal(fs.existsSync(paths), true);
        assert.equal(fs.readdirSync(paths).length, 0, 'empty dir');
        done();
      });
    });

    describe('file', function() {

      it('should check that tar file not exist before test', function(done) {

        assert.equal(fs.existsSync(path1), false);
        done();
      });
      it('should make a tar file', function(done) {

        backup({
          collections: [ 'logins', 'auths', 'wrong_name' ],
          uri: URI,
          root: ROOT,
          tar: 'from_file.tar',
          callback: function(err) {

            assert.ifError(err);
            assert.equal(fs.existsSync(path1), true);
            done();
          }
        });
      });
      it('should check that buffer dir not exist', function(done) {

        var paths = __dirname + '/../dump';
        assert.equal(fs.existsSync(paths), true);
        assert.equal(fs.readdirSync(paths).length, 0, 'empty dir');
        done();
      });
    });

    describe('end', function() {

      it('should delete this 2 files', function(done) {

        fs.unlinkSync(path0);
        fs.unlinkSync(path1);
        done();
      });
    });
  });
});
