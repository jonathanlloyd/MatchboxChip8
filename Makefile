# Makefile for Matchbox CHIP-8

all: build

build:
	@webpack

clean:
	@rm -rf ./dist/*

check: test

test:
	@npm test

lint:
	@jshint ./src/*

