'use strict';

const co = require('co');
const fs = require('fs');
const path = require('path');
const denodeify = require('denodeify');
const rimraf = denodeify(require('rimraf'));

const _move = co.wrap(function* move(src, dest, options = {}) {
  let {
    overwrite,
    merge
  } = options;

  let destExists;

  try {
    fs.accessSync(dest);

    destExists = true;
  } catch (err) {
    // do nothing
  }

  if (destExists && !overwrite && !merge) {
    throw new Error('Destination directory already exists');
  }

  if (!overwrite && !merge) {
    fs.renameSync(src, dest);

    return;
  }

  if (overwrite && !merge) {
    if (destExists) {
      yield rimraf(dest);
    }

    fs.renameSync(src, dest);

    return;
  }

  if (!overwrite && merge) {
    if (!destExists) {
      fs.renameSync(src, dest);

      return;
    }

    let stat = fs.statSync(dest);
    if (stat.isFile()) {
      fs.unlinkSync(src);

      return;
    }

    let files = fs.readdirSync(src);
    for (let file of files) {
      yield _move(
        path.join(src, file),
        path.join(dest, file),
        options
      );
    }

    fs.rmdirSync(src);
  }

  if (overwrite && merge) {
    if (!destExists) {
      fs.renameSync(src, dest);

      return;
    }

    let stat = fs.statSync(dest);
    if (stat.isFile()) {
      yield rimraf(dest);

      fs.renameSync(src, dest);

      return;
    }

    let files = fs.readdirSync(src);
    for (let file of files) {
      yield _move(
        path.join(src, file),
        path.join(dest, file),
        options
      );
    }

    fs.rmdirSync(src);
  }
});

module.exports = _move;
