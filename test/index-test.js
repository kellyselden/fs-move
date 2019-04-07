'use strict';

const { describe } = require('./helpers/mocha');
const { expect } = require('./helpers/chai');
const fs = require('fs');
const path = require('path');
const co = require('co');
const denodeify = require('denodeify');
const tmpDir = denodeify(require('tmp').dir);
const rmdir = denodeify(fs.rmdir);
const writeFile = denodeify(fs.writeFile);
const _symlink = denodeify(fs.symlink);
const unlink = denodeify(fs.unlink);
const _fixturify = require('fixturify');
const fixtures = require('./fixtures');
const move = require('../src');

const fixturifyWrite = co.wrap(function*(src, dest) {
  if (src) {
    _fixturify.writeSync(dest, src);
  } else {
    yield rmdir(dest);
  }
});

const symlink = co.wrap(function*(dir) {
  yield writeFile(path.join(dir, 'symlink-src.txt'), '');

  yield _symlink(
    path.normalize('./symlink-src.txt'),
    path.join(dir, 'symlink-dest.txt')
  );
});

const breakSymlink = co.wrap(function*(dir) {
  yield unlink(path.join(dir, 'symlink-src.txt'));
});

const fixturifyRead = co.wrap(function*(dir) {
  let obj;
  try {
    obj = _fixturify.readSync(dir);
  } catch (err) {
    obj = null;
  }
  return yield Promise.resolve(obj);
});

describe(function() {
  let actualSrcTmpDir;
  let actualDestTmpDir;
  let expectedSrcTmpDir;
  let expectedDestTmpDir;

  beforeEach(co.wrap(function*() {
    actualSrcTmpDir = yield tmpDir();
    actualDestTmpDir = yield tmpDir();
    expectedSrcTmpDir = yield tmpDir();
    expectedDestTmpDir = yield tmpDir();
  }));

  let setUp = co.wrap(function*(fixturesDir) {
    fixturesDir = fixtures[fixturesDir];

    yield fixturifyWrite(fixturesDir['initial']['src'], actualSrcTmpDir);
    yield fixturifyWrite(fixturesDir['initial']['dest'], actualDestTmpDir);
    yield fixturifyWrite(fixturesDir['expected']['src'], expectedSrcTmpDir);
    yield fixturifyWrite(fixturesDir['expected']['dest'], expectedDestTmpDir);
  });

  let test = co.wrap(function*(options) {
    yield move(actualSrcTmpDir, actualDestTmpDir, options);
  });

  let assert = co.wrap(function*() {
    let expectedSrc = yield fixturifyRead(expectedSrcTmpDir);
    let expectedDest = yield fixturifyRead(expectedDestTmpDir);
    let actualSrc = yield fixturifyRead(actualSrcTmpDir);
    let actualDest = yield fixturifyRead(actualDestTmpDir);

    expect(actualSrc).to.deep.equal(expectedSrc);
    expect(actualDest).to.deep.equal(expectedDest);
  });

  it('dest-exists', co.wrap(function*() {
    yield setUp('dest-exists');

    yield expect(test())
      .to.eventually.be.rejectedWith('Destination directory already exists');

    yield assert();
  }));

  it('dest-does-not-exist', co.wrap(function*() {
    yield setUp('dest-does-not-exist');

    yield test();

    yield assert();
  }));

  it('overwrite', co.wrap(function*() {
    yield setUp('overwrite');

    yield test({
      overwrite: true
    });

    yield assert();
  }));

  it('merge', co.wrap(function*() {
    yield setUp('merge');

    yield test({
      merge: true
    });

    yield assert();
  }));

  it('merge-and-overwrite', co.wrap(function*() {
    yield setUp('merge-and-overwrite');

    yield test({
      merge: true,
      overwrite: true
    });

    yield assert();
  }));

  describe('symlink', function() {
    it('overwrite', co.wrap(function*() {
      yield setUp('overwrite');

      yield symlink(actualSrcTmpDir);

      yield test({
        overwrite: true
      });

      yield symlink(expectedDestTmpDir);

      yield assert();
    }));

    it('merge', co.wrap(function*() {
      yield setUp('merge');

      yield symlink(actualSrcTmpDir);

      yield test({
        merge: true
      });

      yield symlink(expectedDestTmpDir);

      yield assert();
    }));

    it('merge-and-overwrite', co.wrap(function*() {
      yield setUp('merge-and-overwrite');

      yield symlink(actualSrcTmpDir);

      yield test({
        merge: true,
        overwrite: true
      });

      yield symlink(expectedDestTmpDir);

      yield assert();
    }));
  });

  describe('broken symlink', function() {
    it('overwrite', co.wrap(function*() {
      yield setUp('overwrite');

      yield symlink(actualSrcTmpDir);

      yield breakSymlink(actualSrcTmpDir);

      yield test({
        overwrite: true
      });

      yield symlink(expectedDestTmpDir);

      yield breakSymlink(expectedDestTmpDir);

      yield assert();
    }));

    it('merge', co.wrap(function*() {
      yield setUp('merge');

      yield symlink(actualSrcTmpDir);

      yield breakSymlink(actualSrcTmpDir);

      yield test({
        merge: true
      });

      yield symlink(expectedDestTmpDir);

      yield breakSymlink(expectedDestTmpDir);

      yield assert();
    }));

    it('merge-and-overwrite', co.wrap(function*() {
      yield setUp('merge-and-overwrite');

      yield symlink(actualSrcTmpDir);

      yield breakSymlink(actualSrcTmpDir);

      yield test({
        merge: true,
        overwrite: true
      });

      yield symlink(expectedDestTmpDir);

      yield breakSymlink(expectedDestTmpDir);

      yield assert();
    }));
  });
});
