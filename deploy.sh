#!/bin/bash

echo "Deploying Matchbox..."

if [ "$TRAVIS_BRANCH" != "" ] && [ "$TRAVIS_BRANCH" != "master" ]
then
  echo "This commit was made against $TRAVIS_BRANCH and not master! No deploy!"
  exit 0
fi

rev=$(git rev-parse --short HEAD)

echo "Deploying build $rev"

cp -r dist deploy
cd deploy
git init
git config user.name "Automated build"
git config user.email "N/A"
git checkout -b gh-pages
git add --all :/
git commit -m "Automated build $rev"
git remote add origin "https://${GH_TOKEN}@github.com/${GH_REF}.git"
git push origin gh-pages --force --quiet 
cd ../
rm -rf deploy
