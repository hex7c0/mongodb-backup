'use strict';
/**
 * @file mongodb-backup main
 * @module mongodb-backup
 * @subpackage main
 * @version 1.6.0
 * @author hex7c0 <hex7c0@gmail.com>
 * @copyright hex7c0 2014
 * @license GPLv3
 */

/*
 * initialize module
 */
var systemRegex = /^system\./;
var fs = require('graceful-fs');
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
      return next(err);
    }

    fs.writeFile(metadata + collection.collectionName, JSON.stringify(indexes),
      next);
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

    if (err && err.code === 'ENOENT') { // no file or dir
      logger('make dir at ' + path);
      return fs.mkdir(path, function(err) {

        next(err, path);
      });

    } else if (stats && stats.isDirectory() === false) { // path is a file
      logger('unlink file at ' + path);
      return fs.unlink(path, function(err) {

        if (err) { // unlink fail. permission maybe
          return next(err);
        }

        logger('make dir at ' + path);
        fs.mkdir(path, function(err) {

          next(err, path);
        });
      });

    } else { // already a dir
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
      return next(Error('path is not a Directory'));
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
      fs.rmdirSync(collection);
    });

    if (metadata !== '') {
      fs.rmdirSync(metadata);
    }
    return fs.rmdirSync(database);
  });
}

/**
 * JSON parser async
 * 
 * @function toJson
 * @param {Objecy} doc - document from stream
 * @param {String} collectionPath - path of collection
 */
function toJsonAsync(doc, collectionPath) {

  fs.writeFile(collectionPath + doc._id + '.json', JSON.stringify(doc));
}

/**
 * BSON parser async
 * 
 * @function toBson
 * @param {Objecy} doc - document from stream
 * @param {String} collectionPath - path of collection
 */
function toBsonAsync(doc, collectionPath) {

  fs.writeFile(collectionPath + doc._id + '.bson', BSON.serialize(doc));
}

/**
 * get data from all available collections
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

  return db.collections(function(err, collections) {

    if (err) {
      return next(err);
    }

    var last = ~~collections.length, index = 0;
    if (last === 0) { // empty set
      return next(err);
    }

    collections.forEach(function(collection) {

      if (systemRegex.test(collection.collectionName) === true) {
        return last === ++index ? next(null) : null;
      }

      logger('select collection ' + collection.collectionName);
      makeDir(name + collection.collectionName + '/', function(err, name) {

        if (err) {
          return last === ++index ? next(err) : error(err);
        }

        meta(collection, metadata, function() {

          var stream = collection.find(query).snapshot(true).stream();

          stream.once('end', function() {

            return last === ++index ? next(null) : null;
          }).on('data', function(doc) {

            parser(doc, name);
          });
        });
      });
    });
  });
}

/**
 * get data from all available collections without query (parallelCollectionScan)
 * 
 * @function allCollectionsScan
 * @param {Object} db - database
 * @param {String} name - path of dir
 * @param {Integer} numCursors - number of multiple cursors [1:10000]
 * @param {String} metadata - path of metadata
 * @param {Function} parser - data parser
 * @param {Function} next - callback
 */
