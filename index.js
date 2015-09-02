'use strict';
/**
 * @file mongodb-backup main
 * @module mongodb-backup
 * @subpackage main
 * @version 1.3.0
 * @author hex7c0 <hex7c0@gmail.com>
 * @copyright hex7c0 2014
 * @license GPLv3
 */

/*
 * initialize module
 */
var fs = require('fs');
var BSON;
var logger;
var meta;

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

  return collection.indexes(function(err, indexes) {

    if (err) {
      error(err);
      return next();
    }

    fs.writeFileSync(metadata + collection.collectionName, JSON
        .stringify(indexes), {
      encoding: 'utf8'
    });
    return next();
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

  return fs.stat(path, function(err, stats) {

    if (err && err.code === 'ENOENT') {
      logger('make dir at ' + path);
      return fs.mkdir(path, function(err) {

        return next(err, path);
      });

    } else if (stats && stats.isDirectory() === false) {
      logger('unlink file at ' + path);
      return fs.unlink(path, function() {

        logger('make dir at ' + path);
        return fs.mkdir(path, function(err) {

          return next(err, path);
        });
      });
    }

    return next(null, path);
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

  return fs.readdirSync(path).forEach(function(first) { // database

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
        fs.unlinkSync(document);
        return next ? next(null, document) : '';
      });

      if (metadata !== '') {
        fs.unlinkSync(metadata + second);
      }
      return fs.rmdirSync(collection);
    });

    if (metadata !== '') {
      fs.rmdirSync(metadata);
    }
    return fs.rmdirSync(database);
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
    return next();
  }

  return docs.forEach(function(doc) {

    // no async. EMFILE error
    fs.writeFileSync(collectionPath + doc._id + '.json', JSON.stringify(doc), {
      encoding: 'utf8'
    });
    return last === ++index ? next() : null;
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
    return next();
  }

  return docs.forEach(function(doc) {

    // no async. EMFILE error
    fs.writeFileSync(collectionPath + doc._id + '.bson', BSON.serialize(doc), {
      encoding: null
    });
    return last === ++index ? next() : null;
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

    if (err) {
      return error(err);
    }
    var last = collections.length, index = 0;
    if (last < 1) {
      return next(null);
    }

    return collections.forEach(function(collection) {

      if (/^system./.test(collection.collectionName) === true) {
        return last === ++index ? next(null) : null;
      }
      logger('select collection ' + collection.collectionName);
      return makeDir(name + collection.collectionName + '/',
        function(err, name) {

          return meta(collection, metadata, function() {

            return collection.find(query).toArray(function(err, docs) {

              if (err) {
                return last === ++index ? next(err) : error(err);
              }
              return parser(docs, name, function(err) {

                if (err) {
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

  return collections.forEach(function(collection) {

    return db.collection(collection, function(err, collection) {

      logger('select collection ' + collection.collectionName);
      if (err) {
        return last === ++index ? next(err) : error(err);
      }
      return makeDir(name + collection.collectionName + '/',
        function(err, name) {

          return meta(collection, metadata, function() {

            return collection.find(query).toArray(function(err, docs) {

              if (err) {
                return last === ++index ? next(err) : error(err);
              }
              return parser(docs, name, function(err) {

                if (err) {
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
        BSON = require('bson');
        BSON = new BSON.BSONPure.BSON();
        parser = toBson;
        break;
      case 'json':
        // JSON error on ObjectId and Date
        parser = toJson;
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
        logger: '_mongo_b' + my.logger,
        level: 'info',
        json: false
      }
    });
    logger('backup start');
    var log = require('mongodb').Logger;
    log.setLevel('info');
    log.setCurrentLogger(function(msg) {

      return logger(msg);
    });
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
    return;
  }

  return require('mongodb').MongoClient.connect(my.uri, my.options,
    function(err, db) {

      logger('db open');
      if (err) {
        return error(err);
      }

      var root = my.tar === null ? my.root : my.dir;
      makeDir(root, function(err, name) {

        makeDir(name + db.databaseName + '/', function(err, name) {

          function go() {

            // waiting for `db.fsyncLock()` on node driver
            return discriminator(db, name, my.query, metadata, parser,
              function(err) {

                if (err) {
                  error(err);
                }
                logger('db close');
                db.close();

                if (my.tar) {
                  return makeDir(my.root, function(err, name) {

                    if (err) {
                      error(err);
                    }
                    var dest;
                    if (my.stream) { // user stream
                      logger('send tar file to stream');
                      dest = my.stream;
                    } else { // filesystem stream
                      logger('make tar file at ' + name + my.tar);
                      dest = fs.createWriteStream(name + my.tar);
                    }

                    var packer = require('tar').Pack().on('error', error).on(
                      'end', function() {

                        rmDir(root);
                        return callback();
                      });

                    return require('fstream').Reader({
                      path: root + db.databaseName,
                      type: 'Directory'
                    }).on('error', error).pipe(packer).pipe(dest);
                  });
                }

                return callback();
              }, my.collections);
          }

          if (my.metadata === false) {
            go();
          } else {
            metadata = name + '.metadata/';
            makeDir(metadata, go);
          }
          return;
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

  var resolve = require('path').resolve;

  var opt = options || Object.create(null);
  if (!opt.uri) {
    throw new Error('missing uri option');
  }
  if (!opt.stream) {
    if (!opt.root) {
      throw new Error('missing root option');
    } else if (fs.existsSync(opt.root) && !fs.statSync(opt.root).isDirectory()) {
      throw new Error('root option is not a directory');
    }
  }

  var my = {
    dir: __dirname + '/dump/',
    uri: String(opt.uri),
    root: resolve(String(opt.root || '')) + '/',
    stream: opt.stream || null,
    parser: opt.parser || 'bson',
    collections: Array.isArray(opt.collections) ? opt.collections : null,
    callback: typeof (opt.callback) == 'function' ? opt.callback : null,
    tar: typeof opt.tar === 'string' ? opt.tar : null,
    query: typeof opt.query === 'object' ? opt.query : {},
    logger: typeof opt.logger === 'string' ? resolve(opt.logger) : null,
    options: typeof opt.options === 'object' ? opt.options : {},
    metadata: Boolean(opt.metadata)
  };
  if (my.stream) {
    my.tar = true; // override
  }
  return wrapper(my);
}
module.exports = backup;
