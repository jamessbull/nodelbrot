#!/bin/bash
home=`pwd`
export PATH=$PATH:$home/toolchain/
$home/bin/setup.sh $home
echo about to run the test
$home/toolchain/node-v0.10.26/bin/node test/client/test.js