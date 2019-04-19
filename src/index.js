'use strict';

const co = require('co');
const fs = require('fs-extra');
const path = require('path');

const _move = co.wrap(function* move(src, dest, options = {}, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  try {
    let {
      overwrite,
      merge,
      purge,
      filter = () => true
    } = options;

    if (!(yield Promise.resolve(filter(src, dest)))) {
      return;
    }

    let destStats;

    try {
      destStats = yield fs.lstat(dest);
    } catch (err) {}

    if (destStats && !overwrite && !merge) {
      throw new Error('Destination directory already exists');
    }

    let srcStats = yield fs.lstat(src);

    let areBothDirs = destStats && srcStats.isDirectory() && destStats.isDirectory();

    // pre

    if (overwrite && (!areBothDirs || !merge)) {
      yield fs.remove(dest);

      destStats = null;
    }

    // during

    if (!destStats) {
      try {
        yield fs.rename(src, dest);
      } catch (err) {
        if (err.code === 'EXDEV') {
          yield fs.copy(src, dest);

          yield fs.remove(src);
        }
      }
    }

    if (merge && areBothDirs) {
      for (let file of yield fs.readdir(src)) {
        yield _move(
          path.join(src, file),
          path.join(dest, file),
          options
        );
      }
    }

    // post

    if (purge) {
      yield fs.remove(src);
    } else {
      try {
        yield fs.rmdir(src);
      } catch (err) {}
    }

    if (callback) {
      callback(null);
    }
  } catch (err) {
    if (!callback) {
      throw err;
    }

    callback(err);
  }
});

module.exports = _move;
