# [mongodb-backup](http://supergiovane.tk/#/mongodb-backup)

[![NPM version](https://badge.fury.io/js/mongodb-backup.svg)](http://badge.fury.io/js/mongodb-backup)
[![Build Status](https://travis-ci.org/hex7c0/mongodb-backup.svg)](https://travis-ci.org/hex7c0/mongodb-backup)
[![Dependency Status](https://david-dm.org/hex7c0/mongodb-backup/status.svg)](https://david-dm.org/hex7c0/mongodb-backup)

Backup for mongodb.
Look at [`mongodb-backup-cli`](https://github.com/hex7c0/mongodb-backup-cli) for command line usage

## Installation

Install through NPM

```bash
npm install mongodb-backup
```
or
```bash
git clone git://github.com/hex7c0/mongodb-backup.git
```

## API

inside nodejs project
```js
var backup = require('mongodb-backup');
```

### backup(options)

#### options

 - `uri` - **String** URI for MongoDb connection *(default "required")*
 - `root`- **String** Path where save data *(default "required")*
 - `[parser]` - **String** Data parser (bson, json) *(default "bson")*
 - `[collections]` - **Array** Select which collections save *(default "disabled")*
 - `[callback]` - **Function** Callback *(default "disabled")*
 - `[tar]` - **String** Pack files into a .tar file *(default "disabled")*
 - `[query]` - **Object** Query that optionally limits the documents included *(default "{}")*
 - `[logger]` - **String** Path where save log file *(default "disabled")*

## Examples

Take a look at my [examples](https://github.com/hex7c0/mongodb-backup/tree/master/examples)

### [License GPLv3](http://opensource.org/licenses/GPL-3.0)
