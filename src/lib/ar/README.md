# AR CLI

This directory contains a local CLI for compiling MindAR image targets into `.mind` files.

## What it does

- accepts one or more image files
- accepts directories of images
- can recurse through directories
- can bundle one directory into one `.mind` file
- writes all outputs into a target directory

The CLI uses MindAR's offline compiler under the hood, so the generated files are compatible with the `.mind` targets your AR viewer already loads.

## Location

```txt
src/lib/ar/compile-mind.ts
```

## Prerequisites

This CLI depends on MindAR's offline compiler, which in turn depends on the native `canvas` binding.

If you see an error like:

```txt
Cannot find module '../build/Release/canvas.node'
```

rebuild the binding first:

```sh
pnpm rebuild canvas
```

or:

```sh
npm rebuild canvas
```

## Usage

Single image:

```sh
node src/lib/ar/compile-mind.ts -o public/ar/targets public/targets/adam.png
```

Multiple images:

```sh
node src/lib/ar/compile-mind.ts \
  -o public/ar/targets \
  -i public/targets/adam.png \
  -i public/targets/eve.png \
  -i public/targets/noah.webp
```

Directory input, one `.mind` file per image:

```sh
node src/lib/ar/compile-mind.ts -o public/ar/targets public/targets
```

Directory input, one bundled `.mind` file for the whole folder:

```sh
node src/lib/ar/compile-mind.ts -o public/ar/targets --bundle-directories public/targets/team
```

Recursive directory input:

```sh
node src/lib/ar/compile-mind.ts -o public/ar/targets -r public/targets
```

Overwrite existing outputs:

```sh
node src/lib/ar/compile-mind.ts -o public/ar/targets --overwrite public/targets
```

Auto-rename colliding output names:

```sh
node src/lib/ar/compile-mind.ts -o public/ar/targets --collision rename -r public/targets
```

Verbose mode:

```sh
node src/lib/ar/compile-mind.ts -o public/ar/targets -r public/targets --verbose
```

## Supported extensions

```txt
.jpg
.jpeg
.png
.webp
.bmp
```

## CLI flags

```txt
-i, --input <path>       Repeatable input file or directory
-o, --output <dir>       Output directory for generated .mind files
-r, --recursive          Recurse into input directories
    --bundle-directories Compile each input directory into one .mind file
    --collision <mode>   Output collision strategy: error | rename
    --overwrite          Replace existing .mind files
    --fail-fast          Stop after the first compile failure
-v, --verbose            Print per-file progress and backend details
-h, --help               Show CLI help
    --version            Print CLI version
```

## Output naming

By default, each image becomes:

```txt
<image-stem>.mind
```

Examples:

```txt
adam.png   -> adam.mind
eve.webp   -> eve.mind
noah.jpeg  -> noah.mind
```

If two different inputs would produce the same output filename, the CLI will:

- fail by default
- or rename them to `name.mind`, `name-2.mind`, `name-3.mind`, etc. when you pass `--collision rename`

When you pass `--bundle-directories`, each directory input becomes:

```txt
<directory-name>.mind
```

That bundled file contains one MindAR target entry per image in the directory. The CLI prints the `targetIndex` to image mapping after each bundled compile, and the order is stable because the images are sorted by relative path before compilation.

## Recommended workflow

1. Put target images in a stable source folder.
2. Compile them into your public target output folder.
3. Upload or copy the generated `.mind` files to the path your AR content expects.
4. Update Firestore or your AR data records to point to the new target path.
