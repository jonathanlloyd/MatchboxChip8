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


var log = require('loglevel').getLogger("matchboxchip8");

var disassembly = require("./disassembly");
var rom_loading = require("./rom_loading");

var PROGRAM_ADDRESS = 0x200;


/**
 * Matchbox interpreter
 * @constructor
 * @param {CanvasRenderingContext2D} context - The 2D canvas drawing
 *     context used to draw the screen for the VM.
 */
var Interpreter = function (debugMode) {
    debugMode = debugMode || false;

    if (debugMode) {
        log.setLevel("debug");
    } else {
        log.setLevel("warn");
    }

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
 * @return {Function} insruction - Callable instruction object
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

/**
 * Get the pixel value (1 or 0) from a given screen coordinate
 * @param {Number} x - The X coordinate for the desired pixel
 * @param {Number} y - The Y coordinate for the desired pixel
 * @return {Number} value - The value of the desired pixel
 */
Interpreter.prototype.getPixel = function (x, y) {
    return this.display[(64 * y) + x];
};

/**
 * Set the pixel value (1 or 0) for a given screen coordinate
 * @param {Number} x - The X coordinate for the desired pixel
 * @param {Number} y - The Y coordinate for the desired pixel
 * @param {Number} value - The value to give the desired pixel (0 if 0,
 *   1 otherwise).
 */
Interpreter.prototype.setPixel = function (x, y, value) {
    this.display[(64 * y) + x] = value === 0 ? 0 : 1;
};

/**
 * Push a given value onto the stack
 *   (Put value on the top of the stack and increase the stack pointer)
 * @param {Number} value - The value to push onto the stack
 */
Interpreter.prototype.pushStack = function (value) {
    this.SP += 1;
    this.stack[this.SP] = value;
};

/**
 * Pop a given value from the stack
 *   (Decrease the stack pointer and return the value on the top of the stack)
 * @return {Number} value - The value to popped from the stack
 */
Interpreter.prototype.popStack = function () {
    var value = this.stack[this.SP];
    this.SP -= 1;
    return value;
};

/*
 * Instruction methods
 * ===================
 */

/**
 * 00E0 - CLS
 * Clear the display.
 */
Interpreter.prototype.clearDisplay = function () {
    log.debug("Clearing display");
    for(var i = 0; i < this.display.length; i += 1) {
        this.display[i] = 0;
    }
};

/**
 * 00EE - RET
 * Return from a subroutine.
 *
 * The interpreter sets the program counter to the address at the top of the
 * stack, then subtracts 1 from the stack pointer.
 */
Interpreter.prototype.subroutineReturn = function () {
    log.debug("Returning from subroutine");
    this.PC = this.popStack() - 1;
};

/**
 * 1nnn - JP addr
 * Jump to location nnn.
 * 
 * The interpreter sets the program counter to nnn.
 */
Interpreter.prototype.jump = function (jumpAddress) {
    log.debug("Jumping to 0x", jumpAddress.toString(16));
    this.PC = jumpAddress - 1;
};

/**
 * 2nnn - CALL addr
 * Call subroutine at nnn.
 * 
 * The interpreter increments the stack pointer, then puts the current PC on
 * the top of the stack. The PC is then set to nnn.
 */
Interpreter.prototype.call = function (callAddress) {
    log.debug("Calling subroutine at 0x", callAddress.toString(16));
    this.pushStack(this.PC);
    this.PC = callAddress - 1;
};

/**
 * 3xkk - SE Vx, byte
 * Skip next instruction if Vx = kk.
 * 
 * The interpreter compares register Vx to kk, and if they are equal,
 * increments the program counter by 2.
 */
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
        );
        this.PC += 1;
    } else {
        log.debug(
            'Register V',
            registerNumber.toString(16),
            ' does not equal ',
            immediateValue.toString(16),
            ' - not skipping next instruction'
        );
    }
};

/**
 * 4xkk - SNE Vx, byte
 * Skip next instruction if Vx != kk.
 * 
 * The interpreter compares register Vx to kk, and if they are not equal,
 * increments the program counter by 2.
 */
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
        );
        this.PC += 1;
    } else {
        log.debug(
            'Register V',
            registerNumber.toString(16),
            ' equals ',
            immediateValue.toString(16),
            ' - not skipping next instruction'
        );
    }
};

