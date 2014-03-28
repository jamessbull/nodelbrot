#!/bin/bash
home=`pwd`

export PATH=$PATH:$home/toolchain
export NODE_PATH=$home/toolchain/node-v0.10.26/lib/node_modules

if ! [ -d "./toolchain" ]
then
    echo "Toolchain not present - creating ./toolchain"
    mkdir toolchain
fi

if ! [ -d "$home/toolchain/chrome-driver" ]
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
    cd ..
fi
echo "Starting node"
$home/toolchain/node-v0.10.26/bin/node $1

