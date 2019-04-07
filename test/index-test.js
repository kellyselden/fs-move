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

  it('file-to-folder-overwrite', co.wrap(function*() {
    yield setUp('file-to-folder-overwrite');

    yield test({
      overwrite: true
    });

    yield assert();
  }));

  it('folder-to-file-overwrite', co.wrap(function*() {
    yield setUp('folder-to-file-overwrite');

    yield test({
      overwrite: true
    });

    yield assert();
  }));

  it('file-to-folder-merge', co.wrap(function*() {
    yield setUp('file-to-folder-merge');

    yield test({
      merge: true
    });

    yield assert();
  }));

  it('folder-to-file-merge', co.wrap(function*() {
    yield setUp('folder-to-file-merge');

    yield test({
      merge: true
    });

    yield assert();
  }));

  it('file-to-folder-merge-and-overwrite', co.wrap(function*() {
    yield setUp('file-to-folder-merge-and-overwrite');

    yield test({
      merge: true,
      overwrite: true
    });

    yield assert();
  }));

  it('folder-to-file-merge-and-overwrite', co.wrap(function*() {
    yield setUp('folder-to-file-merge-and-overwrite');

    yield test({
      merge: true,
      overwrite: true
    });

    yield assert();
  }));

  for (let {
    name,
    beforeTest,
    afterTest
  } of
    [
      {
        name: 'default',
        beforeTest: () => Promise.resolve(),
        afterTest: () => Promise.resolve()
      },
      {
        name: 'symlink',
        beforeTest: co.wrap(function*() {
          yield symlink(actualSrcTmpDir);
        }),
        afterTest: co.wrap(function*() {
          yield symlink(expectedDestTmpDir);
        })
      },
      {
        name: 'broken symlink',
        beforeTest: co.wrap(function*() {
          yield symlink(actualSrcTmpDir);

          yield breakSymlink(actualSrcTmpDir);
        }),
        afterTest: co.wrap(function*() {
          yield symlink(expectedDestTmpDir);

          yield breakSymlink(expectedDestTmpDir);
        })
      }
    ]
  ) {
    describe(name, function() {
      it('overwrite', co.wrap(function*() {
        yield setUp('overwrite');

        yield beforeTest();

        yield test({
          overwrite: true
        });

        yield afterTest();

        yield assert();
      }));

      it('merge', co.wrap(function*() {
        yield setUp('merge');

        yield beforeTest();

        yield test({
          merge: true
        });

        yield afterTest();

        yield assert();
      }));

      it('merge-and-overwrite', co.wrap(function*() {
        yield setUp('merge-and-overwrite');

        yield beforeTest();

        yield test({
          merge: true,
          overwrite: true
        });

        yield afterTest();

        yield assert();
      }));
    });
  }
});
