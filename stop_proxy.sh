#!/bin/bash

PID=`cat azure-proxy.pid`
if [[ $PID != "" ]]; then
        kill $PID
fi
