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

var disassembly = require("./disassembly");

var PROGRAM_ADDRESS = 0x200;

var INSTRUCTION_MAP = {
    "^00e0$": function (interpreter, matchResult) {
        return function () {
            interpreter.clearDisplay();
        }
    },
    "^00ee$": function (interpreter, matchResult) {
        return function () {
            interpreter.subroutineReturn();
        }
    },
    "^1(...)$": function (interpreter, matchResult) {
        var jumpAddress = parseInt(matchResult[1], 16);

        return function () {
            interpreter.jump(jumpAddress);
        }
    },
    "^2(...)$": function (interpreter, matchResult) {
        var callAddress = parseInt(matchResult[1], 16);

        return function () {
            interpreter.call(callAddress);
        }
    },
    "^3(.)(..)$": function (interpreter, matchResult) {
        var registerNumber = parseInt(matchResult[1], 16);
        var immediateValue = parseInt(matchResult[2], 16);

        return function () {
            interpreter.skipEqualImmediate(registerNumber, immediateValue);
        }
    }
};


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
    disassembly.disassemble(rom, function (instructions) {
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

    for(var propertyName in INSTRUCTION_MAP) {
        if(INSTRUCTION_MAP.hasOwnProperty(propertyName)) {
            var instructionRe = propertyName;
            var matchResult = hexString.match(instructionRe)
            if(matchResult !== null) {
                var instructionGenerator = INSTRUCTION_MAP[instructionRe];
                return instructionGenerator(this, matchResult);
            }
        }
    }

    console.log("Invalid instruction: 0x" + hexString);
    return null;
};

Interpreter.prototype.getPixel = function (x, y) {
    return this.display[(64 * y) + x];
}

Interpreter.prototype.setPixel = function (x, y, value) {
    return this.display[(64 * y) + x] = value;
}

Interpreter.prototype.pushStack = function (value) {
    this.SP += 1;
    this.stack[this.SP] = value;
}

Interpreter.prototype.popStack = function () {
    value = this.stack[this.SP];
    this.SP -= 1;
    return value;
}

Interpreter.prototype.clearDisplay = function () {
    console.log("Clearing display");
    for(var i = 0; i < this.display.length; i += 1) {
        this.display[i] = 0;
    }
}

Interpreter.prototype.subroutineReturn = function () {
    console.log("Returning from subroutine");
    this.PC = this.popStack();
}

Interpreter.prototype.jump = function (jumpAddress) {
    console.log("Jumping to 0x" + jumpAddress.toString(16));
    this.PC = jumpAddress - 1;
}

Interpreter.prototype.call = function (callAddress) {
    console.log("Calling subroutine at 0x" + callAddress.toString(16));
    this.pushStack(this.PC);
    this.PC = callAddress;
}

Interpreter.prototype.skipEqualImmediate = function (
      registerNumber,
      immediateValue
    ) {
    var shouldSkip = this.registers[registerNumber] == immediateValue;
    if(shouldSkip) {
        console.log(
            'Register V'
            + registerNumber.toString(16)
            + ' equals '
            + immediateValue.toString(16)
            + ' - skipping next instruction'
        )
        this.PC += 1;
    } else {
        console.log(
            'Register V'
            + registerNumber.toString(16)
            + ' does not equal '
            + immediateValue.toString(16)
            + ' - not skipping next instruction'
        )
    }
}


module.exports = {
    Interpreter: Interpreter,
};
