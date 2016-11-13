var MatchboxChip8 =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	/*
	Copyright (c) 2016 Jonathan Lloyd - copyright@thisisjonathan.com

	The MIT License

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
	*/

	/**
	 * Matchbox - Chip 8 Interpreter
	 * A Chip 8 interpreter written in JavaScript for HTML5 Canvas.
	 * @module matchboxchip8
	 */


	var log = __webpack_require__(1).getLogger("matchboxchip8");

	var disassembly = __webpack_require__(2);
	var rom_loading = __webpack_require__(3);

	var DEBUG_MODE = true;
	var PROGRAM_ADDRESS = 0x200;

	if (DEBUG_MODE) {
	    log.setLevel("debug");
	} else {
	    log.setLevel("warn");
	}


	/**
	 * Matchbox interpreter
	 * @constructor
	 * @param {CanvasRenderingContext2D} context - The 2D canvas drawing
	 *     context used to draw the screen for the VM.
	 */
	var Interpreter = function () {
	    this.display = new Array(2048);

	    /*
	     * 4KB of internal memory
	     * 0x000 -> 0x1FF: Reserved
	     * 0x200 -> 0xFFF: Space for program logic/data
	     */
	    this.RAM = new Array(4096);

	    // 16 8-bit general purpose registers
	    this.registers = new Array(16);

	    // Single 32-bit register
	    this.I = 0;

	    // Delay timer - When > 0, decreases by one at a rate of 60HZ
	    this.DT = 0;

	    /*
	     *  Sound timer
	     *   - When > 0, decreases by one at a rate of 60HZ
	     *   - When > 0, sound plays
	     */
	    this.ST = 0;

	    /*
	     * The program counter
	     *  - Contains the memory address of the next instrution to be 
	     *    executed.
	     */
	    this.PC = 0;

	    // The stack pointer
	    this.SP = 0;

	    // The stack - contains 16 16bit values
	    this.stack = new Array(16);

	    this.reset();
	};

	/**
	 * Reset the state of the emulator (like a hardware reset).
	 */
	Interpreter.prototype.reset = function () {
	    // Clear display
	    for(var i = 0; i < this.display.length; i += 1) {
	        this.display[i] = 0;
	    }

	    // Reset RAM
	    for(i = 0; i < this.RAM.length; i += 1) {
	        this.RAM[i] = 0;
	    }

	    // Reset registers
	    for(i = 0; i < this.registers.length; i += 1) {
	        this.registers[i] = 0;
	    }

	    // Reset accumulator
	    this.I = 0;

	    // Reset delay timer
	    this.DT = 0;

	    // Reset sound timer
	    this.ST = 0;

	    // Reset program counter
	    this.PC = PROGRAM_ADDRESS;

	    // Reset stack pointer
	    this.SP = -1;

	    // Reset stack
	    for(i = 0; i < this.stack.length; i += 1) {
	        this.stack[i] = 0;
	    }
	};

	/**
	 * Disassemble and load the given ROM into memory
	 * @param {File || string} rom - A File Object containing the ROM data or
	 *     a URL to such a file.
	 */
	Interpreter.prototype.insertRom = function (rom) {
	    var interpreter = this;
	    rom_loading.load_rom(rom, function (instructions) {
	        interpreter.loadInstructions(instructions);
	    });
	};

	/**
	 * Load the given numeric instructions into memory
	 * @param {Array} instructions - List of numeric instructions
	 */
	Interpreter.prototype.loadInstructions = function (instructions) {
	    for(var i = 0; i < instructions.length; i += 1) {
	        var instructionAddress = PROGRAM_ADDRESS + i;
	        var instruction = instructions[i];

	        this.RAM[instructionAddress] = instruction;
	    }
	};

	/**
	 * Step through one instruction cycle
	 */
	Interpreter.prototype.step = function() {
	    // Fetch instruction
	    log.debug("Fetching next instruction @ 0x" + this.PC.toString(16));
	    var rawInstruction = this.RAM[this.PC];
	    // Decode instruction
	    var decodedInstruction = this.decodeInstruction(rawInstruction);
	    // Execute instruction
	    if(decodedInstruction !== null) {
	        decodedInstruction();
	    }
	    // Increase program counter
	    this.PC += 1;
	};


	/**
	 * Decode a numeric instruction into a lambda containing the needed
	 * interpreter function with the necessary parameters embedded in the
	 * closure.
	 * @param {Number} rawInstruction - Numeric representation of an instruction
	 */
	Interpreter.prototype.decodeInstruction = function(rawInstruction) {
	    var hexString = disassembly.instructionToHexString(rawInstruction);

	    for(var propertyName in disassembly.INSTRUCTION_MAP) {
	        if(disassembly.INSTRUCTION_MAP.hasOwnProperty(propertyName)) {
	            var instructionRe = propertyName;
	            var matchResult = hexString.match(instructionRe);
	            if(matchResult !== null) {
	                var instructionGenerator = 
	                    disassembly.INSTRUCTION_MAP[instructionRe];
	                return instructionGenerator(this, matchResult);
	            }
	        }
	    }

	    log.warn("Invalid instruction: 0x", hexString);
	    return null;
	};

	Interpreter.prototype.getPixel = function (x, y) {
	    return this.display[(64 * y) + x];
	};

	Interpreter.prototype.setPixel = function (x, y, value) {
	    this.display[(64 * y) + x] = value;
	};

	Interpreter.prototype.pushStack = function (value) {
	    this.SP += 1;
	    this.stack[this.SP] = value;
	};

	Interpreter.prototype.popStack = function () {
	    value = this.stack[this.SP];
	    this.SP -= 1;
	    return value;
	};

	Interpreter.prototype.clearDisplay = function () {
	    log.debug("Clearing display");
	    for(var i = 0; i < this.display.length; i += 1) {
	        this.display[i] = 0;
	    }
	};

	Interpreter.prototype.subroutineReturn = function () {
	    log.debug("Returning from subroutine");
	    this.PC = this.popStack();
	};

	Interpreter.prototype.jump = function (jumpAddress) {
	    log.debug("Jumping to 0x", jumpAddress.toString(16));
	    this.PC = jumpAddress - 1;
	};

	Interpreter.prototype.call = function (callAddress) {
	    log.debug("Calling subroutine at 0x", callAddress.toString(16));
	    this.pushStack(this.PC);
	    this.PC = callAddress;
	};

	Interpreter.prototype.skipEqualImmediate = function (
	      registerNumber,
	      immediateValue
	    ) {
	    log.debug("Skip Equal Immediate");

	    var shouldSkip = this.registers[registerNumber] == immediateValue;
	    if(shouldSkip) {
	        log.debug(
	            'Register V',
	            registerNumber.toString(16),
	            ' equals ',
	            immediateValue.toString(16),
	            ' - skipping next instruction'
	        )
	        this.PC += 1;
	    } else {
	        log.debug(
	            'Register V',
	            registerNumber.toString(16),
	            ' does not equal ',
	            immediateValue.toString(16),
	            ' - not skipping next instruction'
	        )
	    }
	}

	Interpreter.prototype.skipNotEqualImmediate = function (
	      registerNumber,
	      immediateValue
	    ) {
	    log.debug("Skip Not Equal Immediate");

	    var shouldSkip = this.registers[registerNumber] != immediateValue;
	    if(shouldSkip) {
	        log.debug(
	            'Register V',
	            registerNumber.toString(16),
	            ' does not equal ',
	            immediateValue.toString(16),
	            ' - skipping next instruction'
	        )
	        this.PC += 1;
	    } else {
	        console.log(
	            'Register V'
	            + registerNumber.toString(16)
	            + ' equals '
	            + immediateValue.toString(16)
	            + ' - not skipping next instruction'
	        )
	    }
	}

	Interpreter.prototype.skipEqual = function (
	      registerNumberX,
	      registerNumberY
	  ) {
	    console.log("Skip Equal");

	    var registerXValue = this.registers[registerNumberX];
	    var registerYValue = this.registers[registerNumberY];
	    var shouldSkip = registerXValue === registerYValue;

	    if(shouldSkip) {
	        console.log(
	            'Register V'
	            + registerNumberX.toString(16)
	            + ' equals '
	            + 'Register V'
	            + registerNumberY.toString(16)
	            + ' - skipping next instruction'
	        );
	        this.PC += 1;
	    } else {
	        console.log(
	            'Register V'
	            + registerNumberX.toString(16)
	            + ' does not equal '
	            + 'Register V'
	            + registerNumberY.toString(16)
	            + ' - not skipping next instruction'
	        );
	    }
	}

	Interpreter.prototype.loadRegisterImmediate = function (
	        registerNumber,
	        immediateValue
	    ) {
	    console.log(
	        "Loading value 0x"
	        + immediateValue.toString(16)
	        + " into register V"
	        + registerNumber
	    )
	    this.registers[registerNumber] = immediateValue;
	};

	Interpreter.prototype.addRegisterImmediate = function (
	        registerNumber,
	        immediateValue
	    ) {
	    console.log(
	        "Adding value 0x"
	        + immediateValue.toString(16)
	        + " to register V"
	        + registerNumber
	    )
	    this.registers[registerNumber] += immediateValue;
	};

	Interpreter.prototype.loadRegister = function (
	        registerNumberX,
	        registerNumberY
	    ) {
	    console.log(
	        "Loading the value of register V"
	        + registerNumberY
	        + " into register V"
	        + registerNumberX
	    )
	    var registerYValue = this.registers[registerNumberY]
	    this.registers[registerNumberX] = registerYValue;
	};

	Interpreter.prototype.orRegister = function (
	        registerNumberX,
	        registerNumberY
	    ) {
	    console.log(
	        "ORing the value of register V"
	        + registerNumberY
	        + " into register V"
	        + registerNumberX
	    )
	    var registerXValue = this.registers[registerNumberX]
	    var registerYValue = this.registers[registerNumberY]
	    this.registers[registerNumberX] = registerYValue | registerXValue;
	};

	Interpreter.prototype.andRegister = function (
	        registerNumberX,
	        registerNumberY
	    ) {
	    console.log(
	        "ANDing the value of register V"
	        + registerNumberY
	        + " into register V"
	        + registerNumberX
	    )
	    var registerXValue = this.registers[registerNumberX]
	    var registerYValue = this.registers[registerNumberY]
	    this.registers[registerNumberX] = registerYValue & registerXValue;
	};

	Interpreter.prototype.xorRegister = function (
	        registerNumberX,
	        registerNumberY
	    ) {
	    console.log(
	        "XORing the value of register V"
	        + registerNumberY
	        + " into register V"
	        + registerNumberX
	    )
	    var registerXValue = this.registers[registerNumberX]
	    var registerYValue = this.registers[registerNumberY]
	    this.registers[registerNumberX] = registerYValue ^ registerXValue;
	};


	module.exports = {
	    Interpreter: Interpreter,
	};


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/*
	* loglevel - https://github.com/pimterry/loglevel
	*
	* Copyright (c) 2013 Tim Perry
	* Licensed under the MIT license.
	*/
	(function (root, definition) {
	    "use strict";
	    if (true) {
	        !(__WEBPACK_AMD_DEFINE_FACTORY__ = (definition), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else if (typeof module === 'object' && module.exports) {
	        module.exports = definition();
	    } else {
	        root.log = definition();
	    }
	}(this, function () {
	    "use strict";
	    var noop = function() {};
	    var undefinedType = "undefined";

	    function realMethod(methodName) {
	        if (typeof console === undefinedType) {
	            return false; // We can't build a real method without a console to log to
	        } else if (console[methodName] !== undefined) {
	            return bindMethod(console, methodName);
	        } else if (console.log !== undefined) {
	            return bindMethod(console, 'log');
	        } else {
	            return noop;
	        }
	    }

	    function bindMethod(obj, methodName) {
	        var method = obj[methodName];
	        if (typeof method.bind === 'function') {
	            return method.bind(obj);
	        } else {
	            try {
	                return Function.prototype.bind.call(method, obj);
	            } catch (e) {
	                // Missing bind shim or IE8 + Modernizr, fallback to wrapping
	                return function() {
	                    return Function.prototype.apply.apply(method, [obj, arguments]);
	                };
	            }
	        }
	    }

	    // these private functions always need `this` to be set properly

	    function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
	        return function () {
	            if (typeof console !== undefinedType) {
	                replaceLoggingMethods.call(this, level, loggerName);
	                this[methodName].apply(this, arguments);
	            }
	        };
	    }

	    function replaceLoggingMethods(level, loggerName) {
	        /*jshint validthis:true */
	        for (var i = 0; i < logMethods.length; i++) {
	            var methodName = logMethods[i];
	            this[methodName] = (i < level) ?
	                noop :
	                this.methodFactory(methodName, level, loggerName);
	        }
	    }

	    function defaultMethodFactory(methodName, level, loggerName) {
	        /*jshint validthis:true */
	        return realMethod(methodName) ||
	               enableLoggingWhenConsoleArrives.apply(this, arguments);
	    }

	    var logMethods = [
	        "trace",
	        "debug",
	        "info",
	        "warn",
	        "error"
	    ];

	    function Logger(name, defaultLevel, factory) {
	      var self = this;
	      var currentLevel;
	      var storageKey = "loglevel";
	      if (name) {
	        storageKey += ":" + name;
	      }

	      function persistLevelIfPossible(levelNum) {
	          var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

	          // Use localStorage if available
	          try {
	              window.localStorage[storageKey] = levelName;
	              return;
	          } catch (ignore) {}

	          // Use session cookie as fallback
	          try {
	              window.document.cookie =
	                encodeURIComponent(storageKey) + "=" + levelName + ";";
	          } catch (ignore) {}
	      }

	      function getPersistedLevel() {
	          var storedLevel;

	          try {
	              storedLevel = window.localStorage[storageKey];
	          } catch (ignore) {}

	          if (typeof storedLevel === undefinedType) {
	              try {
	                  var cookie = window.document.cookie;
	                  var location = cookie.indexOf(
	                      encodeURIComponent(storageKey) + "=");
	                  if (location) {
	                      storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
	                  }
	              } catch (ignore) {}
	          }

	          // If the stored level is not valid, treat it as if nothing was stored.
	          if (self.levels[storedLevel] === undefined) {
	              storedLevel = undefined;
	          }

	          return storedLevel;
	      }

	      /*
	       *
	       * Public API
	       *
	       */

	      self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
	          "ERROR": 4, "SILENT": 5};

	      self.methodFactory = factory || defaultMethodFactory;

	      self.getLevel = function () {
	          return currentLevel;
	      };

	      self.setLevel = function (level, persist) {
	          if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
	              level = self.levels[level.toUpperCase()];
	          }
	          if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
	              currentLevel = level;
	              if (persist !== false) {  // defaults to true
	                  persistLevelIfPossible(level);
	              }
	              replaceLoggingMethods.call(self, level, name);
	              if (typeof console === undefinedType && level < self.levels.SILENT) {
	                  return "No console available for logging";
	              }
	          } else {
	              throw "log.setLevel() called with invalid level: " + level;
	          }
	      };

	      self.setDefaultLevel = function (level) {
	          if (!getPersistedLevel()) {
	              self.setLevel(level, false);
	          }
	      };

	      self.enableAll = function(persist) {
	          self.setLevel(self.levels.TRACE, persist);
	      };

	      self.disableAll = function(persist) {
	          self.setLevel(self.levels.SILENT, persist);
	      };

	      // Initialize with the right level
	      var initialLevel = getPersistedLevel();
	      if (initialLevel == null) {
	          initialLevel = defaultLevel == null ? "WARN" : defaultLevel;
	      }
	      self.setLevel(initialLevel, false);
	    }

	    /*
	     *
	     * Package-level API
	     *
	     */

	    var defaultLogger = new Logger();

	    var _loggersByName = {};
	    defaultLogger.getLogger = function getLogger(name) {
	        if (typeof name !== "string" || name === "") {
	          throw new TypeError("You must supply a name when creating a logger.");
	        }

	        var logger = _loggersByName[name];
	        if (!logger) {
	          logger = _loggersByName[name] = new Logger(
	            name, defaultLogger.getLevel(), defaultLogger.methodFactory);
	        }
	        return logger;
	    };

	    // Grab the current global log variable in case of overwrite
	    var _log = (typeof window !== undefinedType) ? window.log : undefined;
	    defaultLogger.noConflict = function() {
	        if (typeof window !== undefinedType &&
	               window.log === defaultLogger) {
	            window.log = _log;
	        }

	        return defaultLogger;
	    };

	    return defaultLogger;
	}));


