'use strict';

const { describe } = require('./helpers/mocha');
const { expect } = require('./helpers/chai');
const fs = require('fs-extra');
const path = require('path');
const denodeify = require('denodeify');
const tmpDir = denodeify(require('tmp').dir);
const fixturify = require('fixturify');
const sinon = require('sinon');
const fixtures = require('./fixtures');
const move = require('../src');

const fixturifyWrite = async function(src, dest) {
  if (src) {
    fixturify.writeSync(dest, src);
  } else {
    await fs.rmdir(dest);
  }
};

const symlink = async function(dir) {
  await fs.writeFile(path.join(dir, 'symlink-src.txt'), '');

  await fs.symlink(
    path.normalize('./symlink-src.txt'),
    path.join(dir, 'symlink-dest.txt')
  );
};

const breakSymlink = async function(dir) {
  await fs.unlink(path.join(dir, 'symlink-src.txt'));
};

const fixturifyRead = async function(dir) {
  let obj;
  try {
    obj = fixturify.readSync(dir);
  } catch (err) {
    obj = null;
  }
  return await Promise.resolve(obj);
};

describe(function() {
  let sandbox;
  let actualSrcTmpDir;
  let actualDestTmpDir;
  let expectedSrcTmpDir;
  let expectedDestTmpDir;

  beforeEach(async function() {
    sandbox = sinon.createSandbox();

    actualSrcTmpDir = await tmpDir();
    actualDestTmpDir = await tmpDir();
    expectedSrcTmpDir = await tmpDir();
    expectedDestTmpDir = await tmpDir();
  });

  let setUp = async function(fixturesDir) {
    fixturesDir = fixtures[fixturesDir];

    await fixturifyWrite(fixturesDir['initial']['src'], actualSrcTmpDir);
    await fixturifyWrite(fixturesDir['initial']['dest'], actualDestTmpDir);
    await fixturifyWrite(fixturesDir['expected']['src'], expectedSrcTmpDir);
    await fixturifyWrite(fixturesDir['expected']['dest'], expectedDestTmpDir);
  };

  let _test = move => async function(options) {
    await move(actualSrcTmpDir, actualDestTmpDir, options);
  };
  let testPromise = _test(move);
  let testCallback = _test(denodeify(move));

  let assert = async function() {
    let expectedSrc = await fixturifyRead(expectedSrcTmpDir);
    let expectedDest = await fixturifyRead(expectedDestTmpDir);
    let actualSrc = await fixturifyRead(actualSrcTmpDir);
    let actualDest = await fixturifyRead(actualDestTmpDir);

    expect(actualSrc).to.deep.equal(expectedSrc);
    expect(actualDest).to.deep.equal(expectedDest);
  };

  afterEach(function() {
    sandbox.restore();
  });

  for (let {
    name,
    test
  } of
    [
      {
        name: 'promise',
        test: testPromise
      },
      {
        name: 'callback',
        test: testCallback
      }
    ]
  ) {
    describe(name, function() {
      it('dest-exists', async function() {
        await setUp('dest-exists');

        await expect(test())
          .to.eventually.be.rejectedWith('Destination directory already exists');

        await assert();
      });

      it('dest-does-not-exist', async function() {
        await setUp('dest-does-not-exist');

        await test();

        await assert();
      });

      it('filter', async function() {
        await setUp('filter');

        await test({
          merge: true,
          overwrite: true,
          filter(src, dest) {
            return path.basename(src) !== 'both.txt'
              && path.basename(dest) !== 'both.txt';
          }
        });

        await assert();
      });

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
          },
          {
            name: 'merge-and-purge',
            options: {
              merge: true,
              purge: true
            },
            fixtures: [
              'file-to-folder-merge-and-purge',
              'folder-to-file-merge-and-purge'
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
                async beforeTest() {
                  await symlink(actualSrcTmpDir);
                },
                async afterTest() {
                  await symlink(expectedDestTmpDir);
                }
              },
              {
                name: 'broken symlink',
                async beforeTest() {
                  await symlink(actualSrcTmpDir);

                  await breakSymlink(actualSrcTmpDir);
                },
                async afterTest() {
                  await symlink(expectedDestTmpDir);

                  await breakSymlink(expectedDestTmpDir);
                }
              },
              {
                name: 'broken rename',
                beforeTest() {
                  sandbox.stub(fs, 'rename').rejects(Object.assign(new Error(), { code: 'EXDEV' }));

                  return Promise.resolve();
                }
              }
            ]
          ) {
            it(_name, async function() {
              await setUp(name);

              await beforeTest();

              await test(options);

              await afterTest();

              await assert();
            });
          }

          for (let fixturesDir of fixtures) {
            it(fixturesDir, async function() {
              await setUp(fixturesDir);

              await test(options);

              await assert();
            });
          }
        });
      }
    });
  }
});