/**
 * 5xy0 - SE Vx, Vy
 * Skip next instruction if Vx = Vy.
 * 
 * The interpreter compares register Vx to register Vy, and if they are equal,
 * increments the program counter by 2.
 */
Interpreter.prototype.skipEqual = function (
      registerNumberX,
      registerNumberY
  ) {
    log.debug("Skip Equal");

    var registerXValue = this.registers[registerNumberX];
    var registerYValue = this.registers[registerNumberY];
    var shouldSkip = registerXValue === registerYValue;

    if(shouldSkip) {
        log.debug(
            'Register V',
            registerNumberX.toString(16),
            ' equals ',
            'Register V',
            registerNumberY.toString(16),
            ' - skipping next instruction'
        );
        this.PC += 1;
    } else {
        log.debug(
            'Register V',
            registerNumberX.toString(16),
            ' does not equal ',
            'Register V',
            registerNumberY.toString(16),
            ' - not skipping next instruction'
        );
    }
};

/**
 * 6xkk - LD Vx, byte
 * Set Vx = kk.
 * 
 * The interpreter puts the value kk into register Vx.
 */
Interpreter.prototype.loadRegisterImmediate = function (
        registerNumber,
        immediateValue
    ) {
    log.debug(
        "Loading value 0x",
        immediateValue.toString(16),
        " into register V",
        registerNumber
    );
    this.registers[registerNumber] = immediateValue;
};

/**
 * 7xkk - ADD Vx, byte
 * Set Vx = Vx + kk.
 * 
 * Adds the value kk to the value of register Vx and stores the result in Vx.
 */
Interpreter.prototype.addRegisterImmediate = function (
        registerNumber,
        immediateValue
    ) {
    log.debug(
        "Adding value 0x",
        immediateValue.toString(16),
        " to register V",
        registerNumber
    );
    this.registers[registerNumber] += immediateValue;
};

/**
 * 8xy0 - LD Vx, Vy
 * Set Vx = Vy.
 * 
 * Stores the value of register Vy in register Vx.
 */
Interpreter.prototype.loadRegister = function (
        registerNumberX,
        registerNumberY
    ) {
    log.debug(
        "Loading the value of register V",
        registerNumberY,
        " into register V",
        registerNumberX
    );
    this.registers[registerNumberX] = this.registers[registerNumberY];
};

/**
 * 8xy1 - OR Vx, Vy
 * Set Vx = Vx OR Vy.
 * 
 * Performs a bitwise OR on the values of Vx and Vy, then stores the result in
 * Vx. A bitwise OR compares the corrseponding bits from two values, and if 
 * either bit is 1, then the same bit in the result is also 1.
 * Otherwise, it is 0. 
 */
Interpreter.prototype.orRegister = function (
        registerNumberX,
        registerNumberY
    ) {
    log.debug(
        "ORing the value of register V",
        registerNumberY,
        " into register V",
        registerNumberX
    );
    var registerXValue = this.registers[registerNumberX];
    var registerYValue = this.registers[registerNumberY];
    this.registers[registerNumberX] = registerYValue | registerXValue;
};

/**
 * 8xy2 - AND Vx, Vy
 * Set Vx = Vx AND Vy.
 * 
 * Performs a bitwise AND on the values of Vx and Vy, then stores the result
 * in Vx. A bitwise AND compares the corrseponding bits from two values, and
 * if both bits are 1, then the same bit in the result is also 1.
 * Otherwise, it is 0. 
 */
Interpreter.prototype.andRegister = function (
        registerNumberX,
        registerNumberY
    ) {
    log.debug(
        "ANDing the value of register V",
        registerNumberY,
        " into register V",
        registerNumberX
    );
    var registerXValue = this.registers[registerNumberX];
    var registerYValue = this.registers[registerNumberY];
    this.registers[registerNumberX] = registerYValue & registerXValue;
};