function allCollectionsScan(db, name, numCursors, metadata, parser, next) {

  return db.collections(function(err, collections) {

    if (err) {
      return next(err);
    }

    var last = ~~collections.length, index = 0;
    if (last === 0) { // empty set
      return next(null);
    }

    collections.forEach(function(collection) {

      if (systemRegex.test(collection.collectionName) === true) {
        return last === ++index ? next(null) : null;
      }

      logger('select collection scan ' + collection.collectionName);
      makeDir(name + collection.collectionName + '/', function(err, name) {

        if (err) {
          return last === ++index ? next(err) : error(err);
        }

        meta(collection, metadata, function() {

          collection.parallelCollectionScan({
            numCursors: numCursors
          }, function(err, cursors) {

            if (err) {
              return last === ++index ? next(err) : error(err);
            }

            var ii, cursorsDone;
            ii = cursorsDone = ~~cursors.length;
            if (ii === 0) { // empty set
              return last === ++index ? next(null) : null;
            }

            for (var i = 0; i < ii; ++i) {
              cursors[i].once('end', function() {

                // No more cursors let's ensure we got all results
                if (--cursorsDone === 0) {
                  return last === ++index ? next(null) : null;
                }
              }).on('data', function(doc) {

                parser(doc, name);
              });
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
 * @param {Object} query - find query
 * @param {String} metadata - path of metadata
 * @param {Function} parser - data parser
 * @param {Function} next - callback
 * @param {Array} collections - selected collections
 */
function someCollections(db, name, query, metadata, parser, next, collections) {

  var last = ~~collections.length, index = 0;
  if (last === 0) {
    return next(null);
  }

  collections.forEach(function(collection) {

    db.collection(collection, {
      strict: true
    }, function(err, collection) {

      if (err) { // returns an error if the collection does not exist
        return last === ++index ? next(err) : error(err);
      }

      logger('select collection ' + collection.collectionName);
      makeDir(name + collection.collectionName + '/', function(err, name) {

        if (err) {
          return last === ++index ? next(err) : error(err);
        }

        meta(collection, metadata, function() {

          var stream = collection.find(query).snapshot(true).stream();

          stream.once('end', function() {

            return last === ++index ? next(null) : null;
          }).on('data', function(doc) {

            parser(doc, name);
          });
        });
      });
    });
  });
}

/**
 * get data from some collections without query (parallelCollectionScan)
 * 
 * @function someCollectionsScan
 * @param {Object} db - database
 * @param {String} name - path of dir
 * @param {Integer} numCursors - number of multiple cursors [1:10000]
 * @param {String} metadata - path of metadata
 * @param {Function} parser - data parser
 * @param {Function} next - callback
 * @param {Array} collections - selected collections
 */
function someCollectionsScan(db, name, numCursors, metadata, parser, next,
                             collections) {

  var last = ~~collections.length, index = 0;
  if (last === 0) { // empty set
    return next(null);
  }

  collections.forEach(function(collection) {

    db.collection(collection, {
      strict: true
    }, function(err, collection) {

      if (err) { // returns an error if the collection does not exist
        return last === ++index ? next(err) : error(err);
      }

      logger('select collection scan ' + collection.collectionName);
      makeDir(name + collection.collectionName + '/', function(err, name) {

        if (err) {
          return last === ++index ? next(err) : error(err);
        }

        meta(collection, metadata, function() {

          collection.parallelCollectionScan({
            numCursors: numCursors
          }, function(err, cursors) {

            if (err) {
              return last === ++index ? next(err) : error(err);
            }

            var ii, cursorsDone;
            ii = cursorsDone = ~~cursors.length;
            if (ii === 0) { // empty set
              return last === ++index ? next(null) : null;
            }

            for (var i = 0; i < ii; ++i) {
              cursors[i].once('end', function() {

                // No more cursors let's ensure we got all results
                if (--cursorsDone === 0) {
                  return last === ++index ? next(null) : null;
                }
              }).on('data', function(doc) {

                parser(doc, name);
              });
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
  if (typeof my.parser === 'function') {
    parser = my.parser;
  } else {
    switch (my.parser) {
      case 'bson':
        BSON = require('bson');
        BSON = new BSON.BSONPure.BSON();
        parser = toBsonAsync;
        break;
      case 'json':
        // JSON error on ObjectId, Date and Long
        parser = toJsonAsync;
        break;
      default:
        throw new Error('missing parser option');
    }
  }

  var discriminator = allCollections;
  if (my.collections !== null) {
    discriminator = someCollections;
    if (my.numCursors) {
      discriminator = someCollectionsScan;
      my.query = my.numCursors; // override
    }
  } else if (my.numCursors) {
    discriminator = allCollectionsScan;
    my.query = my.numCursors; // override
  }

  if (my.logger === null) {
    logger = function() {

      return;
    };
  } else {
    logger = require('logger-request')({
      filename: my.logger,
      standalone: true,
      daily: true,
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

  /**
   * latest callback
   * 
   * @return {Null}
   */
  function callback(err) {

    logger('backup stop');
    if (my.callback !== null) {
      logger('callback run');
      my.callback(err);

    } else if (err) {
      logger(err);
    }
  }

  require('mongodb').MongoClient.connect(my.uri, my.options, function(err, db) {

    logger('db open');
    if (err) {
      return callback(err);
    }

    var root = my.tar === null ? my.root : my.dir;
    makeDir(root, function(err, name) {

      if (err) {
        return callback(err);
      }

      makeDir(name + db.databaseName + '/', function(err, name) {

        function go() {

          // waiting for `db.fsyncLock()` on node driver
          return discriminator(db, name, my.query, metadata, parser,
            function(err) {

              logger('db close');
              db.close();
              if (err) {
                return callback(err);
              }

              if (my.tar) {
                makeDir(my.root, function(e, name) {

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

                  var packer = require('tar').Pack().on('error', callback).on(
                    'end', function() {

                      rmDir(root);
                      callback(null);
                    });

                  require('fstream').Reader({
                    path: root + db.databaseName,
                    type: 'Directory'
                  }).on('error', callback).pipe(packer).pipe(dest);
                });

              } else {
                callback(null);
              }
            }, my.collections);
        }

        if (err) {
          return callback(err);
        }

        if (my.metadata === false) {
          go();
        } else {
          metadata = name + '.metadata/';
          makeDir(metadata, go);
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
    numCursors: ~~opt.numCursors,
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
