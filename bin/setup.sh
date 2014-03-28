#!/bin/bash
home=$1

if ! [ -d "$home/toolchain" ]
then
    echo "Toolchain not present - creating ./toolchain"
    mkdir toolchain
fi

if ! [ -f "$home/toolchain/chromedriver" ]
then
    echo "Chromedriver does not exist in toolchain - Unpacking chromedriver"
    cd $home/toolchain
    tar xzf "$home/bin/chromedriver.tar.gz"
    cd $home
fi

if ! [ -d "$home/toolchain/node-v0.10.26" ]
then
    echo "Node does not exist in toolchain - Unpacking node"
    cd $home/toolchain
    tar -Pxzf ../bin/node.tar.gz
    cd $home
fi

