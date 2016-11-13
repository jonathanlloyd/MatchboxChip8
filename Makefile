# Makefile for Matchbox CHIP-8

all: build

build:
	@webpack

clean:
	@rm -rf ./dist/*

test:
	@echo "Not implemented"

lint:
	@jshint ./src/*

