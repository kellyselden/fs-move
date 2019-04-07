'use strict';

const co = require('co');
const fs = require('fs');
const path = require('path');
const denodeify = require('denodeify');
const rimraf = denodeify(require('rimraf'));
const rename = denodeify(fs.rename);
const stat = denodeify(fs.stat);
const readdir = denodeify(fs.readdir);

const _move = co.wrap(function* move(src, dest, options = {}) {
  let {
    overwrite,
    merge
  } = options;

  let destStats;

  try {
    destStats = yield stat(dest);
  } catch (err) {
    // do nothing
  }

  if (destStats && !overwrite && !merge) {
    throw new Error('Destination directory already exists');
  }

  let srcStats;

  try {
    srcStats = yield stat(src);
  } catch (err) {
    // do nothing
  }

  let areBothDirs = destStats && srcStats.isDirectory() && destStats.isDirectory();

  // pre

  if (overwrite && (!areBothDirs || !merge)) {
    yield rimraf(dest);

    destStats = null;
  }

  // during

  if (!destStats) {
    yield rename(src, dest);
  }

  if (merge && areBothDirs) {
    for (let file of yield readdir(src)) {
      yield _move(
        path.join(src, file),
        path.join(dest, file),
        options
      );
    }
  }

  // post

  yield rimraf(src);
});

module.exports = _move;
