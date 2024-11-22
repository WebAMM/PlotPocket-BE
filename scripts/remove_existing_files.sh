#!/bin/bash
FILE="/home/ec2-user/loyal_locker_BE/.vscode/settings.json"

if [ -f "$FILE" ]; then
    rm "$FILE"
fi