/**
 * 8xy3 - XOR Vx, Vy
 * Set Vx = Vx XOR Vy.
 * 
 * Performs a bitwise exclusive OR on the values of Vx and Vy, then stores the
 * result in Vx. An exclusive OR compares the corrseponding bits from two
 * values, and if the bits are not both the same, then the corresponding bit
 * in the result is set to 1. Otherwise, it is 0.
 */
Interpreter.prototype.xorRegister = function (
        registerNumberX,
        registerNumberY
    ) {
    log.debug(
        "XORing the value of register V",
        registerNumberY,
        " into register V",
        registerNumberX
    );
    var registerXValue = this.registers[registerNumberX];
    var registerYValue = this.registers[registerNumberY];
    this.registers[registerNumberX] = registerYValue ^ registerXValue;
};

/**
 * 8xy4 - ADD Vx, Vy
 * Set Vx = Vx + Vy, set VF = carry.
 * 
 * The values of Vx and Vy are added together. If the result is greater than
 * 8 bits (i.e., > 255,) VF is set to 1, otherwise 0. Only the lowest 8 bits
 * of the result are kept, and stored in Vx.
 */
Interpreter.prototype.addRegister = function (
        registerNumberX,
        registerNumberY
    ) {
    log.debug(
        "ADDing the value of register V",
        registerNumberY,
        " into register V",
        registerNumberX
    );
    var registerXValue = this.registers[registerNumberX];
    var registerYValue = this.registers[registerNumberY];
    var result = registerYValue + registerXValue;

    var carryBit = 0;
    if (result > 255) {
        log.debug("ADD overflowed. Setting carry bit.");
        result = result & 255;
        carryBit = 1;
    }

    this.registers[registerNumberX] = result;
    this.registers[0xF] = carryBit;
};

/**
 * 8xy5 - SUB Vx, Vy
 * Set Vx = Vx - Vy, set VF = NOT borrow.
 * 
 * If Vx > Vy, then VF is set to 1, otherwise 0. Then Vy is subtracted from 
 * Vx, and the results stored in Vx.
 */
Interpreter.prototype.subRegister = function (
        registerNumberX,
        registerNumberY
    ) {
    log.debug(
        "SUBing the value of register V",
        registerNumberY,
        " from register V",
        registerNumberX
    );
    var registerXValue = this.registers[registerNumberX];
    var registerYValue = this.registers[registerNumberY];
    var result = Math.abs(registerYValue - registerXValue);
    var borrowBit = registerYValue > registerXValue;

    this.registers[registerNumberX] = result;
    this.registers[0xF] = borrowBit;
};

/**
 * 8xy6 - SHR Vx {, Vy}
 * Set Vx = Vx SHR 1.
 * 
 * If the least-significant bit of Vx is 1, then VF is set to 1, otherwise 0.
 * Then Vx is divided by 2.
 */
Interpreter.prototype.shrRegister = function (registerNumberX) {
    log.debug(
        "Bit shifting the value of register V",
        registerNumberX,
        'right.'
    );
    var registerXValue = this.registers[registerNumberX];
    var result = registerXValue >> 1;
    var overflowBit = registerXValue % 2 === 1;

    this.registers[registerNumberX] = result;
    this.registers[0xF] = overflowBit;
};

/**
 * 8xy7 - SUBN Vx, Vy
 * Set Vx = Vy - Vx, set VF = NOT borrow.
 * 
 * If Vy > Vx, then VF is set to 1, otherwise 0. Then Vx is subtracted from
 * Vy, and the results stored in Vx.
 */
Interpreter.prototype.subnRegister = function (
        registerNumberX,
        registerNumberY
    ) {
    log.debug(
        "SUBing the value of register V",
        registerNumberY,
        " from register V",
        registerNumberX
    );
    var registerXValue = this.registers[registerNumberX];
    var registerYValue = this.registers[registerNumberY];
    var result = Math.abs(registerYValue - registerXValue);
    var borrowBit = registerYValue <= registerXValue;

    this.registers[registerNumberX] = result;
    this.registers[0xF] = borrowBit;
};


module.exports = {
    Interpreter: Interpreter,
};
