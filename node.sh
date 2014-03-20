#!/bin/bash

if ! [ -d "./toolchain/node-v0.10.26" ]
then
    echo "Unpacking node"
    cd toolchain
    tar xzf ../bin/node.tar.gz
    cd ..
fi
echo "Starting node"
toolchain/node-v0.10.26/bin/node $1



