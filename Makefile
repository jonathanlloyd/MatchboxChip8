# Makefile for Matchbox CHIP-8

all: build

build:
	@webpack

clean:
	@rm -rf ./dist/*

test:
	@mocha ./tests

lint:
	@jshint ./src/*

