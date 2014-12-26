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
 */
function writeMetadata(collection, metadata) {

  collection.indexes(function(err, index) {

    if (err !== null) {
      return error(err);
    }
    fs.writeFileSync(metadata + collection.collectionName, JSON
        .stringify(index), {
      encoding: 'utf8'
    });
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
 * @param {String} name - path of file
 * @param {Function} next - callback
 */
function toJson(docs, name, next) {

  var last = docs.length - 1;
  if (last < 0) {
    return next(null);
  }
  docs.forEach(function(doc, index) {

    // no async. EMFILE error
    fs.writeFileSync(name + doc._id + '.json', JSON.stringify(doc), {
      encoding: 'utf8'
    });
    return last === index ? next(null) : null;
  });
}

/**
 * BSON parser
 * 
 * @function toBson
 * @param {Array} docs - documents from query
 * @param {String} name - path of file
 * @param {Function} next - callback
 */
function toBson(docs, name, next) {

  var last = docs.length - 1;
  if (last < 0) {
    return next(null);
  }
  docs.forEach(function(doc, index) {

    // no async. EMFILE error
    fs.writeFileSync(name + doc._id + '.bson', BSON.serialize(doc), {
      encoding: null
    });
    return last === index ? next(null) : null;
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
    var last = collections.length - 1;
    if (last < 0) {
      return next(null);
    }
    collections.forEach(function(collection, index) {

      if (/^system./.test(collection.collectionName) === true) {
        return last === index ? next(null) : null;
      }
      logger('select collection ' + collection.collectionName);
      makeDir(name + collection.collectionName + '/', function(err, name) {

        meta(collection, metadata);
        collection.find(query).toArray(function(err, docs) {

          if (err !== null) {
            return last === index ? next(err) : error(err);
          }
          parser(docs, name, function(err) {

            if (err !== null) {
              return last === index ? next(err) : error(err);
            }
            return last === index ? next(null) : null;
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

  var last = collections.length - 1;
  if (last < 0) {
    return next(null);
  }
  collections.forEach(function(collection, index) {

    db.collection(collection, function(err, collection) {

      logger('select collection ' + collection.collectionName);
      if (err !== null) {
        return error(err);
      }
      makeDir(name + collection.collectionName + '/', function(err, name) {

        meta(collection, metadata);
        collection.find(query).toArray(function(err, docs) {

          if (err !== null) {
            return last === index ? next(err) : error(err);
          }
          parser(docs, name, function(err) {

            if (err !== null) {
              return last === index ? next(err) : error(err);
            }
            return last === index ? next(null) : null;
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
      BSON = mongo.pure().BSON;
      parser = toBson;
      break;
    case 'json':
      // JSON error on ObjectId and Date
      parser = toJson;
      break;
    default:
      throw new Error('missing parser option');
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
    meta = function() {

      return;
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
  }
  var my = {
    dir: __dirname + '/dump/',
    uri: String(opt.uri),
    root: resolve(String(opt.root)) + '/',
    parser: String(opt.parser || 'bson'),
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
