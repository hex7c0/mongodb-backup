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
  var logger;
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

  logger(err.message);
  return;
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

    var database = path + '/' + first;
    if (fs.statSync(database).isDirectory() === false) {
      return;
    }
    fs.readdirSync(database).forEach(function(second) { // collection

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
      fs.rmdirSync(collection);
    });
    fs.rmdirSync(database);
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
 * @param {Object} query - find query
 * @param {Function} parser - data parser
 * @param {Function} next - callback
 */
function allCollections(db, name, query, parser, next) {

  db.collections(function(err, collections) {

    if (err !== null) {
      return error(err);
    }
    var last = collections.length - 1;
    collections.forEach(function(collection, index) {

      logger('select collection ' + collection.collectionName);
      makeDir(name + collection.collectionName + '/', function(err, name) {

        collection.find(query).toArray(function(err, docs) {

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
 * @param {Object} query - find query
 * @param {Function} parser - data parser
 * @param {Function} next - callback
 * @param {Array} collections - selected collections
 */
function someCollections(db, name, query, parser, next, collections) {

  var last = collections.length - 1;
  collections.forEach(function(collection, index) {

    db.collection(collection, function(err, collection) {

      logger('select collection ' + collection.collectionName);
      if (err !== null) {
        return error(err);
      }
      makeDir(name + collection.collectionName + '/', function(err, name) {

        collection.find(query).toArray(function(err, docs) {

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
  if (my.logger === null) {
    logger = function() {

      return;
    };
  } else {
    logger = require('logger-request')({
      filename: my.logger,
      standalone: true,
      winston: {
        logger: '_mongodb',
        level: 'info'
      }
    });
    logger('backup start');
  }

  client.connect(my.uri, function(err, db) {

    logger('db open');
    if (err !== null) {
      return error(err);
    }
    var root = my.tar === null ? my.root : my.dir;
    makeDir(root, function(err, name) {

      // waiting for `db.fsyncLock()` on node driver
      makeDir(name + db.databaseName + '/', function(err, name) {

        discriminator(db, name, my.query, parser, function() {

          logger('db close');
          db.close();
          if (my.tar !== null) {
            var dest = my.root + my.tar;
            logger('make tar file at ' + dest);
            dest = fs.createWriteStream(dest);
            var packer = require('tar').Pack().on('error', error);
            require('fstream').Reader({
              path: root,
              type: 'Directory'
            }).on('error', error).pipe(packer).pipe(dest);
            rmDir(root);
          }
          if (my.callback !== null) {
            logger('callback run');
            my.callback();
          }
          logger('backup stop');
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
    tar: typeof opt.tar === 'string' ? opt.tar : null,
    query: typeof opt.query === 'object' ? opt.query : {},
    logger: typeof opt.logger === 'string' ? resolve(opt.logger) : null
  };
  return wrapper(my);
}
module.exports = backup;
