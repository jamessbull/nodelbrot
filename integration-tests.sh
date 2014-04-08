#!/bin/bash
home=`pwd`
export PATH=$PATH:$home/toolchain/:$home/toolchain/node-v0.10.26/bin:$home/toolchain/node-v0.10.26/lib/node_modules/jasmine-node/bin/
export NODE_PATH=$home/toolchain/node-v0.10.26/lib/node_modules:$home/test:$home/src
echo setting up toolchain
$home/bin/setup.sh $home
echo Running test suite
jasmine-node test/integration/specs