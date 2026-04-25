#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");
const { removeBackgroundFromBuffer } = require("../lib/remove-background.cjs");

const DEFAULT_INPUTS = ["public/test/1.png", "public/test/2.png", "public/test/3.png"];
const DEFAULT_OUTPUT_DIR = "public/test/removed";

async function main() {
  const inputs = process.argv.slice(2);
  const targets = inputs.length > 0 ? inputs : DEFAULT_INPUTS;

  for (const inputPath of targets) {
    const parsed = path.parse(inputPath);
    const outputPath = path.join(DEFAULT_OUTPUT_DIR, `${parsed.name}.png`);
    const input = await fs.readFile(inputPath);
    const output = await removeBackgroundFromBuffer(input);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, output);
    console.log(`${inputPath} -> ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
