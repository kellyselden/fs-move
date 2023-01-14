'use strict';

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { rimraf } = require('rimraf');
const cpr = promisify(require('cpr'));
const lstat = promisify(fs.lstat);
const readdir = promisify(fs.readdir);
const rmdir = promisify(fs.rmdir);

async function move(src, dest, options = {}, callback) {
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

    if (!await Promise.resolve(filter(src, dest))) {
      return;
    }

    let destStats;

    try {
      destStats = await lstat(dest);
    } catch (err) {}

    if (destStats && !overwrite && !merge) {
      throw new Error('Destination directory already exists');
    }

    let srcStats = await lstat(src);

    let areBothDirs = destStats && srcStats.isDirectory() && destStats.isDirectory();

    // pre

    if (overwrite && (!areBothDirs || !merge)) {
      await rimraf(dest);

      destStats = null;
    }

    // during

    if (!destStats) {
      try {
        await promisify(fs.rename)(src, dest);
      } catch (err) {
        if (err.code === 'EXDEV') {
          await cpr(src, dest);

          await rimraf(src);
        }
      }
    }

    if (merge && areBothDirs) {
      for (let file of await readdir(src)) {
        await move(
          path.join(src, file),
          path.join(dest, file),
          options
        );
      }
    }

    // post

    if (purge) {
      await rimraf(src);
    } else {
      try {
        await rmdir(src);
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
}

module.exports = move;
