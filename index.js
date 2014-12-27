'use strict';
/**
 * @file mongodb-backup main
 * @module mongodb-backup
 * @package mongodb-backup
 * @subpackage main
 * @version 0.1.0
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
  var mongo = require('mongodb');
  var client = mongo.MongoClient;
  var BSON;
  var logger;
  var meta;
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
 * @function error
 * @param {Object} err - raised error
 */
function error(err) {

  return logger(err.message);
}

/**
 * save collection metadata to file
 * 
 * @function writeMetadata
 * @param {Object} collection - db collection
 * @param {String} metadata - path of metadata
 * @param {Function} next - callback
 */
function writeMetadata(collection, metadata, next) {

  collection.indexes(function(err, indexes) {

    if (err !== null) {
      error(err);
      return next();
    }
    fs.writeFileSync(metadata + collection.collectionName, JSON
        .stringify(indexes), {
      encoding: 'utf8'
    });
    next();
  });
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
      logger('make dir at ' + path);
      fs.mkdir(path, next(null, path));
    } else if (stats !== undefined && stats.isDirectory() === false) {
      logger('make dir at ' + path);
      fs.unlink(path, function() {

        fs.mkdir(path, next(error(new Error('path was a file')), path));
      });
    } else {
      next(null, path);
    }
  });
}

/**
 * remove dir
 * 
 * @function rmDir
 * @param {String} path - path of dir
 * @param {Function} [next] - callback
 */
function rmDir(path, next) {

  fs.readdirSync(path).forEach(function(first) { // database

    var database = path + first;
    if (fs.statSync(database).isDirectory() === false) {
      return;
    }
    var metadata = '';
    var collections = fs.readdirSync(database);
    if (fs.existsSync(database + '/.metadata') === true) {
      metadata = database + '/.metadata/';
      delete collections[collections.indexOf('.metadata')]; // undefined is not a dir
    }
    collections.forEach(function(second) { // collection

      var collection = database + '/' + second;
      if (fs.statSync(collection).isDirectory() === false) {
        return;
      }
      fs.readdirSync(collection).forEach(function(third) { // document

        var document = collection + '/' + third;
        if (next !== undefined) {
          next(null, document);
        }
        fs.unlinkSync(document);
      });
      if (metadata !== '') {
        fs.unlinkSync(metadata + second);
      }
      fs.rmdirSync(collection);
    });
    if (metadata !== '') {
      fs.rmdirSync(metadata);
    }
    fs.rmdirSync(database);
  });
}

/**
 * JSON parser
 * 
 * @function toJson
 * @param {Array} docs - documents from query
 * @param {String} collectionPath - path of collection
 * @param {Function} next - callback
 */
function toJson(docs, collectionPath, next) {

  var last = docs.length, index = 0;
  if (last < 1) {
    return next(null);
  }
  docs.forEach(function(doc) {

    // no async. EMFILE error
    fs.writeFileSync(collectionPath + doc._id + '.json', JSON.stringify(doc), {
      encoding: 'utf8'
    });
    return last === ++index ? next(null) : null;
  });
}

/**
 * BSON parser
 * 
 * @function toBson
 * @param {Array} docs - documents from query
 * @param {String} collectionPath - path of collection
 * @param {Function} next - callback
 */
function toBson(docs, collectionPath, next) {

  var last = docs.length, index = 0;
  if (last < 1) {
    return next(null);
  }
  docs.forEach(function(doc) {

    // no async. EMFILE error
    fs.writeFileSync(collectionPath + doc._id + '.bson', BSON.serialize(doc), {
      encoding: null
    });
    return last === ++index ? next(null) : null;
  });
}

/**
 * get data from all collections available
 * 
 * @function allCollections
 * @param {Object} db - database
 * @param {String} name - path of dir
 * @param {Object} query - find query
 * @param {String} metadata - path of metadata
 * @param {Function} parser - data parser
 * @param {Function} next - callback
 */
