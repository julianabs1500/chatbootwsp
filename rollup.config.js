import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/app.ts',
  output: {
    file: 'dist/app.js',
    format: 'esm',
    sourcemap: false,
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
    }),
  ],
  external: [
    '@builderbot/bot',
    '@builderbot/provider-meta',
    'firebase-admin',
  ],
}
