# Makefile for Matchbox CHIP-8
all: build

build: clean
	@echo "Building Matchbox..."; cp -r demo dist; npm run build

clean:
	@echo "Cleaning build files..."; rm -rf ./dist

check: test

test:
	@npm run test

lint:
	@npm run lint

deploy: build
	@GH_REF=$(GH_REF) ./deploy.sh
