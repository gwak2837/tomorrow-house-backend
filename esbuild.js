import esbuild from 'esbuild'

esbuild
  .build({
    bundle: true,
    entryPoints: ['src/app.ts'],
    loader: {
      '.sql': 'text',
    },
    metafile: true,
    minify: true,
    outfile: 'out/index.cjs',
    platform: 'node',
    target: ['node18'],
    treeShaking: true,
  })
  .then((result) => showOutfilesSize(result))
  .catch((error) => {
    throw new Error(error)
  })

function showOutfilesSize(result) {
  const outputs = result.metafile.outputs
  for (const output in outputs) {
    console.log(`${output}: ${(outputs[output].bytes / 1_000_000).toFixed(2)} MB`)
  }
}
