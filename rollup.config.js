const external = ['child_process', 'stream', 'util', 'which', 'memoizeasync'];

export default [
  {
    input: 'lib/PngQuant.js',
    output: {
      file: 'dist/PngQuant.cjs',
      format: 'cjs',
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
