const external = [
  'child_process',
  'stream',
  'util',
  'which',
  'memoizeasync',
  'pngquant-bin',
];

export default [
  {
    input: 'lib/PngQuant.js',
    output: {
      file: 'dist/PngQuant.cjs',
      format: 'cjs',
      exports: 'default',
    },
    external,
  },
  {
    input: 'lib/PngQuant.js',
    output: {
      file: 'dist/PngQuant.mjs',
      format: 'es',
    },
    external,
  },
];