/***/ },
/* 2 */
/***/ function(module, exports) {

	"use strict";

	/**
	 * Disassembly
	 * Disassemble numeric opcode values
	 * @module disassembly
	 */

	var INSTRUCTION_MAP = {
	    "^00e0$": function (interpreter) {
	        return function () {
	            interpreter.clearDisplay();
	        };
	    },
	    "^00ee$": function (interpreter) {
	        return function () {
	            interpreter.subroutineReturn();
	        };
	    },
	    "^1(...)$": function (interpreter, matchResult) {
	        var jumpAddress = parseInt(matchResult[1], 16);

	        return function () {
	            interpreter.jump(jumpAddress);
	        };
	    },
	    "^2(...)$": function (interpreter, matchResult) {
	        var callAddress = parseInt(matchResult[1], 16);

	        return function () {
	            interpreter.call(callAddress);
	        };
	    },
	    "^3(.)(..)$": function (interpreter, matchResult) {
	        var registerNumber = parseInt(matchResult[1], 16),
	            immediateValue = parseInt(matchResult[2], 16);

	        return function () {
	            interpreter.skipEqualImmediate(registerNumber, immediateValue);
	        };
	    },
	    "^4(.)(..)$": function (interpreter, matchResult) {
	        var registerNumber = parseInt(matchResult[1], 16),
	            immediateValue = parseInt(matchResult[2], 16);

	        return function () {
	            interpreter.skipNotEqualImmediate(registerNumber, immediateValue);
	        };
	    },
	    "^5(.)(.)0$": function (interpreter, matchResult) {
	        var registerNumberX = parseInt(matchResult[1], 16),
	            registerNumberY = parseInt(matchResult[2], 16);

	        return function () {
	            interpreter.skipEqual(
	                registerNumberX,
	                registerNumberY
	            );
	        };
	    },
	    "^6(.)(..)$": function (interpreter, matchResult) {
	        var registerNumber = parseInt(matchResult[1], 16),
	            immediateValue = parseInt(matchResult[2], 16);

	        return function () {
	            interpreter.loadRegisterImmediate(
	                registerNumber,
	                immediateValue
	            );
	        };
	    },
	    "^7(.)(..)$": function (interpreter, matchResult) {
	        var registerNumber = parseInt(matchResult[1], 16),
	            immediateValue = parseInt(matchResult[2], 16);

	        return function () {
	            interpreter.addRegisterImmediate(
	                registerNumber,
	                immediateValue
	            );
	        };
	    },
	    "^8(.)(.)0$": function (interpreter, matchResult) {
	        var registerNumberX = parseInt(matchResult[1], 16),
	            registerNumberY = parseInt(matchResult[2], 16);

	        return function () {
	            interpreter.loadRegister(
	                registerNumberX,
	                registerNumberY
	            );
	        };
	    },
	    "^8(.)(.)1$": function (interpreter, matchResult) {
	        var registerNumberX = parseInt(matchResult[1], 16),
	            registerNumberY = parseInt(matchResult[2], 16);

	        return function () {
	            interpreter.orRegister(
	                registerNumberX,
	                registerNumberY
	            );
	        };
	    },
	    "^8(.)(.)2$": function (interpreter, matchResult) {
	        var registerNumberX = parseInt(matchResult[1], 16),
	            registerNumberY = parseInt(matchResult[2], 16);

	        return function () {
	            interpreter.andRegister(
	                registerNumberX,
	                registerNumberY
	            );
	        };
	    },
	    "^8(.)(.)3$": function (interpreter, matchResult) {
	        var registerNumberX = parseInt(matchResult[1], 16),
	            registerNumberY = parseInt(matchResult[2], 16);

	        return function () {
	            interpreter.xorRegister(
	                registerNumberX,
	                registerNumberY
	            );
	        };
	    }
	};


	/**
	 * Transform integer opcodes into zero-padded 4 character hex strings
	 * @param {number} instruction - Numeric opcode value
	 */
	function instructionToHexString(instruction) {
	    var hexString = instruction.toString(16),
	        numberMissingChars = 4 - hexString.length;
	    for (var i = 0; i < numberMissingChars; i += 1) {
	        hexString = "0" + hexString;
	    }
	    return hexString;
	}


	module.exports = {
	    INSTRUCTION_MAP: INSTRUCTION_MAP,
	    instructionToHexString: instructionToHexString
	};


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	/**
	 * ROM Loading
	 * Load binary rom file and decode it into an array of integer opcode values
	 * @module rom_loading
	 */

	var jBinary = __webpack_require__(4);

	var TYPESET = {
	  "jBinary.all": ['array', 'uint16'],
	}


	/**
	 * Load and decode the given ROM binary and return a list of numeric
	 * instructions
	 * @param {File || string} rom - A File Object containing the ROM data or
	 *     a URL to such a file.
	 * @param {function} callback - Callback which will be called with the
	 *     disassembled data
	 */
	function load_rom(rom, callback) {
	    jBinary.load(rom, TYPESET, function (err, binary) {
	        var instructions = binary.readAll();
	        if(err) {
	            callback(null);
	        } else {
	            callback(instructions);
	        }
	    });
	}

	module.exports = {
	    load_rom: load_rom
	};


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	!function(a){var b=this; true?module.exports=a(b,__webpack_require__(5)):"function"==typeof define&&define.amd?define(["jdataview"],function(c){return a(b,c)}):b.jBinary=a(b,b.jDataView)}(function(a,b){"use strict";function c(a,b){return b&&a instanceof b}function d(a){for(var b=1,c=arguments.length;c>b;++b){var d=arguments[b];for(var e in d)void 0!==d[e]&&(a[e]=d[e])}return a}function e(a){return arguments[0]=m(a),d.apply(null,arguments)}function f(a,b,d){return c(d,Function)?d.call(a,b.contexts[0]):d}function g(a){return function(){var b=arguments,d=b.length-1,e=a.length-1,f=b[d];if(b.length=e+1,!c(f,Function)){var g=this;return new l(function(c,d){b[e]=function(a,b){return a?d(a):c(b)},a.apply(g,b)})}b[d]=void 0,b[e]=f,a.apply(this,b)}}function h(a,d){return c(a,h)?a.as(d):(c(a,b)||(a=new b(a,void 0,void 0,d?d["jBinary.littleEndian"]:void 0)),c(this,h)?(this.view=a,this.view.seek(0),this.contexts=[],this.as(d,!0)):new h(a,d))}function i(a){return e(i.prototype,a)}function j(a){return e(j.prototype,a,{createProperty:function(){var b=(a.createProperty||j.prototype.createProperty).apply(this,arguments);return b.getBaseType&&(b.baseType=b.binary.getType(b.getBaseType(b.binary.contexts[0]))),b}})}var k=a.document;"atob"in a&&"btoa"in a||!function(){function b(a){var b,c,e,f,g,h;for(e=a.length,c=0,b="";e>c;){if(f=255&a.charCodeAt(c++),c==e){b+=d.charAt(f>>2),b+=d.charAt((3&f)<<4),b+="==";break}if(g=a.charCodeAt(c++),c==e){b+=d.charAt(f>>2),b+=d.charAt((3&f)<<4|(240&g)>>4),b+=d.charAt((15&g)<<2),b+="=";break}h=a.charCodeAt(c++),b+=d.charAt(f>>2),b+=d.charAt((3&f)<<4|(240&g)>>4),b+=d.charAt((15&g)<<2|(192&h)>>6),b+=d.charAt(63&h)}return b}function c(a){var b,c,d,f,g,h,i;for(h=a.length,g=0,i="";h>g;){do b=e[255&a.charCodeAt(g++)];while(h>g&&-1==b);if(-1==b)break;do c=e[255&a.charCodeAt(g++)];while(h>g&&-1==c);if(-1==c)break;i+=String.fromCharCode(b<<2|(48&c)>>4);do{if(d=255&a.charCodeAt(g++),61==d)return i;d=e[d]}while(h>g&&-1==d);if(-1==d)break;i+=String.fromCharCode((15&c)<<4|(60&d)>>2);do{if(f=255&a.charCodeAt(g++),61==f)return i;f=e[f]}while(h>g&&-1==f);if(-1==f)break;i+=String.fromCharCode((3&d)<<6|f)}return i}var d="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",e=[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,-1,-1,-1,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,-1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1];a.btoa||(a.btoa=b),a.atob||(a.atob=c)}();var l=a.Promise||function(a){this.then=a},m=Object.create;m||(m=function(a){var b=function(){};return b.prototype=a,new b});var n=h.prototype,o=n.typeSet={};n.toValue=function(a){return f(this,this,a)},n._named=function(a,b,c){return a.displayName=b+" @ "+(void 0!==c?c:this.view.tell()),a};var p=Object.defineProperty;if(p)try{p({},"x",{})}catch(q){p=void 0}else p=function(a,b,c,d){d&&(a[b]=c.value)};var r="jBinary.Cache",s=0;n._getCached=function(a,b,c){if(a.hasOwnProperty(this.cacheKey))return a[this.cacheKey];var d=b.call(this,a);return p(a,this.cacheKey,{value:d},c),d},n.getContext=function(a){switch(typeof a){case"undefined":a=0;case"number":return this.contexts[a];case"string":return this.getContext(function(b){return a in b});case"function":for(var b=0,c=this.contexts.length;c>b;b++){var d=this.contexts[b];if(a.call(this,d))return d}}},n.inContext=function(a,b){this.contexts.unshift(a);var c=b.call(this);return this.contexts.shift(),c},i.prototype={inherit:function(a,b){function c(a,b){var c=f[a];c&&(d||(d=e(f)),b.call(d,c),d[a]=null)}var d,f=this;return c("params",function(b){for(var c=0,d=b.length;d>c;c++)this[b[c]]=a[c]}),c("setParams",function(b){b.apply(this,a)}),c("typeParams",function(a){for(var c=0,d=a.length;d>c;c++){var e=a[c],f=this[e];f&&(this[e]=b(f))}}),c("resolve",function(a){a.call(this,b)}),d||f},createProperty:function(a){return e(this,{binary:a,view:a.view})},toValue:function(a,b){return b!==!1&&"string"==typeof a?this.binary.getContext(a)[a]:f(this,this.binary,a)}},h.Type=i,j.prototype=e(i.prototype,{setParams:function(){this.baseType&&(this.typeParams=["baseType"].concat(this.typeParams||[]))},baseRead:function(){return this.binary.read(this.baseType)},baseWrite:function(a){return this.binary.write(this.baseType,a)}}),d(j.prototype,{read:j.prototype.baseRead,write:j.prototype.baseWrite}),h.Template=j,n.as=function(a,b){var c=b?this:e(this);return a=a||o,c.typeSet=a===o||o.isPrototypeOf(a)?a:e(o,a),c.cacheKey=r,c.cacheKey=c._getCached(a,function(){return r+"."+ ++s},!0),c},n.seek=function(a,b){if(a=this.toValue(a),void 0!==b){var c=this.view.tell();this.view.seek(a);var d=b.call(this);return this.view.seek(c),d}return this.view.seek(a)},n.tell=function(){return this.view.tell()},n.skip=function(a,b){return this.seek(this.tell()+this.toValue(a),b)},n.slice=function(a,b,c){return new h(this.view.slice(a,b,c),this.typeSet)},n._getType=function(a,b){switch(typeof a){case"string":if(!(a in this.typeSet))throw new ReferenceError("Unknown type: "+a);return this._getType(this.typeSet[a],b);case"number":return this._getType(o.bitfield,[a]);case"object":if(c(a,i)){var d=this;return a.inherit(b||[],function(a){return d.getType(a)})}return c(a,Array)?this._getCached(a,function(a){return this.getType(a[0],a.slice(1))},!0):this._getCached(a,function(a){return this.getType(o.object,[a])},!1)}},n.getType=function(a,b){var d=this._getType(a,b);return d&&!c(a,i)&&(d.name="object"==typeof a?c(a,Array)?a[0]+"("+a.slice(1).join(", ")+")":"object":String(a)),d},n._action=function(a,b,c){if(void 0!==a){a=this.getType(a);var d=this._named(function(){return c.call(this,a.createProperty(this),this.contexts[0])},"["+a.name+"]",b);return void 0!==b?this.seek(b,d):d.call(this)}},n.read=function(a,b){return this._action(a,b,function(a,b){return a.read(b)})},n.readAll=function(){return this.read("jBinary.all",0)},n.write=function(a,b,c){return this._action(a,c,function(a,c){var d=this.tell();return a.write(b,c),this.tell()-d})},n.writeAll=function(a){return this.write("jBinary.all",a,0)},function(a,b){for(var c=0,d=b.length;d>c;c++){var f=b[c];o[f.toLowerCase()]=e(a,{dataType:f})}}(i({params:["littleEndian"],read:function(){return this.view["get"+this.dataType](void 0,this.littleEndian)},write:function(a){this.view["write"+this.dataType](a,this.littleEndian)}}),["Uint8","Uint16","Uint32","Uint64","Int8","Int16","Int32","Int64","Float32","Float64","Char"]),d(o,{"byte":o.uint8,"float":o.float32,"double":o.float64}),o.array=j({params:["baseType","length"],read:function(){var a=this.toValue(this.length);if(this.baseType===o.uint8)return this.view.getBytes(a,void 0,!0,!0);var b;if(void 0!==a){b=new Array(a);for(var c=0;a>c;c++)b[c]=this.baseRead()}else{var d=this.view.byteLength;for(b=[];this.binary.tell()<d;)b.push(this.baseRead())}return b},write:function(a){if(this.baseType===o.uint8)return this.view.writeBytes(a);for(var b=0,c=a.length;c>b;b++)this.baseWrite(a[b])}}),o.binary=j({params:["length","typeSet"],read:function(){var a=this.binary.tell(),b=this.binary.skip(this.toValue(this.length)),c=this.view.slice(a,b);return new h(c,this.typeSet)},write:function(a){this.binary.write("blob",a.read("blob",0))}}),o.bitfield=i({params:["bitSize"],read:function(){return this.view.getUnsigned(this.bitSize)},write:function(a){this.view.writeUnsigned(a,this.bitSize)}}),o.blob=i({params:["length"],read:function(){return this.view.getBytes(this.toValue(this.length))},write:function(a){this.view.writeBytes(a,!0)}}),o["const"]=j({params:["baseType","value","strict"],read:function(){var a=this.baseRead();if(this.strict&&a!==this.value){if(c(this.strict,Function))return this.strict(a);throw new TypeError("Unexpected value ("+a+" !== "+this.value+").")}return a},write:function(a){this.baseWrite(this.strict||void 0===a?this.value:a)}}),o["enum"]=j({params:["baseType","matches"],setParams:function(a,b){this.backMatches={};for(var c in b)this.backMatches[b[c]]=c},read:function(){var a=this.baseRead();return a in this.matches?this.matches[a]:a},write:function(a){this.baseWrite(a in this.backMatches?this.backMatches[a]:a)}}),o.extend=i({setParams:function(){this.parts=arguments},resolve:function(a){for(var b=this.parts,c=b.length,d=new Array(c),e=0;c>e;e++)d[e]=a(b[e]);this.parts=d},read:function(){var a=this.parts,b=this.binary.read(a[0]);return this.binary.inContext(b,function(){for(var c=1,e=a.length;e>c;c++)d(b,this.read(a[c]))}),b},write:function(a){var b=this.parts;this.binary.inContext(a,function(){for(var c=0,d=b.length;d>c;c++)this.write(b[c],a)})}}),o["if"]=j({params:["condition","trueType","falseType"],typeParams:["trueType","falseType"],getBaseType:function(){return this.toValue(this.condition)?this.trueType:this.falseType}}),o.if_not=o.ifNot=j({setParams:function(a,b,c){this.baseType=["if",a,c,b]}}),o.lazy=j({marker:"jBinary.Lazy",params:["innerType","length"],getBaseType:function(){return["binary",this.length,this.binary.typeSet]},read:function(){var a=function(b){return 0===arguments.length?"value"in a?a.value:a.value=a.binary.read(a.innerType):d(a,{wasChanged:!0,value:b}).value};return a[this.marker]=!0,d(a,{binary:d(this.baseRead(),{contexts:this.binary.contexts.slice()}),innerType:this.innerType})},write:function(a){a.wasChanged||!a[this.marker]?this.binary.write(this.innerType,a()):this.baseWrite(a.binary)}}),o.object=i({params:["structure","proto"],resolve:function(a){var b={};for(var d in this.structure)b[d]=c(this.structure[d],Function)?this.structure[d]:a(this.structure[d]);this.structure=b},read:function(){var a=this,b=this.structure,d=this.proto?e(this.proto):{};return this.binary.inContext(d,function(){for(var e in b)this._named(function(){var f=c(b[e],Function)?b[e].call(a,d):this.read(b[e]);void 0!==f&&(d[e]=f)},e).call(this)}),d},write:function(a){var b=this,d=this.structure;this.binary.inContext(a,function(){for(var e in d)this._named(function(){c(d[e],Function)?a[e]=d[e].call(b,a):this.write(d[e],a[e])},e).call(this)})}}),o.skip=i({params:["length"],read:function(){this.view.skip(this.toValue(this.length))},write:function(){this.read()}}),o.string=j({params:["length","encoding"],read:function(){return this.view.getString(this.toValue(this.length),void 0,this.encoding)},write:function(a){this.view.writeString(a,this.encoding)}}),o.string0=i({params:["length","encoding"],read:function(){var a=this.view,b=this.length;if(void 0===b){var c,d=a.tell(),e=0;for(b=a.byteLength-d;b>e&&(c=a.getUint8());)e++;var f=a.getString(e,d,this.encoding);return b>e&&a.skip(1),f}return a.getString(b,void 0,this.encoding).replace(/\0.*$/,"")},write:function(a){var b=this.view,c=void 0===this.length?1:this.length-a.length;b.writeString(a,void 0,this.encoding),c>0&&(b.writeUint8(0),b.skip(c-1))}});h.loadData=g(function(b,d){var e;if(c(b,a.Blob)){var f;if("FileReader"in a)f=new FileReader,f.onload=f.onerror=function(){d(this.error,this.result)},f.readAsArrayBuffer(b);else{f=new FileReaderSync;var g,h;try{h=f.readAsArrayBuffer(b)}catch(i){g=i}finally{d(g,h)}}}else{if("string"!=typeof b)d(new TypeError("Unsupported source type."));else if(e=b.match(/^data:(.+?)(;base64)?,(.*)$/))try{var j=e[2],k=e[3];d(null,(j?atob:decodeURIComponent)(k))}catch(i){d(i)}else if("XMLHttpRequest"in a){var l=new XMLHttpRequest;l.open("GET",b,!0),"responseType"in l?l.responseType="arraybuffer":"overrideMimeType"in l?l.overrideMimeType("text/plain; charset=x-user-defined"):l.setRequestHeader("Accept-Charset","x-user-defined"),"onload"in l||(l.onreadystatechange=function(){4===this.readyState&&this.onload()});var m=function(a){d(new Error(a))};l.onload=function(){return 0!==this.status&&200!==this.status?m("HTTP Error #"+this.status+": "+this.statusText):("response"in this||(this.response=new VBArray(this.responseBody).toArray()),void d(null,this.response))},l.onerror=function(){m("Network error.")},l.send(null)}else d(new TypeError("Unsupported source type."))}}),h.load=g(function(a,b,c){var d=h.loadData(a);h.load.getTypeSet(a,b,function(a){d.then(function(b){c(null,new h(b,a))},c)})}),h.load.getTypeSet=function(a,b,c){c(b)},n._toURI="URL"in a&&"createObjectURL"in URL?function(a){var b=this.seek(0,function(){return this.view.getBytes()});return URL.createObjectURL(new Blob([b],{type:a}))}:function(a){var b=this.seek(0,function(){return this.view.getString(void 0,void 0,"binary")});return"data:"+a+";base64,"+btoa(b)},n._mimeType=function(a){return a||this.typeSet["jBinary.mimeType"]||"application/octet-stream"},n.toURI=function(a){return this._toURI(this._mimeType(a))};if(k){var t=h.downloader=k.createElement("a");t.style.display="none"}return n.saveAs=g(function(a,b,c){if("string"==typeof a){"msSaveBlob"in navigator?navigator.msSaveBlob(new Blob([this.read("blob",0)],{type:this._mimeType(b)}),a):k?(t.parentNode||k.body.appendChild(t),t.href=this.toURI(b),t.download=a,t.click(),t.href=t.download=""):c(new TypeError("Saving from Web Worker is not supported.")),c()}else c(new TypeError("Unsupported storage type."))}),h});
	//# sourceMappingURL=jbinary.js.map

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {!function(factory) {
	    var global = this;
	    module.exports = factory(global);
	}(function(global) {
	    "use strict";
	    function is(obj, Ctor) {
	        return "object" != typeof obj || null === obj ? !1 : obj.constructor === Ctor || Object.prototype.toString.call(obj) === "[object " + Ctor.name + "]";
	    }
	    function arrayFrom(arrayLike, forceCopy) {
	        return !forceCopy && is(arrayLike, Array) ? arrayLike : Array.prototype.slice.call(arrayLike);
	    }
	    function defined(value, defaultValue) {
	        return void 0 !== value ? value : defaultValue;
	    }
	    function jDataView(buffer, byteOffset, byteLength, littleEndian) {
	        if (jDataView.is(buffer)) {
	            var result = buffer.slice(byteOffset, byteOffset + byteLength);
	            return result._littleEndian = defined(littleEndian, result._littleEndian), result;
	        }
	        if (!jDataView.is(this)) return new jDataView(buffer, byteOffset, byteLength, littleEndian);
	        if (this.buffer = buffer = jDataView.wrapBuffer(buffer), this._isArrayBuffer = compatibility.ArrayBuffer && is(buffer, ArrayBuffer), 
	        this._isPixelData = !1, this._isDataView = compatibility.DataView && this._isArrayBuffer, 
	        this._isNodeBuffer = !0 && compatibility.NodeBuffer && is(buffer, Buffer), !this._isNodeBuffer && !this._isArrayBuffer && !is(buffer, Array)) throw new TypeError("jDataView buffer has an incompatible type");
	        this._littleEndian = !!littleEndian;
	        var bufferLength = "byteLength" in buffer ? buffer.byteLength : buffer.length;
	        this.byteOffset = byteOffset = defined(byteOffset, 0), this.byteLength = byteLength = defined(byteLength, bufferLength - byteOffset), 
	        this._offset = this._bitOffset = 0, this._isDataView ? this._view = new DataView(buffer, byteOffset, byteLength) : this._checkBounds(byteOffset, byteLength, bufferLength), 
	        this._engineAction = this._isDataView ? this._dataViewAction : this._isNodeBuffer ? this._nodeBufferAction : this._isArrayBuffer ? this._arrayBufferAction : this._arrayAction;
	    }
	    function getCharCodes(string) {
	        if (compatibility.NodeBuffer) return new Buffer(string, "binary");
	        for (var Type = compatibility.ArrayBuffer ? Uint8Array : Array, codes = new Type(string.length), i = 0, length = string.length; length > i; i++) codes[i] = 255 & string.charCodeAt(i);
	        return codes;
	    }
	    function pow2(n) {
	        return n >= 0 && 31 > n ? 1 << n : pow2[n] || (pow2[n] = Math.pow(2, n));
	    }
	    function Uint64(lo, hi) {
	        this.lo = lo, this.hi = hi;
	    }
	    function Int64() {
	        Uint64.apply(this, arguments);
	    }
	    var compatibility = {
	        NodeBuffer: !0 && "Buffer" in global,
	        DataView: "DataView" in global,
	        ArrayBuffer: "ArrayBuffer" in global,
	        PixelData: !1
	    }, TextEncoder = global.TextEncoder, TextDecoder = global.TextDecoder;
	    compatibility.NodeBuffer && !function(buffer) {
	        try {
	            buffer.writeFloatLE(1/0, 0);
	        } catch (e) {
	            compatibility.NodeBuffer = !1;
	        }
	    }(new Buffer(4));
	    var dataTypes = {
	        Int8: 1,
	        Int16: 2,
	        Int32: 4,
	        Uint8: 1,
	        Uint16: 2,
	        Uint32: 4,
	        Float32: 4,
	        Float64: 8
	    };
	    jDataView.wrapBuffer = function(buffer) {
	        switch (typeof buffer) {
	          case "number":
	            if (compatibility.NodeBuffer) buffer = new Buffer(buffer), buffer.fill(0); else if (compatibility.ArrayBuffer) buffer = new Uint8Array(buffer).buffer; else {
	                buffer = new Array(buffer);
	                for (var i = 0; i < buffer.length; i++) buffer[i] = 0;
	            }
	            return buffer;

	          case "string":
	            buffer = getCharCodes(buffer);

	          default:
	            return "length" in buffer && !(compatibility.NodeBuffer && is(buffer, Buffer) || compatibility.ArrayBuffer && is(buffer, ArrayBuffer)) && (compatibility.NodeBuffer ? buffer = new Buffer(buffer) : compatibility.ArrayBuffer ? is(buffer, ArrayBuffer) || (buffer = new Uint8Array(buffer).buffer, 
	            is(buffer, ArrayBuffer) || (buffer = new Uint8Array(arrayFrom(buffer, !0)).buffer)) : buffer = arrayFrom(buffer)), 
	            buffer;
	        }
	    }, jDataView.is = function(view) {
	        return view && view.jDataView;
	    }, jDataView.from = function() {
	        return new jDataView(arguments);
	    }, jDataView.Uint64 = Uint64, Uint64.prototype = {
	        valueOf: function() {
	            return this.lo + pow2(32) * this.hi;
	        },
	        toString: function() {
	            return Number.prototype.toString.apply(this.valueOf(), arguments);
	        }
	    }, Uint64.fromNumber = function(number) {
	        var hi = Math.floor(number / pow2(32)), lo = number - hi * pow2(32);
	        return new Uint64(lo, hi);
	    }, jDataView.Int64 = Int64, Int64.prototype = "create" in Object ? Object.create(Uint64.prototype) : new Uint64(), 
	    Int64.prototype.valueOf = function() {
	        return this.hi < pow2(31) ? Uint64.prototype.valueOf.apply(this, arguments) : -(pow2(32) - this.lo + pow2(32) * (pow2(32) - 1 - this.hi));
	    }, Int64.fromNumber = function(number) {
	        var lo, hi;
	        if (number >= 0) {
	            var unsigned = Uint64.fromNumber(number);
	            lo = unsigned.lo, hi = unsigned.hi;
	        } else hi = Math.floor(number / pow2(32)), lo = number - hi * pow2(32), hi += pow2(32);
	        return new Int64(lo, hi);
	    };
	    var proto = jDataView.prototype = {
	        compatibility: compatibility,
	        jDataView: !0,
	        _checkBounds: function(byteOffset, byteLength, maxLength) {
	            if ("number" != typeof byteOffset) throw new TypeError("Offset is not a number.");
	            if ("number" != typeof byteLength) throw new TypeError("Size is not a number.");
	            if (0 > byteLength) throw new RangeError("Length is negative.");
	            if (0 > byteOffset || byteOffset + byteLength > defined(maxLength, this.byteLength)) throw new RangeError("Offsets are out of bounds.");
	        },
	        _action: function(type, isReadAction, byteOffset, littleEndian, value) {
	            return this._engineAction(type, isReadAction, defined(byteOffset, this._offset), defined(littleEndian, this._littleEndian), value);
	        },
	        _dataViewAction: function(type, isReadAction, byteOffset, littleEndian, value) {
	            return this._offset = byteOffset + dataTypes[type], isReadAction ? this._view["get" + type](byteOffset, littleEndian) : this._view["set" + type](byteOffset, value, littleEndian);
	        },
	        _arrayBufferAction: function(type, isReadAction, byteOffset, littleEndian, value) {
	            var typedArray, size = dataTypes[type], TypedArray = global[type + "Array"];
	            if (littleEndian = defined(littleEndian, this._littleEndian), 1 === size || (this.byteOffset + byteOffset) % size === 0 && littleEndian) return typedArray = new TypedArray(this.buffer, this.byteOffset + byteOffset, 1), 
	            this._offset = byteOffset + size, isReadAction ? typedArray[0] : typedArray[0] = value;
	            var bytes = new Uint8Array(isReadAction ? this.getBytes(size, byteOffset, littleEndian, !0) : size);
	            return typedArray = new TypedArray(bytes.buffer, 0, 1), isReadAction ? typedArray[0] : (typedArray[0] = value, 
	            void this._setBytes(byteOffset, bytes, littleEndian));
	        },
	        _arrayAction: function(type, isReadAction, byteOffset, littleEndian, value) {
	            return isReadAction ? this["_get" + type](byteOffset, littleEndian) : this["_set" + type](byteOffset, value, littleEndian);
	        },
	        _getBytes: function(length, byteOffset, littleEndian) {
	            littleEndian = defined(littleEndian, this._littleEndian), byteOffset = defined(byteOffset, this._offset), 
	            length = defined(length, this.byteLength - byteOffset), this._checkBounds(byteOffset, length), 
	            byteOffset += this.byteOffset, this._offset = byteOffset - this.byteOffset + length;
	            var result = this._isArrayBuffer ? new Uint8Array(this.buffer, byteOffset, length) : (this.buffer.slice || Array.prototype.slice).call(this.buffer, byteOffset, byteOffset + length);
	            return littleEndian || 1 >= length ? result : arrayFrom(result).reverse();
	        },
	        getBytes: function(length, byteOffset, littleEndian, toArray) {
	            var result = this._getBytes(length, byteOffset, defined(littleEndian, !0));
	            return toArray ? arrayFrom(result) : result;
	        },
	        _setBytes: function(byteOffset, bytes, littleEndian) {
	            var length = bytes.length;
	            if (0 !== length) {
	                if (littleEndian = defined(littleEndian, this._littleEndian), byteOffset = defined(byteOffset, this._offset), 
	                this._checkBounds(byteOffset, length), !littleEndian && length > 1 && (bytes = arrayFrom(bytes, !0).reverse()), 
	                byteOffset += this.byteOffset, this._isArrayBuffer) new Uint8Array(this.buffer, byteOffset, length).set(bytes); else if (this._isNodeBuffer) new Buffer(bytes).copy(this.buffer, byteOffset); else for (var i = 0; length > i; i++) this.buffer[byteOffset + i] = bytes[i];
	                this._offset = byteOffset - this.byteOffset + length;
	            }
	        },
	        setBytes: function(byteOffset, bytes, littleEndian) {
	            this._setBytes(byteOffset, bytes, defined(littleEndian, !0));
	        },
	        getString: function(byteLength, byteOffset, encoding) {
	            if (this._isNodeBuffer) return byteOffset = defined(byteOffset, this._offset), byteLength = defined(byteLength, this.byteLength - byteOffset), 
	            this._checkBounds(byteOffset, byteLength), this._offset = byteOffset + byteLength, 
	            this.buffer.toString(encoding || "binary", this.byteOffset + byteOffset, this.byteOffset + this._offset);
	            var bytes = this._getBytes(byteLength, byteOffset, !0);
	            if (encoding = "utf8" === encoding ? "utf-8" : encoding || "binary", TextDecoder && "binary" !== encoding) return new TextDecoder(encoding).decode(this._isArrayBuffer ? bytes : new Uint8Array(bytes));
	            var string = "";
	            byteLength = bytes.length;
	            for (var i = 0; byteLength > i; i++) string += String.fromCharCode(bytes[i]);
	            return "utf-8" === encoding && (string = decodeURIComponent(escape(string))), string;
	        },
	        setString: function(byteOffset, subString, encoding) {
	            if (this._isNodeBuffer) return byteOffset = defined(byteOffset, this._offset), this._checkBounds(byteOffset, subString.length), 
	            void (this._offset = byteOffset + this.buffer.write(subString, this.byteOffset + byteOffset, encoding || "binary"));
	            encoding = "utf8" === encoding ? "utf-8" : encoding || "binary";
	            var bytes;
	            TextEncoder && "binary" !== encoding ? bytes = new TextEncoder(encoding).encode(subString) : ("utf-8" === encoding && (subString = unescape(encodeURIComponent(subString))), 
	            bytes = getCharCodes(subString)), this._setBytes(byteOffset, bytes, !0);
	        },
	        getChar: function(byteOffset) {
	            return this.getString(1, byteOffset);
	        },
	        setChar: function(byteOffset, character) {
	            this.setString(byteOffset, character);
	        },
	        tell: function() {
	            return this._offset;
	        },
	        seek: function(byteOffset) {
	            return this._checkBounds(byteOffset, 0), this._offset = byteOffset;
	        },
	        skip: function(byteLength) {
	            return this.seek(this._offset + byteLength);
	        },
	        slice: function(start, end, forceCopy) {
	            function normalizeOffset(offset, byteLength) {
	                return 0 > offset ? offset + byteLength : offset;
	            }
	            return start = normalizeOffset(start, this.byteLength), end = normalizeOffset(defined(end, this.byteLength), this.byteLength), 
	            forceCopy ? new jDataView(this.getBytes(end - start, start, !0, !0), void 0, void 0, this._littleEndian) : new jDataView(this.buffer, this.byteOffset + start, end - start, this._littleEndian);
	        },
	        alignBy: function(byteCount) {
	            return this._bitOffset = 0, 1 !== defined(byteCount, 1) ? this.skip(byteCount - (this._offset % byteCount || byteCount)) : this._offset;
	        },
	        _getFloat64: function(byteOffset, littleEndian) {
	            var b = this._getBytes(8, byteOffset, littleEndian), sign = 1 - 2 * (b[7] >> 7), exponent = ((b[7] << 1 & 255) << 3 | b[6] >> 4) - 1023, mantissa = (15 & b[6]) * pow2(48) + b[5] * pow2(40) + b[4] * pow2(32) + b[3] * pow2(24) + b[2] * pow2(16) + b[1] * pow2(8) + b[0];
	            return 1024 === exponent ? 0 !== mantissa ? 0/0 : 1/0 * sign : -1023 === exponent ? sign * mantissa * pow2(-1074) : sign * (1 + mantissa * pow2(-52)) * pow2(exponent);
	        },
	        _getFloat32: function(byteOffset, littleEndian) {
	            var b = this._getBytes(4, byteOffset, littleEndian), sign = 1 - 2 * (b[3] >> 7), exponent = (b[3] << 1 & 255 | b[2] >> 7) - 127, mantissa = (127 & b[2]) << 16 | b[1] << 8 | b[0];
	            return 128 === exponent ? 0 !== mantissa ? 0/0 : 1/0 * sign : -127 === exponent ? sign * mantissa * pow2(-149) : sign * (1 + mantissa * pow2(-23)) * pow2(exponent);
	        },
	        _get64: function(Type, byteOffset, littleEndian) {
	            littleEndian = defined(littleEndian, this._littleEndian), byteOffset = defined(byteOffset, this._offset);
	            for (var parts = littleEndian ? [ 0, 4 ] : [ 4, 0 ], i = 0; 2 > i; i++) parts[i] = this.getUint32(byteOffset + parts[i], littleEndian);
	            return this._offset = byteOffset + 8, new Type(parts[0], parts[1]);
	        },
	        getInt64: function(byteOffset, littleEndian) {
	            return this._get64(Int64, byteOffset, littleEndian);
	        },
	        getUint64: function(byteOffset, littleEndian) {
	            return this._get64(Uint64, byteOffset, littleEndian);
	        },
	        _getInt32: function(byteOffset, littleEndian) {
	            var b = this._getBytes(4, byteOffset, littleEndian);
	            return b[3] << 24 | b[2] << 16 | b[1] << 8 | b[0];
	        },
	        _getUint32: function(byteOffset, littleEndian) {
	            return this._getInt32(byteOffset, littleEndian) >>> 0;
	        },
	        _getInt16: function(byteOffset, littleEndian) {
	            return this._getUint16(byteOffset, littleEndian) << 16 >> 16;
	        },
	        _getUint16: function(byteOffset, littleEndian) {
	            var b = this._getBytes(2, byteOffset, littleEndian);
	            return b[1] << 8 | b[0];
	        },
	        _getInt8: function(byteOffset) {
	            return this._getUint8(byteOffset) << 24 >> 24;
	        },
	        _getUint8: function(byteOffset) {
	            return this._getBytes(1, byteOffset)[0];
	        },
	        _getBitRangeData: function(bitLength, byteOffset) {
	            var startBit = (defined(byteOffset, this._offset) << 3) + this._bitOffset, endBit = startBit + bitLength, start = startBit >>> 3, end = endBit + 7 >>> 3, b = this._getBytes(end - start, start, !0), wideValue = 0;
	            (this._bitOffset = 7 & endBit) && (this._bitOffset -= 8);
	            for (var i = 0, length = b.length; length > i; i++) wideValue = wideValue << 8 | b[i];
	            return {
	                start: start,
	                bytes: b,
	                wideValue: wideValue
	            };
	        },
	        getSigned: function(bitLength, byteOffset) {
	            var shift = 32 - bitLength;
	            return this.getUnsigned(bitLength, byteOffset) << shift >> shift;
	        },
	        getUnsigned: function(bitLength, byteOffset) {
	            var value = this._getBitRangeData(bitLength, byteOffset).wideValue >>> -this._bitOffset;
	            return 32 > bitLength ? value & ~(-1 << bitLength) : value;
	        },
	        _setBinaryFloat: function(byteOffset, value, mantSize, expSize, littleEndian) {
	            var exponent, mantissa, signBit = 0 > value ? 1 : 0, eMax = ~(-1 << expSize - 1), eMin = 1 - eMax;
	            0 > value && (value = -value), 0 === value ? (exponent = 0, mantissa = 0) : isNaN(value) ? (exponent = 2 * eMax + 1, 
	            mantissa = 1) : 1/0 === value ? (exponent = 2 * eMax + 1, mantissa = 0) : (exponent = Math.floor(Math.log(value) / Math.LN2), 
	            exponent >= eMin && eMax >= exponent ? (mantissa = Math.floor((value * pow2(-exponent) - 1) * pow2(mantSize)), 
	            exponent += eMax) : (mantissa = Math.floor(value / pow2(eMin - mantSize)), exponent = 0));
	            for (var b = []; mantSize >= 8; ) b.push(mantissa % 256), mantissa = Math.floor(mantissa / 256), 
	            mantSize -= 8;
	            for (exponent = exponent << mantSize | mantissa, expSize += mantSize; expSize >= 8; ) b.push(255 & exponent), 
	            exponent >>>= 8, expSize -= 8;
	            b.push(signBit << expSize | exponent), this._setBytes(byteOffset, b, littleEndian);
	        },
	        _setFloat32: function(byteOffset, value, littleEndian) {
	            this._setBinaryFloat(byteOffset, value, 23, 8, littleEndian);
	        },
	        _setFloat64: function(byteOffset, value, littleEndian) {
	            this._setBinaryFloat(byteOffset, value, 52, 11, littleEndian);
	        },
	        _set64: function(Type, byteOffset, value, littleEndian) {
	            "object" != typeof value && (value = Type.fromNumber(value)), littleEndian = defined(littleEndian, this._littleEndian), 
	            byteOffset = defined(byteOffset, this._offset);
	            var parts = littleEndian ? {
	                lo: 0,
	                hi: 4
	            } : {
	                lo: 4,
	                hi: 0
	            };
	            for (var partName in parts) this.setUint32(byteOffset + parts[partName], value[partName], littleEndian);
	            this._offset = byteOffset + 8;
	        },
	        setInt64: function(byteOffset, value, littleEndian) {
	            this._set64(Int64, byteOffset, value, littleEndian);
	        },
	        setUint64: function(byteOffset, value, littleEndian) {
	            this._set64(Uint64, byteOffset, value, littleEndian);
	        },
	        _setUint32: function(byteOffset, value, littleEndian) {
	            this._setBytes(byteOffset, [ 255 & value, value >>> 8 & 255, value >>> 16 & 255, value >>> 24 ], littleEndian);
	        },
	        _setUint16: function(byteOffset, value, littleEndian) {
	            this._setBytes(byteOffset, [ 255 & value, value >>> 8 & 255 ], littleEndian);
	        },
	        _setUint8: function(byteOffset, value) {
	            this._setBytes(byteOffset, [ 255 & value ]);
	        },
	        setUnsigned: function(byteOffset, value, bitLength) {
	            var data = this._getBitRangeData(bitLength, byteOffset), wideValue = data.wideValue, b = data.bytes;
	            wideValue &= ~(~(-1 << bitLength) << -this._bitOffset), wideValue |= (32 > bitLength ? value & ~(-1 << bitLength) : value) << -this._bitOffset;
	            for (var i = b.length - 1; i >= 0; i--) b[i] = 255 & wideValue, wideValue >>>= 8;
	            this._setBytes(data.start, b, !0);
	        }
	    }, nodeNaming = {
	        Int8: "Int8",
	        Int16: "Int16",
	        Int32: "Int32",
	        Uint8: "UInt8",
	        Uint16: "UInt16",
	        Uint32: "UInt32",
	        Float32: "Float",
	        Float64: "Double"
	    };
	    proto._nodeBufferAction = function(type, isReadAction, byteOffset, littleEndian, value) {
	        this._offset = byteOffset + dataTypes[type];
	        var nodeName = nodeNaming[type] + ("Int8" === type || "Uint8" === type ? "" : littleEndian ? "LE" : "BE");
	        return byteOffset += this.byteOffset, isReadAction ? this.buffer["read" + nodeName](byteOffset) : this.buffer["write" + nodeName](value, byteOffset);
	    };
	    for (var type in dataTypes) !function(type) {
	        proto["get" + type] = function(byteOffset, littleEndian) {
	            return this._action(type, !0, byteOffset, littleEndian);
	        }, proto["set" + type] = function(byteOffset, value, littleEndian) {
	            this._action(type, !1, byteOffset, littleEndian, value);
	        };
	    }(type);
	    proto._setInt32 = proto._setUint32, proto._setInt16 = proto._setUint16, proto._setInt8 = proto._setUint8, 
	    proto.setSigned = proto.setUnsigned;
	    for (var method in proto) "set" === method.slice(0, 3) && !function(type) {
	        proto["write" + type] = function() {
	            Array.prototype.unshift.call(arguments, void 0), this["set" + type].apply(this, arguments);
	        };
	    }(method.slice(3));
	    return jDataView;
	});
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(6).Buffer))

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer, global) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */
	/* eslint-disable no-proto */

	'use strict'

	var base64 = __webpack_require__(7)
	var ieee754 = __webpack_require__(8)
	var isArray = __webpack_require__(9)

	exports.Buffer = Buffer
	exports.SlowBuffer = SlowBuffer
	exports.INSPECT_MAX_BYTES = 50

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Due to various browser bugs, sometimes the Object implementation will be used even
	 * when the browser supports typed arrays.
	 *
	 * Note:
	 *
	 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
	 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *     incorrect length in some situations.

	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
	 * get the Object implementation, which is slower but behaves correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
	  ? global.TYPED_ARRAY_SUPPORT
	  : typedArraySupport()

	/*
	 * Export kMaxLength after typed array support is determined.
	 */
	exports.kMaxLength = kMaxLength()

	function typedArraySupport () {
	  try {
	    var arr = new Uint8Array(1)
	    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
	    return arr.foo() === 42 && // typed array instances can be augmented
	        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
	        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
	  } catch (e) {
	    return false
	  }
	}

	function kMaxLength () {
	  return Buffer.TYPED_ARRAY_SUPPORT
	    ? 0x7fffffff
	    : 0x3fffffff
	}

	function createBuffer (that, length) {
	  if (kMaxLength() < length) {
	    throw new RangeError('Invalid typed array length')
	  }
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = new Uint8Array(length)
	    that.__proto__ = Buffer.prototype
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    if (that === null) {
	      that = new Buffer(length)
	    }
	    that.length = length
	  }

	  return that
	}

	/**
	 * The Buffer constructor returns instances of `Uint8Array` that have their
	 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
	 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
	 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
	 * returns a single octet.
	 *
	 * The `Uint8Array` prototype remains unmodified.
	 */

	function Buffer (arg, encodingOrOffset, length) {
	  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
	    return new Buffer(arg, encodingOrOffset, length)
	  }

	  // Common case.
	  if (typeof arg === 'number') {
	    if (typeof encodingOrOffset === 'string') {
	      throw new Error(
	        'If encoding is specified then the first argument must be a string'
	      )
	    }
	    return allocUnsafe(this, arg)
	  }
	  return from(this, arg, encodingOrOffset, length)
	}

	Buffer.poolSize = 8192 // not used by this implementation

	// TODO: Legacy, not needed anymore. Remove in next major version.
	Buffer._augment = function (arr) {
	  arr.__proto__ = Buffer.prototype
	  return arr
	}

	function from (that, value, encodingOrOffset, length) {
	  if (typeof value === 'number') {
	    throw new TypeError('"value" argument must not be a number')
	  }

	  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
	    return fromArrayBuffer(that, value, encodingOrOffset, length)
	  }

	  if (typeof value === 'string') {
	    return fromString(that, value, encodingOrOffset)
	  }

	  return fromObject(that, value)
	}

	/**
	 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
	 * if value is a number.
	 * Buffer.from(str[, encoding])
	 * Buffer.from(array)
	 * Buffer.from(buffer)
	 * Buffer.from(arrayBuffer[, byteOffset[, length]])
	 **/
	Buffer.from = function (value, encodingOrOffset, length) {
	  return from(null, value, encodingOrOffset, length)
	}

	if (Buffer.TYPED_ARRAY_SUPPORT) {
	  Buffer.prototype.__proto__ = Uint8Array.prototype
	  Buffer.__proto__ = Uint8Array
	  if (typeof Symbol !== 'undefined' && Symbol.species &&
	      Buffer[Symbol.species] === Buffer) {
	    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
	    Object.defineProperty(Buffer, Symbol.species, {
	      value: null,
	      configurable: true
	    })
	  }
	}

	function assertSize (size) {
	  if (typeof size !== 'number') {
	    throw new TypeError('"size" argument must be a number')
	  } else if (size < 0) {
	    throw new RangeError('"size" argument must not be negative')
	  }
	}

	function alloc (that, size, fill, encoding) {
	  assertSize(size)
	  if (size <= 0) {
	    return createBuffer(that, size)
	  }
	  if (fill !== undefined) {
	    // Only pay attention to encoding if it's a string. This
	    // prevents accidentally sending in a number that would
	    // be interpretted as a start offset.
	    return typeof encoding === 'string'
	      ? createBuffer(that, size).fill(fill, encoding)
	      : createBuffer(that, size).fill(fill)
	  }
	  return createBuffer(that, size)
	}

	/**
	 * Creates a new filled Buffer instance.
	 * alloc(size[, fill[, encoding]])
	 **/
	Buffer.alloc = function (size, fill, encoding) {
	  return alloc(null, size, fill, encoding)
	}

	function allocUnsafe (that, size) {
	  assertSize(size)
	  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < size; ++i) {
	      that[i] = 0
	    }
	  }
	  return that
	}

	/**
	 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
	 * */
	Buffer.allocUnsafe = function (size) {
	  return allocUnsafe(null, size)
	}
	/**
	 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
	 */
	Buffer.allocUnsafeSlow = function (size) {
	  return allocUnsafe(null, size)
	}

	function fromString (that, string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') {
	    encoding = 'utf8'
	  }

	  if (!Buffer.isEncoding(encoding)) {
	    throw new TypeError('"encoding" must be a valid string encoding')
	  }

	  var length = byteLength(string, encoding) | 0
	  that = createBuffer(that, length)

	  var actual = that.write(string, encoding)

	  if (actual !== length) {
	    // Writing a hex string, for example, that contains invalid characters will
	    // cause everything after the first invalid character to be ignored. (e.g.
	    // 'abxxcd' will be treated as 'ab')
	    that = that.slice(0, actual)
	  }

	  return that
	}

	function fromArrayLike (that, array) {
	  var length = array.length < 0 ? 0 : checked(array.length) | 0
	  that = createBuffer(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	function fromArrayBuffer (that, array, byteOffset, length) {
	  array.byteLength // this throws if `array` is not a valid ArrayBuffer

	  if (byteOffset < 0 || array.byteLength < byteOffset) {
	    throw new RangeError('\'offset\' is out of bounds')
	  }

	  if (array.byteLength < byteOffset + (length || 0)) {
	    throw new RangeError('\'length\' is out of bounds')
	  }

	  if (byteOffset === undefined && length === undefined) {
	    array = new Uint8Array(array)
	  } else if (length === undefined) {
	    array = new Uint8Array(array, byteOffset)
	  } else {
	    array = new Uint8Array(array, byteOffset, length)
	  }

	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = array
	    that.__proto__ = Buffer.prototype
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that = fromArrayLike(that, array)
	  }
	  return that
	}

	function fromObject (that, obj) {
	  if (Buffer.isBuffer(obj)) {
	    var len = checked(obj.length) | 0
	    that = createBuffer(that, len)

	    if (that.length === 0) {
	      return that
	    }

	    obj.copy(that, 0, 0, len)
	    return that
	  }

	  if (obj) {
	    if ((typeof ArrayBuffer !== 'undefined' &&
	        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
	      if (typeof obj.length !== 'number' || isnan(obj.length)) {
	        return createBuffer(that, 0)
	      }
	      return fromArrayLike(that, obj)
	    }

	    if (obj.type === 'Buffer' && isArray(obj.data)) {
	      return fromArrayLike(that, obj.data)
	    }
	  }

	  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
	}

	function checked (length) {
	  // Note: cannot use `length < kMaxLength()` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= kMaxLength()) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (length) {
	  if (+length != length) { // eslint-disable-line eqeqeq
	    length = 0
	  }
	  return Buffer.alloc(+length)
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function compare (a, b) {
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError('Arguments must be Buffers')
	  }

	  if (a === b) return 0

	  var x = a.length
	  var y = b.length

	  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
	    if (a[i] !== b[i]) {
	      x = a[i]
	      y = b[i]
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'latin1':
	    case 'binary':
	    case 'base64':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.concat = function concat (list, length) {
	  if (!isArray(list)) {
	    throw new TypeError('"list" argument must be an Array of Buffers')
	  }

	  if (list.length === 0) {
	    return Buffer.alloc(0)
	  }

	  var i
	  if (length === undefined) {
	    length = 0
	    for (i = 0; i < list.length; ++i) {
	      length += list[i].length
	    }
	  }

	  var buffer = Buffer.allocUnsafe(length)
	  var pos = 0
	  for (i = 0; i < list.length; ++i) {
	    var buf = list[i]
	    if (!Buffer.isBuffer(buf)) {
	      throw new TypeError('"list" argument must be an Array of Buffers')
	    }
	    buf.copy(buffer, pos)
	    pos += buf.length
	  }
	  return buffer
	}

	function byteLength (string, encoding) {
	  if (Buffer.isBuffer(string)) {
	    return string.length
	  }
	  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
	      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
	    return string.byteLength
	  }
	  if (typeof string !== 'string') {
	    string = '' + string
	  }

	  var len = string.length
	  if (len === 0) return 0

	  // Use a for loop to avoid recursion
	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'latin1':
	      case 'binary':
	        return len
	      case 'utf8':
	      case 'utf-8':
	      case undefined:
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) return utf8ToBytes(string).length // assume utf8
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}
	Buffer.byteLength = byteLength

	function slowToString (encoding, start, end) {
	  var loweredCase = false

	  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
	  // property of a typed array.

	  // This behaves neither like String nor Uint8Array in that we set start/end
	  // to their upper/lower bounds if the value passed is out of range.
	  // undefined is handled specially as per ECMA-262 6th Edition,
	  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
	  if (start === undefined || start < 0) {
	    start = 0
	  }
	  // Return early if start > this.length. Done here to prevent potential uint32
	  // coercion fail below.
	  if (start > this.length) {
	    return ''
	  }

	  if (end === undefined || end > this.length) {
	    end = this.length
	  }

	  if (end <= 0) {
	    return ''
	  }

	  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
	  end >>>= 0
	  start >>>= 0

	  if (end <= start) {
	    return ''
	  }

	  if (!encoding) encoding = 'utf8'

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'latin1':
	      case 'binary':
	        return latin1Slice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
	// Buffer instances.
	Buffer.prototype._isBuffer = true

	function swap (b, n, m) {
	  var i = b[n]
	  b[n] = b[m]
	  b[m] = i
	}

	Buffer.prototype.swap16 = function swap16 () {
	  var len = this.length
	  if (len % 2 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 16-bits')
	  }
	  for (var i = 0; i < len; i += 2) {
	    swap(this, i, i + 1)
	  }
	  return this
	}

	Buffer.prototype.swap32 = function swap32 () {
	  var len = this.length
	  if (len % 4 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 32-bits')
	  }
	  for (var i = 0; i < len; i += 4) {
	    swap(this, i, i + 3)
	    swap(this, i + 1, i + 2)
	  }
	  return this
	}

	Buffer.prototype.swap64 = function swap64 () {
	  var len = this.length
	  if (len % 8 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 64-bits')
	  }
	  for (var i = 0; i < len; i += 8) {
	    swap(this, i, i + 7)
	    swap(this, i + 1, i + 6)
	    swap(this, i + 2, i + 5)
	    swap(this, i + 3, i + 4)
	  }
	  return this
	}

	Buffer.prototype.toString = function toString () {
	  var length = this.length | 0
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	}

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	}

	Buffer.prototype.inspect = function inspect () {
	  var str = ''
	  var max = exports.INSPECT_MAX_BYTES
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
	    if (this.length > max) str += ' ... '
	  }
	  return '<Buffer ' + str + '>'
	}

	Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
	  if (!Buffer.isBuffer(target)) {
	    throw new TypeError('Argument must be a Buffer')
	  }

	  if (start === undefined) {
	    start = 0
	  }
	  if (end === undefined) {
	    end = target ? target.length : 0
	  }
	  if (thisStart === undefined) {
	    thisStart = 0
	  }
	  if (thisEnd === undefined) {
	    thisEnd = this.length
	  }

	  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
	    throw new RangeError('out of range index')
	  }

	  if (thisStart >= thisEnd && start >= end) {
	    return 0
	  }
	  if (thisStart >= thisEnd) {
	    return -1
	  }
	  if (start >= end) {
	    return 1
	  }

	  start >>>= 0
	  end >>>= 0
	  thisStart >>>= 0
	  thisEnd >>>= 0

	  if (this === target) return 0

	  var x = thisEnd - thisStart
	  var y = end - start
	  var len = Math.min(x, y)

	  var thisCopy = this.slice(thisStart, thisEnd)
	  var targetCopy = target.slice(start, end)

	  for (var i = 0; i < len; ++i) {
	    if (thisCopy[i] !== targetCopy[i]) {
	      x = thisCopy[i]
	      y = targetCopy[i]
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
	// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
	//
	// Arguments:
	// - buffer - a Buffer to search
	// - val - a string, Buffer, or number
	// - byteOffset - an index into `buffer`; will be clamped to an int32
	// - encoding - an optional encoding, relevant is val is a string
	// - dir - true for indexOf, false for lastIndexOf
	function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
	  // Empty buffer means no match
	  if (buffer.length === 0) return -1

	  // Normalize byteOffset
	  if (typeof byteOffset === 'string') {
	    encoding = byteOffset
	    byteOffset = 0
	  } else if (byteOffset > 0x7fffffff) {
	    byteOffset = 0x7fffffff
	  } else if (byteOffset < -0x80000000) {
	    byteOffset = -0x80000000
	  }
	  byteOffset = +byteOffset  // Coerce to Number.
	  if (isNaN(byteOffset)) {
	    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
	    byteOffset = dir ? 0 : (buffer.length - 1)
	  }

	  // Normalize byteOffset: negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
	  if (byteOffset >= buffer.length) {
	    if (dir) return -1
	    else byteOffset = buffer.length - 1
	  } else if (byteOffset < 0) {
	    if (dir) byteOffset = 0
	    else return -1
	  }

	  // Normalize val
	  if (typeof val === 'string') {
	    val = Buffer.from(val, encoding)
	  }

	  // Finally, search either indexOf (if dir is true) or lastIndexOf
	  if (Buffer.isBuffer(val)) {
	    // Special case: looking for empty string/buffer always fails
	    if (val.length === 0) {
	      return -1
	    }
	    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
	  } else if (typeof val === 'number') {
	    val = val & 0xFF // Search for a byte value [0-255]
	    if (Buffer.TYPED_ARRAY_SUPPORT &&
	        typeof Uint8Array.prototype.indexOf === 'function') {
	      if (dir) {
	        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
	      } else {
	        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
	      }
	    }
	    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
	  var indexSize = 1
	  var arrLength = arr.length
	  var valLength = val.length

	  if (encoding !== undefined) {
	    encoding = String(encoding).toLowerCase()
	    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
	        encoding === 'utf16le' || encoding === 'utf-16le') {
	      if (arr.length < 2 || val.length < 2) {
	        return -1
	      }
	      indexSize = 2
	      arrLength /= 2
	      valLength /= 2
	      byteOffset /= 2
	    }
	  }

	  function read (buf, i) {
	    if (indexSize === 1) {
	      return buf[i]
	    } else {
	      return buf.readUInt16BE(i * indexSize)
	    }
	  }

	  var i
	  if (dir) {
	    var foundIndex = -1
	    for (i = byteOffset; i < arrLength; i++) {
	      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
	        if (foundIndex === -1) foundIndex = i
	        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
	      } else {
	        if (foundIndex !== -1) i -= i - foundIndex
	        foundIndex = -1
	      }
	    }
	  } else {
	    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
	    for (i = byteOffset; i >= 0; i--) {
	      var found = true
	      for (var j = 0; j < valLength; j++) {
	        if (read(arr, i + j) !== read(val, j)) {
	          found = false
	          break
	        }
	      }
	      if (found) return i
	    }
	  }

	  return -1
	}

	Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
	  return this.indexOf(val, byteOffset, encoding) !== -1
	}

	Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
	}

	Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
	}

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; ++i) {
	    var parsed = parseInt(string.substr(i * 2, 2), 16)
	    if (isNaN(parsed)) return i
	    buf[offset + i] = parsed
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function latin1Write (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8'
	    length = this.length
	    offset = 0
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset
	    length = this.length
	    offset = 0
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset | 0
	    if (isFinite(length)) {
	      length = length | 0
	      if (encoding === undefined) encoding = 'utf8'
	    } else {
	      encoding = length
	      length = undefined
	    }
	  // legacy write(string, encoding, offset, length) - remove in v0.13
	  } else {
	    throw new Error(
	      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
	    )
	  }

	  var remaining = this.length - offset
	  if (length === undefined || length > remaining) length = remaining

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('Attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8'

	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	        return asciiWrite(this, string, offset, length)

	      case 'latin1':
	      case 'binary':
	        return latin1Write(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end)
	  var res = []

	  var i = start
	  while (i < end) {
	    var firstByte = buf[i]
	    var codePoint = null
	    var bytesPerSequence = (firstByte > 0xEF) ? 4
	      : (firstByte > 0xDF) ? 3
	      : (firstByte > 0xBF) ? 2
	      : 1

	    if (i + bytesPerSequence <= end) {
	      var secondByte, thirdByte, fourthByte, tempCodePoint

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1]
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          fourthByte = buf[i + 3]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD
	      bytesPerSequence = 1
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
	      codePoint = 0xDC00 | codePoint & 0x3FF
	    }

	    res.push(codePoint)
	    i += bytesPerSequence
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	var MAX_ARGUMENTS_LENGTH = 0x1000

	function decodeCodePointsArray (codePoints) {
	  var len = codePoints.length
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  var res = ''
	  var i = 0
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    )
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i] & 0x7F)
	  }
	  return ret
	}

	function latin1Slice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i])
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; ++i) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  var len = this.length
	  start = ~~start
	  end = end === undefined ? len : ~~end

	  if (start < 0) {
	    start += len
	    if (start < 0) start = 0
	  } else if (start > len) {
	    start = len
	  }

	  if (end < 0) {
	    end += len
	    if (end < 0) end = 0
	  } else if (end > len) {
	    end = len
	  }

	  if (end < start) end = start

	  var newBuf
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    newBuf = this.subarray(start, end)
	    newBuf.__proto__ = Buffer.prototype
	  } else {
	    var sliceLen = end - start
	    newBuf = new Buffer(sliceLen, undefined)
	    for (var i = 0; i < sliceLen; ++i) {
	      newBuf[i] = this[i + start]
	    }
	  }

	  return newBuf
	}

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }

	  return val
	}

	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length)
	  }

	  var val = this[offset + --byteLength]
	  var mul = 1
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul
	  }

	  return val
	}

	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  return this[offset]
	}

	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return this[offset] | (this[offset + 1] << 8)
	}

	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return (this[offset] << 8) | this[offset + 1]
	}

	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	}

	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	}

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var i = byteLength
	  var mul = 1
	  var val = this[offset + --i]
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	}

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset] | (this[offset + 1] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset + 1] | (this[offset] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	}

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	}

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, true, 23, 4)
	}

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, false, 23, 4)
	}

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, true, 52, 8)
	}

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, false, 52, 8)
	}

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	}

	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    var maxBytes = Math.pow(2, 8 * byteLength) - 1
	    checkInt(this, value, offset, byteLength, maxBytes, 0)
	  }

	  var mul = 1
	  var i = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    var maxBytes = Math.pow(2, 8 * byteLength) - 1
	    checkInt(this, value, offset, byteLength, maxBytes, 0)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 1] = (value >>> 8)
	    this[offset] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = 0
	  var mul = 1
	  var sub = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
	      sub = 1
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  var sub = 0
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
	      sub = 1
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  if (value < 0) value = 0xff + value + 1
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 3] = (value >>> 24)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (value < 0) value = 0xffffffff + value + 1
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	  if (offset < 0) throw new RangeError('Index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	}

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (targetStart >= target.length) targetStart = target.length
	  if (!targetStart) targetStart = 0
	  if (end > 0 && end < start) end = start

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start
	  }

	  var len = end - start
	  var i

	  if (this === target && start < targetStart && targetStart < end) {
	    // descending copy from end
	    for (i = len - 1; i >= 0; --i) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    // ascending copy from start
	    for (i = 0; i < len; ++i) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else {
	    Uint8Array.prototype.set.call(
	      target,
	      this.subarray(start, start + len),
	      targetStart
	    )
	  }

	  return len
	}

	// Usage:
	//    buffer.fill(number[, offset[, end]])
	//    buffer.fill(buffer[, offset[, end]])
	//    buffer.fill(string[, offset[, end]][, encoding])
	Buffer.prototype.fill = function fill (val, start, end, encoding) {
	  // Handle string cases:
	  if (typeof val === 'string') {
	    if (typeof start === 'string') {
	      encoding = start
	      start = 0
	      end = this.length
	    } else if (typeof end === 'string') {
	      encoding = end
	      end = this.length
	    }
	    if (val.length === 1) {
	      var code = val.charCodeAt(0)
	      if (code < 256) {
	        val = code
	      }
	    }
	    if (encoding !== undefined && typeof encoding !== 'string') {
	      throw new TypeError('encoding must be a string')
	    }
	    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
	      throw new TypeError('Unknown encoding: ' + encoding)
	    }
	  } else if (typeof val === 'number') {
	    val = val & 255
	  }

	  // Invalid ranges are not set to a default, so can range check early.
	  if (start < 0 || this.length < start || this.length < end) {
	    throw new RangeError('Out of range index')
	  }

	  if (end <= start) {
	    return this
	  }

	  start = start >>> 0
	  end = end === undefined ? this.length : end >>> 0

	  if (!val) val = 0

	  var i
	  if (typeof val === 'number') {
	    for (i = start; i < end; ++i) {
	      this[i] = val
	    }
	  } else {
	    var bytes = Buffer.isBuffer(val)
	      ? val
	      : utf8ToBytes(new Buffer(val, encoding).toString())
	    var len = bytes.length
	    for (i = 0; i < end - start; ++i) {
	      this[i + start] = bytes[i % len]
	    }
	  }

	  return this
	}

	// HELPER FUNCTIONS
	// ================

	var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '='
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity
	  var codePoint
	  var length = string.length
	  var leadSurrogate = null
	  var bytes = []

	  for (var i = 0; i < length; ++i) {
	    codePoint = string.charCodeAt(i)

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	        leadSurrogate = codePoint
	        continue
	      }

	      // valid surrogate pair
	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	    }

	    leadSurrogate = null

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint)
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; ++i) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; ++i) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  for (var i = 0; i < length; ++i) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	function isnan (val) {
	  return val !== val // eslint-disable-line no-self-compare
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(6).Buffer, (function() { return this; }())))

