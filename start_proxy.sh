#!/bin/bash
nohup node azure-proxy.js >> logs/node.log &
echo $! > azure-proxy.pid