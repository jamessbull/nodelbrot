#!/bin/bash

if ! [ -d "./toolchain" ]
then
    echo "Toolchain not present - creating ./toolchain"
    mkdir toolchain
fi

if ! [ -d "./toolchain/node-v0.10.26" ]
then
    echo "Node does not exist in toolchain - Unpacking node"
    cd toolchain
    tar xzf ../bin/node.tar.gz
    cd ..
fi
echo "Starting node"
./toolchain/node-v0.10.26/bin/node $1

