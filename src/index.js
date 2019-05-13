'use strict';

const fs = require('fs-extra');
const path = require('path');

module.exports = async function move(src, dest, options = {}, callback) {
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

    if (!filter(src, dest)) {
      return;
    }

    let destStats;

    try {
      destStats = await fs.lstat(dest);
    } catch (err) {}

    if (destStats && !overwrite && !merge) {
      throw new Error('Destination directory already exists');
    }

    let srcStats = await fs.lstat(src);

    let areBothDirs = destStats && srcStats.isDirectory() && destStats.isDirectory();

    // pre

    if (overwrite && (!areBothDirs || !merge)) {
      await fs.remove(dest);

      destStats = null;
    }

    // during

    if (!destStats) {
      try {
        await fs.rename(src, dest);
      } catch (err) {
        if (err.code === 'EXDEV') {
          await fs.copy(src, dest);

          await fs.remove(src);
        }
      }
    }

    if (merge && areBothDirs) {
      for (let file of await fs.readdir(src)) {
        await move(
          path.join(src, file),
          path.join(dest, file),
          options
        );
      }
    }

    // post

    if (purge) {
      await fs.remove(src);
    } else {
      try {
        await fs.rmdir(src);
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
};
