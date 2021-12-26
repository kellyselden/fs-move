# fs-move

[![npm version](https://badge.fury.io/js/fs-move.svg)](https://badge.fury.io/js/fs-move)

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
