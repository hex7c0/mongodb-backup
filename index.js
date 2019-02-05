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
var fs = require('graceful-fs').gracefulify(require('fs-extra'));
var path = require('path');
var BSON;
var logger;
var meta;

var documentStore;

var fileSystemDocumentStore = function(root) {
  var dbDir = root;
  var makeDir = function(pathname, next) {
    fs.stat(pathname, function(err, stats) {

      if (err && err.code === 'ENOENT') { // no file or dir
        logger('make dir at ' + pathname);
        return fs.mkdirp(pathname, function(err) {

          next(err, pathname);
        });

      } else if (stats && stats.isDirectory() === false) { // pathname is a file
        logger('unlink file at ' + pathname);
        return fs.unlink(pathname, function(err) {

          if (err) { // unlink fail. permission maybe
            return next(err);
          }

          logger('make dir at ' + pathname);
          fs.mkdir(pathname, function(err) {

            next(err, pathname);
          });
        });

      } else { // already a dir
        next(null, pathname);
      }
    });
  };
  return {
    addDatabase: function(dbName, next) {
      dbDir = path.join(root, dbName);
      return makeDir(dbDir, next);
    },
    addCollection: function addCollection(relativePath, next) {
      var pathname = path.join(dbDir, relativePath);
      return makeDir(pathname, next);
    },
    store: function store(collectionName, relativePath, content, callback) {
      fs.writeFile(path.join(dbDir, collectionName, relativePath), content, callback);
    },
    close: function() {
    }
  };
};

var streamingDocumentStore = function(root, stream) {
  var tar = require('tar-stream');
  var pack = tar.pack(); // pack is a streams2 stream
  pack.pipe(stream);

  var dbDir = root;
  return {
    addDatabase: function addDatabase(dbName, next) {
      dbDir = path.join(root, dbName);
      pack.entry({name: dbDir, type: 'directory'});
      next();
    },

    addCollection: function addCollection(filename, next) {
      if (filename !== '') {
        pack.entry({name: path.join(dbDir, filename), type: 'directory'});
      }
      next();
    },

    store: function store(collectionName, filename, content, callback) {
      pack.entry({name: path.join(dbDir, collectionName, filename)}, content);
      if (callback) {
        callback();
      }
    },
    close: function close() {
      pack.finalize();
    }
  };
};

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

  if (err) {
    logger(err.message);
  }
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
    documentStore.store('.metadata', collection.collectionName, JSON.stringify(indexes), next);
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

  documentStore.store(collectionPath, doc._id + '.json', JSON.stringify(doc));
}

/**
 * BSON parser async
 *
 * @function toBson
 * @param {Objecy} doc - document from stream
 * @param {String} collectionPath - path of collection
 */
function toBsonAsync(doc, collectionPath) {

  documentStore.store(collectionPath, doc._id + '.bson', BSON.serialize(doc));
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
      documentStore.addCollection(collection.collectionName, function(err) {

        if (err) {
          return last === ++index ? next(err) : error(err);
        }

        meta(collection, metadata, function() {

          var stream = collection.find(query)
            // NOTE: snapshot was deprecated
            // See: http://mongodb.github.io/node-mongodb-native/3.1/api/Cursor.html#snapshot
            // .snapshot(true)
            .stream();

          stream.once('end', function() {

            return last === ++index ? next(null) : null;
          }).on('data', function(doc) {

            parser(doc, collection.collectionName);
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
      documentStore.addCollection(collection.collectionName, function(err) {

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

                parser(doc, collection.collectionName);
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
      documentStore.addCollection(collection.collectionName, function(err) {

        if (err) {
          return last === ++index ? next(err) : error(err);
        }

        meta(collection, metadata, function() {

          var stream = collection.find(query)
            // NOTE: snapshot was deprecated
            // See: http://mongodb.github.io/node-mongodb-native/3.1/api/Cursor.html#snapshot
            // .snapshot(true)
            .stream();

          stream.once('end', function() {

            return last === ++index ? next(null) : null;
          }).on('data', function(doc) {

            parser(doc, collection.collectionName);
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
      documentStore.addCollection(collection.collectionName, function(err) {

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

                parser(doc, collection.collectionName);
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
    switch (my.parser.toLowerCase()) {
      case 'bson':
        BSON = require('bson');
        BSON = new BSON();
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

  require('mongodb').MongoClient.connect(my.uri, my.options).then(function(database) {
    var databaseName = database.s.options.dbName;
    var db = database.db(databaseName);

    logger('db open');

    documentStore.addDatabase(databaseName, function(err, name) {

      function go() {

        // waiting for `db.fsyncLock()` on node driver
        return discriminator(db, name, my.query, metadata, parser,
          function(err) {

            logger('db close');
            database.close();
            if (err) {
              return callback(err);
            }

            documentStore.close();
            callback(null);
          }, my.collections);
      }

      if (err) {
        return callback(err);
      }

      if (my.metadata === false) {
        go();
      } else {
        documentStore.addCollection('.metadata', go);
      }
    });
  }).catch(function (err) {
    return callback(err);
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
  }
  if (!opt.stream) {
    if (!opt.root) {
      throw new Error('missing root option');
    } else if (fs.existsSync(opt.root) && !fs.statSync(opt.root).isDirectory()) {
      throw new Error('root option is not a directory');
    }
  }

  var my = {
    uri: String(opt.uri),
    root: path.resolve(String(opt.root || '')) + path.sep,
    stream: opt.stream || null,
    parser: opt.parser || 'bson',
    numCursors: ~~opt.numCursors,
    collections: Array.isArray(opt.collections) ? opt.collections : null,
    callback: typeof (opt.callback) == 'function' ? opt.callback : null,
    tar: typeof opt.tar === 'string' ? opt.tar : null,
    query: typeof opt.query === 'object' ? opt.query : {},
    logger: typeof opt.logger === 'string' ? path.resolve(opt.logger) : null,
    options: typeof opt.options === 'object' ? opt.options : {},
    metadata: Boolean(opt.metadata)
  };
  if (my.tar && !my.stream) {
    my.stream = fs.createWriteStream(path.join(my.root, my.tar));
  }
  if (my.stream) {
    my.tar = true; // override
    documentStore = streamingDocumentStore(my.root, my.stream);
  } else {
    documentStore = fileSystemDocumentStore(my.root);
  }
  return wrapper(my);
}
module.exports = backup;
