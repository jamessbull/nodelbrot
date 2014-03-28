#!/bin/bash

if ! [ -d "./toolchain" ]
then
    echo "Toolchain not present - creating ./toolchain"
    mkdir toolchain
fi

if ! [ -d "./toolchain/chrome-driver" ]
then
    echo "Chromedriver does not exist in toolchain - Unpacking chromedriver"
    cd toolchain
    tar xzf "../bin/chromedriver.tar.gz"
    cd ..
fi

if ! [ -d "./toolchain/node-v0.10.26" ]
then
    echo "Node does not exist in toolchain - Unpacking node"
    cd toolchain
    tar -Pxzf ../bin/node.tar.gz
    cd ..
fi
echo "Starting node"
./toolchain/node-v0.10.26/bin/node $1

