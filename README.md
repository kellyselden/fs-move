# fs-move

[![npm version](https://badge.fury.io/js/fs-move.svg)](https://www.npmjs.com/package/fs-move.json)
[![Build Status](https://travis-ci.org/kellyselden/fs-move.svg?branch=master)](https://travis-ci.org/kellyselden/fs-move)

Move directory with options

```js
const move = require('fs-move');

(async () => {
  await move(src, dest, {
    merge: true,
    overwrite: true
  });
})();
```
