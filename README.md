# fs-move

[![npm version](https://badge.fury.io/js/fs-move.svg)](https://www.npmjs.com/package/fs-move.json)
[![Build Status](https://travis-ci.org/kellyselden/fs-move.svg?branch=master)](https://travis-ci.org/kellyselden/fs-move)

Move directory with options

```js
const move = require('fs-move');

(async () => {
  await move(src, dest, {
    merge: false,
    overwrite: false,
    purge: false,
    filter(src, dest) {
      return true;
    }
  });
})();

// or using callback
move(src, dest, err => {
  if (err) {
    throw err;
  }
});
```

## CLI

```shell
$ fs-move

Usage: fs-move [options] <source...> <destination>

Move directory with options

Options:
  -V, --version  output the version number
  --merge        Merge existing directories recursively
  --overwrite    Overwrite existing files
  --purge        Delete source files even when not moved
  -h, --help     output usage information
```
