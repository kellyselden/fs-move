'use strict';

const co = require('co');
const fs = require('fs');
const path = require('path');
const denodeify = require('denodeify');
const rimraf = denodeify(require('rimraf'));
const rename = denodeify(fs.rename);
const unlink = denodeify(fs.unlink);
const stat = denodeify(fs.stat);
const readdir = denodeify(fs.readdir);
const rmdir = denodeify(fs.rmdir);

const _move = co.wrap(function* move(src, dest, options = {}) {
  let {
    overwrite,
    merge
  } = options;

  let stats;

  try {
    stats = yield stat(dest);
  } catch (err) {
    yield rename(src, dest);

    return;
  }

  if (!overwrite && !merge) {
    throw new Error('Destination directory already exists');
  }

  if (!merge) {
    if (overwrite) {
      yield rimraf(dest);
    }

    yield rename(src, dest);

    return;
  }

  if (stats.isFile()) {
    if (overwrite) {
      yield unlink(dest);

      yield rename(src, dest);
    } else {
      yield rimraf(src);
    }

    return;
  }

  if ((yield stat(src)).isFile()) {
    if (overwrite) {
      yield rimraf(dest);

      yield rename(src, dest);
    } else {
      yield unlink(src);
    }

    return;
  }

  for (let file of yield readdir(src)) {
    yield _move(
      path.join(src, file),
      path.join(dest, file),
      options
    );
  }

  yield rmdir(src);
});

module.exports = _move;