/***/ },
/* 7 */
/***/ function(module, exports) {

	'use strict'

	exports.byteLength = byteLength
	exports.toByteArray = toByteArray
	exports.fromByteArray = fromByteArray

	var lookup = []
	var revLookup = []
	var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

	var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	for (var i = 0, len = code.length; i < len; ++i) {
	  lookup[i] = code[i]
	  revLookup[code.charCodeAt(i)] = i
	}

	revLookup['-'.charCodeAt(0)] = 62
	revLookup['_'.charCodeAt(0)] = 63

	function placeHoldersCount (b64) {
	  var len = b64.length
	  if (len % 4 > 0) {
	    throw new Error('Invalid string. Length must be a multiple of 4')
	  }

	  // the number of equal signs (place holders)
	  // if there are two placeholders, than the two characters before it
	  // represent one byte
	  // if there is only one, then the three characters before it represent 2 bytes
	  // this is just a cheap hack to not do indexOf twice
	  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
	}

	function byteLength (b64) {
	  // base64 is 4/3 + up to two characters of the original data
	  return b64.length * 3 / 4 - placeHoldersCount(b64)
	}

	function toByteArray (b64) {
	  var i, j, l, tmp, placeHolders, arr
	  var len = b64.length
	  placeHolders = placeHoldersCount(b64)

	  arr = new Arr(len * 3 / 4 - placeHolders)

	  // if there are placeholders, only get up to the last complete 4 chars
	  l = placeHolders > 0 ? len - 4 : len

	  var L = 0

	  for (i = 0, j = 0; i < l; i += 4, j += 3) {
	    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
	    arr[L++] = (tmp >> 16) & 0xFF
	    arr[L++] = (tmp >> 8) & 0xFF
	    arr[L++] = tmp & 0xFF
	  }

	  if (placeHolders === 2) {
	    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
	    arr[L++] = tmp & 0xFF
	  } else if (placeHolders === 1) {
	    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
	    arr[L++] = (tmp >> 8) & 0xFF
	    arr[L++] = tmp & 0xFF
	  }

	  return arr
	}

	function tripletToBase64 (num) {
	  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
	}

	function encodeChunk (uint8, start, end) {
	  var tmp
	  var output = []
	  for (var i = start; i < end; i += 3) {
	    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
	    output.push(tripletToBase64(tmp))
	  }
	  return output.join('')
	}

	function fromByteArray (uint8) {
	  var tmp
	  var len = uint8.length
	  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
	  var output = ''
	  var parts = []
	  var maxChunkLength = 16383 // must be multiple of 3

	  // go through the array every three bytes, we'll deal with trailing stuff later
	  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
	    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
	  }

	  // pad the end with zeros, but make sure to not forget the extra bytes
	  if (extraBytes === 1) {
	    tmp = uint8[len - 1]
	    output += lookup[tmp >> 2]
	    output += lookup[(tmp << 4) & 0x3F]
	    output += '=='
	  } else if (extraBytes === 2) {
	    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
	    output += lookup[tmp >> 10]
	    output += lookup[(tmp >> 4) & 0x3F]
	    output += lookup[(tmp << 2) & 0x3F]
	    output += '='
	  }

	  parts.push(output)

	  return parts.join('')
	}


