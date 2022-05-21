const backup = require('.');

backup({
  root: 'dump',
  uri: 'mongodb://localhost:27017',
  tar: 'dump.tar.gz',
  dbName: 'manager',
  skipCollections: ['sessions']
})