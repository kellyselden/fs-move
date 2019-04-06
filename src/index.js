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

  if (!merge) {
    if (overwrite) {
      if (destExists) {
        yield rimraf(dest);
      }
    }

    yield rename(src, dest);

    return;
  }

  if (!destExists) {
    yield rename(src, dest);

    return;
  }

  if ((yield stat(dest)).isFile()) {
    if (overwrite) {
      yield unlink(dest);

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