/***/ },
/* 8 */
/***/ function(module, exports) {

	exports.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var nBits = -7
	  var i = isLE ? (nBytes - 1) : 0
	  var d = isLE ? -1 : 1
	  var s = buffer[offset + i]

	  i += d

	  e = s & ((1 << (-nBits)) - 1)
	  s >>= (-nBits)
	  nBits += eLen
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1)
	  e >>= (-nBits)
	  nBits += mLen
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen)
	    e = e - eBias
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	}

	exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
	  var i = isLE ? 0 : (nBytes - 1)
	  var d = isLE ? 1 : -1
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

	  value = Math.abs(value)

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0
	    e = eMax
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2)
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--
	      c *= 2
	    }
	    if (e + eBias >= 1) {
	      value += rt / c
	    } else {
	      value += rt * Math.pow(2, 1 - eBias)
	    }
	    if (value * c >= 2) {
	      e++
	      c /= 2
	    }

	    if (e + eBias >= eMax) {
	      m = 0
	      e = eMax
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen)
	      e = e + eBias
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
	      e = 0
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m
	  eLen += mLen
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128
	}


/***/ },
/* 9 */
/***/ function(module, exports) {

	var toString = {}.toString;

	module.exports = Array.isArray || function (arr) {
	  return toString.call(arr) == '[object Array]';
	};


/***/ }
/******/ ]);