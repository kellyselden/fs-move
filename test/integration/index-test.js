'use strict';

const { describe } = require('../helpers/mocha');
const { expect, dir } = require('../helpers/chai');
const fs = require('fs');
const path = require('path');
const co = require('co');
const denodeify = require('denodeify');
const tmpDir = denodeify(require('tmp').dir);
const cpr = denodeify(require('cpr'));
const fixturify = require('fixturify');
const move = require('../../src');

const fixturesPath = path.resolve(__dirname, '../fixtures');

describe(function() {
  let srcTmpDir;
  let destTmpDir;

  beforeEach(co.wrap(function*() {
    srcTmpDir = yield tmpDir();
    destTmpDir = yield tmpDir();
  }));

  let test = co.wrap(function*(fixturesDir, options) {
    fixturesDir = path.join(fixturesPath, fixturesDir);

    yield cpr(path.join(fixturesDir, 'initial/src'), srcTmpDir);
    try {
      yield cpr(path.join(fixturesDir, 'initial/dest'), destTmpDir);
    } catch (err) {
      // do nothing
    }

    let err;
    try {
      yield move(srcTmpDir, destTmpDir, options);
    } catch (_err) {
      err = _err;
    }

    let expectedSrc;
    try {
      expectedSrc = fixturify.readSync(path.join(fixturesDir, 'expected/src'));
    } catch (err) {
      expectedSrc = null;
    }
    let expectedDest = fixturify.readSync(path.join(fixturesDir, 'expected/dest'));
    let actualSrc;
    try {
      actualSrc = fixturify.readSync(srcTmpDir);
    } catch (err) {
      actualSrc = null;
    }
    let actualDest = fixturify.readSync(destTmpDir);

    expect(actualSrc).to.deep.equal(expectedSrc);
    expect(actualDest).to.deep.equal(expectedDest);

    if (err) {
      throw err;
    }

    expect(dir(srcTmpDir)).to.not.exist;
  });

  it('overwrite', co.wrap(function*() {
    yield test('overwrite', {
      overwrite: true
    });
  }));

  it('dest-does-not-exist', co.wrap(function*() {
    fs.rmdirSync(destTmpDir);

    yield test('dest-does-not-exist');
  }));

  it('merge', co.wrap(function*() {
    yield test('merge', {
      merge: true
    });
  }));

  it('merge-and-overwrite', co.wrap(function*() {
    yield test('merge-and-overwrite', {
      merge: true,
      overwrite: true
    });
  }));

  it('dest-exists-error', co.wrap(function*() {
    yield expect(test('dest-exists-error'))
      .to.eventually.be.rejectedWith('Destination directory already exists');
  }));
});
