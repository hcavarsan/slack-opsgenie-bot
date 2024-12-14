#!/bin/bash
# shellcheck shell=bash

# Create temporary file
tmp_file=$(mktemp)

# Convert YAML to env format and remove duplicates
while IFS=': ' read -r key value; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue

    # Remove quotes and spaces
    value="${value//\"/}"
    value="${value//[[:space:]]/}"

    # Only write if key is not empty
    [[ -n "$key" ]] && echo "${key}=${value}"
done < .env.yaml | sort -u > "$tmp_file"

# Move temp file to final location
mv "$tmp_file" .env
