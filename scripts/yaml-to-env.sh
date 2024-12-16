#!/bin/bash
# shellcheck shell=bash

tmp_file=$(mktemp)

while IFS=': ' read -r key value; do
    [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue

    value="${value//\"/}"
    value="${value//[[:space:]]/}"

    [[ -n "$key" ]] && echo "${key}=${value}"
done < .env.yaml | sort -u > "$tmp_file"

mv "$tmp_file" .env
