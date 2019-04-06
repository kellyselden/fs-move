'use strict';

const co = require('co');
const fs = require('fs');
const path = require('path');
const denodeify = require('denodeify');
const rimraf = denodeify(require('rimraf'));
const access = denodeify(fs.access);
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

  let destExists;

  try {
    yield access(dest);

    destExists = true;
  } catch (err) {
    // do nothing
  }

  if (destExists && !overwrite && !merge) {
    throw new Error('Destination directory already exists');
  }

  if (!overwrite && !merge) {
    yield rename(src, dest);

    return;
  }

  if (overwrite && !merge) {
    if (destExists) {
      yield rimraf(dest);
    }

    yield rename(src, dest);

    return;
  }

  if (!overwrite && merge) {
    if (!destExists) {
      yield rename(src, dest);

      return;
    }

    let _stat = yield stat(dest);
    if (_stat.isFile()) {
      yield unlink(src);

      return;
    }

    let files = yield readdir(src);
    for (let file of files) {
      yield _move(
        path.join(src, file),
        path.join(dest, file),
        options
      );
    }

    yield rmdir(src);
  }

  if (overwrite && merge) {
    if (!destExists) {
      yield rename(src, dest);

      return;
    }

    let _stat = yield stat(dest);
    if (_stat.isFile()) {
      yield rimraf(dest);

      yield rename(src, dest);

      return;
    }

    let files = yield readdir(src);
    for (let file of files) {
      yield _move(
        path.join(src, file),
        path.join(dest, file),
        options
      );
    }

    yield rmdir(src);
  }
});

module.exports = _move;
