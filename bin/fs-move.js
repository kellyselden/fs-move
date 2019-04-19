#!/usr/bin/env node

const package = require('../package.json');
const program = require('commander');
const move = require('../src/index');

program
  .version(package.version)
  .description(package.description)
  .usage('[options] <source...> <destination>')
  .option('--merge', 'Merge existing directories recursively')
  .option('--overwrite', 'Overwrite existing files')
  .option('--purge', 'Delete source files even when not moved')
  .parse(process.argv);

if (program.args.length < 2) {
  program.help();
}

const dest = program.args[program.args.length - 1];
for (let src of program.args.slice(0, -1)) {
  move(
    src,
    dest,
    {
      merge: program.merge,
      overwrite: program.overwrite,
      purge: program.purge
    },
    err => {
      if (err) {
        console.error('error: %s', err.message);
        process.exit(1);
      }
    }
  );
}
