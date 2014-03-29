#!/bin/bash
home=`pwd`
export PATH=$PATH:$home/toolchain/
export NODE_PATH=$home/toolchain/node-v0.10.26/lib/node_modules:$home/test/client:$home/src
echo setting up toolchain
$home/bin/setup.sh $home
echo Running test suite
$home/toolchain/node-v0.10.26/bin/node test/client/testSuite.js