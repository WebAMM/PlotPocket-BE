#!/bin/bash
FILE="/home/ec2-user/PlotPocket-BE/.vscode/settings.json"

if [ -f "$FILE" ]; then
    rm "$FILE"
fi