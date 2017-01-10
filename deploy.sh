#!/bin/bash

echo "Deploying Matchbox..."

GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$GIT_BRANCH" == "HEAD" ]
then
  GIT_BRANCH=$TRAVIS_BRANCH
fi

if [ "$GIT_BRANCH" == "master" ]
then
  GH_REF="turingincomplete/MatchboxChip8"
elif [ "$GIT_BRANCH" == "development" ]
then
  GH_REF="turingincomplete/MatchboxChip8-development"
else
  echo "This commit was made against $GIT_BRANCH and not master/development! No deploy!"
  exit 0
fi

rev=$(git rev-parse --short HEAD)

echo "Deploying build $rev to $GH_REF"

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
