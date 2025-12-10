#!/bin/bash

awk '/^SF:/ {file=$2} /^LF:/ {lf=$2} /^LH:/ {lh=$2} END {if (lf > 0) print file, lh, lf, (lh/lf*100)"%"; else print file, lh, lf, "0%"}' packages/liaison/coverage/lcov.info | sort -k4 -n
