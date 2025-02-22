#!/bin/bash

if [[ "$OSTYPE" == "darwin"* ]]; then
  find ./build/ -type f -name "*.js" -print0 | xargs -0 sed -i '' -e 's/{return Math.pow(BigInt(e),BigInt(t))}/{return BigInt(e)**BigInt(t)}/g'
else
  find ./build/ -type f -name "*.js" -print0 | xargs -0 sed -i -e 's/{return Math.pow(BigInt(e),BigInt(t))}/{return BigInt(e)**BigInt(t)}/g'
fi