function allCollections(db, name, query, metadata, parser, next) {

  db.collections(function(err, collections) {

    if (err !== null) {
      return error(err);
    }
    var last = collections.length, index = 0;
    if (last < 1) {
      return next(null);
    }
    collections.forEach(function(collection) {

      if (/^system./.test(collection.collectionName) === true) {
        return last === ++index ? next(null) : null;
      }
      logger('select collection ' + collection.collectionName);
      makeDir(name + collection.collectionName + '/', function(err, name) {

        meta(collection, metadata, function() {

          collection.find(query).toArray(function(err, docs) {

            if (err !== null) {
              return last === ++index ? next(err) : error(err);
            }
            parser(docs, name, function(err) {

              if (err !== null) {
                return last === ++index ? next(err) : error(err);
              }
              return last === ++index ? next(null) : null;
            });
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
 * @param {Object} query - find query
 * @param {String} metadata - path of metadata
 * @param {Function} parser - data parser
 * @param {Function} next - callback
 * @param {Array} collections - selected collections
 */
function someCollections(db, name, query, metadata, parser, next, collections) {

  var last = collections.length, index = 0;
  if (last < 1) {
    return next(null);
  }
  collections.forEach(function(collection) {

    db.collection(collection, function(err, collection) {

      logger('select collection ' + collection.collectionName);
      if (err !== null) {
        return last === ++index ? next(err) : error(err);
      }
      makeDir(name + collection.collectionName + '/', function(err, name) {

        meta(collection, metadata, function() {

          collection.find(query).toArray(function(err, docs) {

            if (err !== null) {
              return last === ++index ? next(err) : error(err);
            }
            parser(docs, name, function(err) {

              if (err !== null) {
                return last === ++index ? next(err) : error(err);
              }
              return last === ++index ? next(null) : null;
            });
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
  if (typeof my.parser === 'function') {
    parser = my.parser;
  } else {
    switch (my.parser) {
      case 'bson':
        BSON = mongo.pure().BSON;
        parser = fromBson;
        break;
      case 'json':
        // JSON error on ObjectId and Date
        parser = fromJson;
        break;
      default:
        throw new Error('missing parser option');
    }
  }

  var discriminator = allCollections;
  if (my.collections !== null) {
    discriminator = someCollections;
  }

  if (my.logger === null) {
    logger = function() {

      return;
    };
  } else {
    logger = require('logger-request')({
      filename: my.logger,
      standalone: true,
      winston: {
        logger: '_mongo_b',
        level: 'info'
      }
    });
    logger('backup start');
  }

  var metadata = '';
  if (my.metadata === true) {
    meta = writeMetadata;
  } else {
    meta = function(a, b, c) {

      return c();
    };
  }

  function callback() {

    logger('backup stop');
    if (my.callback !== null) {
      logger('callback run');
      my.callback();
    }
  }

  client.connect(my.uri, function(err, db) {

    logger('db open');
    if (err !== null) {
      return error(err);
    }
    var root = my.tar === null ? my.root : my.dir;
    makeDir(root, function(err, name) {

      makeDir(name + db.databaseName + '/', function(err, name) {

        var go = function() {

          // waiting for `db.fsyncLock()` on node driver
          discriminator(db, name, my.query, metadata, parser, function() {

            logger('db close');
            db.close();
            if (my.tar !== null) {
              return makeDir(my.root, function(err, name) {

                logger('make tar file at ' + name + my.tar);
                var dest = fs.createWriteStream(name + my.tar);
                var packer = require('tar').Pack().on('error', error)
                    .on('end', function() {

                      rmDir(root);
                      callback();
                    });
                require('fstream').Reader({
                  path: root + db.databaseName,
                  type: 'Directory'
                }).on('error', error).pipe(packer).pipe(dest);
              });
            }
            callback();
          }, my.collections);
        };
        if (my.metadata === false) {
          go();
        } else {
          metadata = name + '.metadata/';
          makeDir(metadata, function() {

            go();
          });
        }
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
  } else if (fs.existsSync(opt.root) && !fs.statSync(opt.root).isDirectory()) {
    throw new Error('root option is not a directory');
  }

  var my = {
    dir: __dirname + '/dump/',
    uri: String(opt.uri),
    root: resolve(String(opt.root)) + '/',
    parser: opt.parser || 'bson',
    collections: Array.isArray(opt.collections) ? opt.collections : null,
    callback: typeof (opt.callback) == 'function' ? opt.callback : null,
    tar: typeof opt.tar === 'string' ? opt.tar : null,
    query: typeof opt.query === 'object' ? opt.query : {},
    logger: typeof opt.logger === 'string' ? resolve(opt.logger) : null,
    metadata: Boolean(opt.metadata)
  };
  return wrapper(my);
}
module.exports = backup;
