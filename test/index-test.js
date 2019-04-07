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
const fixturify = require('fixturify');
const sinon = require('sinon');
const fixtures = require('./fixtures');
const move = require('../src');

const fixturifyWrite = co.wrap(function*(src, dest) {
  if (src) {
    fixturify.writeSync(dest, src);
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
    obj = fixturify.readSync(dir);
  } catch (err) {
    obj = null;
  }
  return yield Promise.resolve(obj);
});

describe(function() {
  let sandbox;
  let actualSrcTmpDir;
  let actualDestTmpDir;
  let expectedSrcTmpDir;
  let expectedDestTmpDir;

  beforeEach(co.wrap(function*() {
    sandbox = sinon.createSandbox();

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

  afterEach(function() {
    sandbox.restore();
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

  it('filter', co.wrap(function*() {
    yield setUp('filter');

    yield test({
      merge: true,
      overwrite: true,
      filter(src, dest) {
        return path.basename(src) !== 'both.txt'
          && path.basename(dest) !== 'both.txt';
      }
    });

    yield assert();
  }));

  for (let {
    name,
    options,
    fixtures
  } of
    [
      {
        name: 'overwrite',
        options: {
          overwrite: true
        },
        fixtures: [
          'file-to-folder-overwrite',
          'folder-to-file-overwrite'
        ]
      },
      {
        name: 'merge',
        options: {
          merge: true
        },
        fixtures: [
          'file-to-folder-merge',
          'folder-to-file-merge'
        ]
      },
      {
        name: 'merge-and-overwrite',
        options: {
          merge: true,
          overwrite: true
        },
        fixtures: [
          'file-to-folder-merge-and-overwrite',
          'folder-to-file-merge-and-overwrite'
        ]
      }
    ]
  ) {
    describe(name, function() {
      for (let {
        name: _name,
        beforeTest = () => Promise.resolve(),
        afterTest = () => Promise.resolve()
      } of
        [
          {
            name: 'default'
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
          },
          {
            name: 'broken rename',
            beforeTest() {
              sandbox.stub(fs, 'rename').callsArgWith(2, { code: 'EXDEV' });

              return Promise.resolve();
            }
          }
        ]
      ) {
        it(_name, co.wrap(function*() {
          yield setUp(name);

          yield beforeTest();

          yield test(options);

          yield afterTest();

          yield assert();
        }));
      }

      for (let fixturesDir of fixtures) {
        it(fixturesDir, co.wrap(function*() {
          yield setUp(fixturesDir);

          yield test(options);

          yield assert();
        }));
      }
    });
  }
});
