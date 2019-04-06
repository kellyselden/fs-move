'use strict';

const chai = require('chai');
const chaiFiles = require('chai-files');

chai.use(chaiFiles);
chai.use(require('chai-as-promised'));

module.exports = chai;
module.exports.file = chaiFiles.file;
module.exports.dir = chaiFiles.dir;
