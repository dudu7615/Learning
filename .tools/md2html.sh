#!/bin/bash
find . -type f -name '*.md' | while read mdfile; do
    htmlfile="public/html/${mdfile#./}"
    htmlfile="${htmlfile%.md}.html"
    mkdir -p "$(dirname "$htmlfile")"
    markmap "$mdfile" -o "$htmlfile"
    echo "Converted $mdfile -> $htmlfile"
done