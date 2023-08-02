import esbuild from 'esbuild'

const NODE_ENV = process.env.NODE_ENV

const context = await esbuild.context({
  bundle: true,
  entryPoints: ['src/app.ts'],
  loader: {
    '.sql': 'text',
  },
  metafile: true,
  minify: NODE_ENV === 'production',
  outfile: NODE_ENV === 'production' ? 'dist/index.cjs' : 'out/index.cjs',
  platform: 'node',
  plugins: [
    {
      name: 'my-plugin',
      setup: (build) => build.onEnd(showOutfilesSize),
    },
  ],
  target: ['node18'],
  treeShaking: true,
})

if (NODE_ENV === 'development') {
  context.watch()
} else if (NODE_ENV === 'production') {
  await context.rebuild()
  context.dispose()
}

function showOutfilesSize(result) {
  const outputs = result.metafile.outputs
  for (const output in outputs) {
    console.log(`${output}: ${(outputs[output].bytes / 1_000_000).toFixed(2)} MB`)
  }
}
