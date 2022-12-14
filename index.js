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
var path = require('path');
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
  return collection.indexes(function (err, indexes) {
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
 * @param {String} pathname - pathname of dir
 * @param {Function} next - callback
 */
function makeDir(pathname, next) {

  fs.stat(pathname, function (err, stats) {

    if (err && err.code === 'ENOENT') { // no file or dir
      logger('make dir at ' + pathname);
      return fs.mkdir(pathname, function (err) {

        next(err, pathname);
      });

    } else if (stats && stats.isDirectory() === false) { // pathname is a file
      logger('unlink file at ' + pathname);
      return fs.unlink(pathname, function (err) {

        if (err) { // unlink fail. permission maybe
          return next(err);
        }

        logger('make dir at ' + pathname);
        fs.mkdir(pathname, function (err) {

          next(err, pathname);
        });
      });

    } else { // already a dir
      next(null, pathname);
    }
  });
}

/**
 * remove dir
 * 
 * @function rmDir
 * @param {String} pathname - path of dir
 * @param {Function} [next] - callback
 */
function rmDir(pathname, next) {

  fs.readdirSync(pathname).forEach(function (first) { // database

    var database = pathname + path.sep + first;
    if (fs.statSync(database).isDirectory() === false) {
      return next(Error('path is not a Directory'));
    }

    var metadata = '';
    var collections = fs.readdirSync(database);
    var metadataPath = path.join(database, '.metadata');
    if (fs.existsSync(metadataPath) === true) {
      metadata = metadataPath + path.sep;
      delete collections[collections.indexOf('.metadata')]; // undefined is not a dir
    }

    collections.forEach(function (second) { // collection

      var collection = path.join(database, second);
      if (fs.statSync(collection).isDirectory() === false) {
        return;
      }

      fs.readdirSync(collection).forEach(function (third) { // document

        var document = path.join(collection, third);
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
  return db.collections(function (err, collections) {

    if (err) {
      return next(err);
    }

    var last = ~~collections.length, index = 0;
    if (last === 0) { // empty set
      return next(err);
    }

    collections.forEach(function (collection) {

      if (systemRegex.test(collection.name) === true) {
        return last === ++index ? next(null) : null;
      }

      logger('select collection ' + collection.collectionName);
      makeDir(name + collection.collectionName + path.sep, function (err, name) {

        if (err) {
          return last === ++index ? next(err) : error(err);
        }

        meta(collection, metadata, function () {

          var stream = collection.find(query).stream();

          stream.once('end', function () {

            return last === ++index ? next(null) : null;
          }).on('data', function (doc) {

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

  return db.collections(function (err, collections) {

    if (err) {
      return next(err);
    }

    var last = ~~collections.length, index = 0;
    if (last === 0) { // empty set
      return next(null);
    }

    collections.forEach(function (collection) {

      if (systemRegex.test(collection.name) === true) {
        return last === ++index ? next(null) : null;
      }

      logger('select collection scan ' + collection.name);
      makeDir(name + collection.name + path.sep, function (err, name) {

        if (err) {
          return last === ++index ? next(err) : error(err);
        }

        meta(collection, metadata, function () {

          collection.parallelCollectionScan({
            numCursors: numCursors
          }, function (err, cursors) {

            if (err) {
              return last === ++index ? next(err) : error(err);
            }

            var ii, cursorsDone;
            ii = cursorsDone = ~~cursors.length;
            if (ii === 0) { // empty set
              return last === ++index ? next(null) : null;
            }

            for (var i = 0; i < ii; ++i) {
              cursors[i].once('end', function () {

                // No more cursors let's ensure we got all results
                if (--cursorsDone === 0) {
                  return last === ++index ? next(null) : null;
                }
              }).on('data', function (doc) {

                parser(doc, name);
              });
            }
          });
        });
      });
    });
  });
}

function collectionExists(db, name, cb) {
  db.listCollections({}, { strict: true }).toArray(function (err, collections) {
    if (err) return cb(err);

    var collection = collections.find(c => c.name === name);

    if (!collection) {
      return cb(new Error('Collection ' + name + ' does not exist'));
    }

    cb(null, db.collection(name))
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

  collections.forEach(function (c) {
    collectionExists(db, c, function (err, collection) {

      if (err) { // returns an error if the collection does not exist
        return last === ++index ? next(err) : error(err);
      }

      logger('select collection ' + collection.collectionName);
      makeDir(name + collection.collectionName + path.sep, function (err, name) {

        if (err) {
          return last === ++index ? next(err) : error(err);
        }

        meta(collection, metadata, function () {

          var stream = collection.find(query).stream();

          stream.once('end', function () {

            return last === ++index ? next(null) : null;
          }).on('data', function (doc) {

            parser(doc, name);
          });
        });
      });
    });
  });
}


/**
 * get data from some collections
 * 
 * @function filterCollections
 * @param {Object} db - database
 * @param {String} name - path of dir
 * @param {Object} query - find query
 * @param {String} metadata - path of metadata
 * @param {Function} parser - data parser
 * @param {Function} next - callback
 * @param {Array} skipCollections - excluded collections
 */
function filterCollections(db, name, query, metadata, parser, next, skipCollections) {
  return db.collections(function (err, collections) {

    if (err) {
      return next(err);
    }

    var last = Math.max(~~collections.length - skipCollections.length, 0);
    var index = 0;
    if (last === 0) { // empty set
      return next(err);
    }

    collections
      .filter(c => !skipCollections.find(cc => cc === c.collectionName))
      .forEach(function (collection) {

        if (systemRegex.test(collection.name) === true) {
          return last === ++index ? next(null) : null;
        }

        logger('select collection ' + collection.collectionName);
        makeDir(name + collection.collectionName + path.sep, function (err, name) {
          if (err) {
            return last === ++index ? next(err) : error(err);
          }

          meta(collection, metadata, function () {

            var stream = collection.find(query).stream();

            stream.once('end', function () {
              return last === ++index ? next(null) : null;
            }).on('data', function (doc) {

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

  collections.forEach(function (collection) {

    collectionExists(db, collection, function (err, collection) {

      if (err) { // returns an error if the collection does not xist
        return last === ++index ? next(err) : error(err);
      }

      logger('select collection scan ' + collection.collectionName);
      makeDir(name + collection.collectionName + path.sep, function (err, name) {

        if (err) {
          return last === ++index ? next(err) : error(err);
        }

        meta(collection, metadata, function () {

          collection.parallelCollectionScan({
            numCursors: numCursors
          }, function (err, cursors) {

            if (err) {
              return last === ++index ? next(err) : error(err);
            }

            var ii, cursorsDone;
            ii = cursorsDone = ~~cursors.length;
            if (ii === 0) { // empty set
              return last === ++index ? next(null) : null;
            }

            for (var i = 0; i < ii; ++i) {
              cursors[i].once('end', function () {

                // No more cursors let's ensure we got all results
                if (--cursorsDone === 0) {
                  return last === ++index ? next(null) : null;
                }
              }).on('data', function (doc) {

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
    switch (my.parser.toLowerCase()) {
      case 'bson':
        BSON = require('bson');
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
  if (my.skipCollections !== null) {
    discriminator = filterCollections;
  } else if (my.collections !== null) {
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
    logger = function (msg) {
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
    log.setCurrentLogger(function (msg) {

      return logger(msg);
    });
  }

  var metadata = '';
  if (my.metadata === true) {
    meta = writeMetadata;
  } else {
    meta = function (a, b, c) {

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

  require('mongodb').MongoClient.connect(my.uri, my.options, function (err, client) {
    var db = client.db(my.dbName);
    logger('db open');
    if (err) {
      return callback(err);
    }

    var root = my.tar === null ? my.root : my.dir;
    makeDir(root, function (err, name) {
      if (err) {
        return callback(err);
      }
      makeDir(name + db.databaseName + path.sep, function (err, name) {
        function go() {
          // waiting for `db.fsyncLock()` on node driver
          return discriminator(db, name, my.query, metadata, parser,
            function (err) {
              logger('db close');
              client.close();

              if (err) {
                return callback(err);
              }

              if (my.tar) {
                makeDir(my.root, function (e, name) {

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

                  var tar = require('tar');

                  const packer = tar.create({
                    gzip: my.tar.indexOf('.tar.gz') !== -1,
                  },
                    [root + db.databaseName])
                    .on('error', callback)
                    .on('end', () => {
                      rmDir(root);
                      callback(null);
                    });

                  packer.pipe(dest);
                });

              } else {
                callback(null);
              }
            }, my.collections || my.skipCollections);
        }

        if (err) {
          return callback(err);
        }

        if (my.metadata === false) {
          go();
        } else {
          metadata = name + '.metadata' + path.sep;
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

  var opt = options || Object.create(null);
  if (!opt.uri) {
    throw new Error('missing uri option');
  }
  if (!opt.dbName) {
    throw new Error('missing dbName option');
  }
  if (!opt.stream) {
    if (!opt.root) {
      throw new Error('missing root option');
    } else if (fs.existsSync(opt.root) && !fs.statSync(opt.root).isDirectory()) {
      throw new Error('root option is not a directory');
    }
  }

  var my = {
    dir: path.join(__dirname, 'dump', path.sep),
    uri: String(opt.uri),
    dbName: String(opt.dbName),
    root: path.resolve(String(opt.root || '')) + path.sep,
    stream: opt.stream || null,
    parser: opt.parser || 'bson',
    numCursors: ~~opt.numCursors,
    collections: Array.isArray(opt.collections) ? opt.collections : null,
    skipCollections: Array.isArray(opt.skipCollections) ? opt.skipCollections : null,
    callback: typeof (opt.callback) == 'function' ? opt.callback : null,
    tar: typeof opt.tar === 'string' ? opt.tar : null,
    query: typeof opt.query === 'object' ? opt.query : {},
    logger: typeof opt.logger === 'string' ? path.resolve(opt.logger) : null,
    options: typeof opt.options === 'object' ? opt.options : {},
    metadata: Boolean(opt.metadata)
  };
  if (my.stream) {
    my.tar = true; // override
  }
  return wrapper(my);
}
module.exports = backup;
