'use strict';
/**
 * @file mongodb-backup main
 * @module mongodb-backup
 * @package mongodb-backup
 * @subpackage main
 * @version 0.0.0
 * @author hex7c0 <hex7c0@gmail.com>
 * @copyright hex7c0 2014
 * @license GPLv3
 */

/*
 * initialize module
 */
// import
try {
  // node
  var fs = require('fs');
  var resolve = require('path').resolve;
  // module
  var client = require('mongodb').MongoClient;
  var BSON;
} catch (MODULE_NOT_FOUND) {
  console.error(MODULE_NOT_FOUND);
  process.exit(1);
}

/*
 * functions
 */
/**
 * error handler
 * 
 * @todo write logger
 * @function error
 * @param {Object} err - raised error
 */
function error(err) {

  return err;
}

/**
 * make dir
 * 
 * @function makeDir
 * @param {String} path - path of dir
 * @param {Function} next - callback
 */
function makeDir(path, next) {

  fs.stat(path, function(err, stats) {

    if (err !== null && err.code === 'ENOENT') {
      fs.mkdir(path, next(null, path));
    } else if (stats !== undefined && stats.isDirectory() === false) {
      fs.unlink(path, function() {

        fs.mkdir(path, next(error(new Error('path was a file')), path));
      });
    } else {
      next(null, path);
    }
  });
}

/**
 * JSON parser
 * 
 * @function toJson
 * @param {String} name - path of file
 * @param {Array} docs - documents from query
 * @param {Function} next - callback
 */
function toJson(name, docs, next) {

  var last = docs.length - 1;
  docs.forEach(function(doc, index) {

    // no async. EMFILE error
    if (doc._id !== undefined) {
      fs.writeFileSync(name + doc._id + '.json', JSON.stringify(doc), {
        encoding: 'utf8'
      });
    }
    if (last === index) {
      next();
    }
  });
}

/**
 * BSON parser
 * 
 * @function toBson
 * @param {String} name - path of file
 * @param {Array} docs - documents from query
 * @param {Function} next - callback
 */
function toBson(name, docs, next) {

  var last = docs.length - 1;
  docs.forEach(function(doc, index) {

    // no async. EMFILE error
    if (doc._id !== undefined) {
      fs.writeFileSync(name + doc._id + '.bson', BSON.serialize(doc), {
        encoding: null
      });
    }
    if (last === index) {
      next();
    }
  });
}

/**
 * get data from all collections available
 * 
 * @function allCollections
 * @param {Object} db - database
 * @param {String} name - path of dir
 * @param {Function} parser - data parser
 * @param {Function} next - callback
 */
function allCollections(db, name, parser, next) {

  db.collections(function(err, collections) {

    if (err !== null) {
      return error(err);
    }
    var last = collections.length - 1;
    collections.forEach(function(collection, index) {

      makeDir(name + collection.collectionName + '/', function(err, name) {

        collection.find().toArray(function(err, docs) {

          if (err !== null) {
            return error(err);
          }
          parser(name, docs, function() {

            if (last === index) {
              next();
            }
          });
        });
      });
    });
  });
}

/**
 * get data from some collections
 * 
 * @function someCollections
 * @param {Object} db - database
 * @param {String} name - path of dir
 * @param {Function} parser - data parser
 * @param {Function} next - callback
 * @param {Array} collections - selected collections
 */
function someCollections(db, name, parser, next, collections) {

  var last = collections.length - 1;
  collections.forEach(function(collection, index) {

    db.collection(collection, function(err, collection) {

      if (err !== null) {
        return error(err);
      }
      makeDir(name + collection.collectionName + '/', function(err, name) {

        collection.find().toArray(function(err, docs) {

          if (err !== null) {
            return error(err);
          }
          parser(name, docs, function() {

            if (last === index) {
              next();
            }
          });
        });
      });
    });
  });
}

/**
 * function wrapper
 * 
 * @function wrapper
 * @param {Object} my - parsed options
 */
function wrapper(my) {

  var parser;
  switch (my.parser) {
    case 'bson':
      BSON = require('bson').BSONPure.BSON;
      parser = toBson;
      break;
    case 'json':
      // JSON error on id and Date
      parser = toJson;
      break;
    default:
      throw new Error('missing parser option');
  }
  var discriminator = allCollections;
  if (my.collections !== null) {
    discriminator = someCollections;
  }

  client.connect(my.uri, function(err, db) {

    if (err !== null) {
      return error(err);
    }
    var root = my.tar === null ? my.root : my.dir;
    makeDir(root, function(err, name) {

      // waiting for `db.fsyncLock()` on node driver
      makeDir(name + db.databaseName + '/', function(err, name) {

        discriminator(db, name, parser, function() {

          db.close();
          if (my.tar !== null) {
            var dest = fs.createWriteStream(my.tar);
            var packer = require('tar').Pack().on('error', error);
            require('fstream').Reader({
              path: root,
              type: 'Directory'
            }).on('error', error).pipe(packer).pipe(dest);
            require('rmdir')(root, function() {

              return;
            });
          }
          if (my.callback !== null) {
            my.callback();
          }
        }, my.collections);
      });
    });
  });
}

/**
 * option setting
 * 
 * @exports backup
 * @function backup
 * @param {Object} options - various options. Check README.md
 */
function backup(options) {

  var opt = options || Object.create(null);
  if (!opt.uri) {
    throw new Error('missing uri option');
  } else if (!opt.root) {
    throw new Error('missing root option');
  }
  var my = {
    dir: __dirname + '/dump/',
    uri: String(opt.uri),
    root: resolve(String(opt.root)) + '/',
    parser: String(opt.parser || 'bson'),
    collections: Array.isArray(opt.collections) ? opt.collections : null,
    callback: typeof (opt.callback) == 'function' ? opt.callback : null,
    tar: typeof opt.tar === 'string' ? opt.tar : null
  };
  return wrapper(my);
}
module.exports = backup;
