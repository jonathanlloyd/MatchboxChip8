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

var bitmapFont = require("./bitmapFont");
var disassembly = require("./disassembly");
var rom_loading = require("./rom_loading");

var PROGRAM_ADDRESS = 0x200;

//In hz
var TIMER_FREQUENCY = 60;


/**
 * Matchbox interpreter
 * @constructor
 * @param {Boolean} debugMode - A boolean describing whether or not to enable
 *     debug logging. Debugging will be enabled if this value is true and
       will be disabled otherwise.
 */
var Interpreter = function (debugMode) {
    debugMode = debugMode || false;

    if (debugMode) {
        log.setLevel("debug");
    } else {
        log.setLevel("warn");
    }

    // 64 * 32 monochrome display
    this.display = new Array(2048);

    // 16 input keys
    this.keyboard = new Array(16);

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

    // Time last step was executed
    this._lastStepTime = 0;

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

    // Reset keyboard
    for(i = 0; i < this.keyboard.length; i += 1) {
        this.keyboard[i] = false;
    }

    // Reset RAM
    for(i = 0; i < this.RAM.length; i += 1) {
        this.RAM[i] = 0;
    }

    // Load bitmap font into RAM
    var memoryAddress = 0;
    for(i = 0; i < bitmapFont.FONT.length; i += 1) {
        var glyph = bitmapFont.FONT[i];
        for(var byteNum = 0; byteNum < glyph.length; byteNum += 1) {
            var bitList = glyph[byteNum];
            var byteValue = 0;
            for (var bitIndex = 0; bitIndex < 8; bitIndex += 1) {
                byteValue = byteValue << 1;
                var bit = bitList[bitIndex];
                byteValue = byteValue ^ bit;
            }
            this.RAM[memoryAddress] = byteValue;
            memoryAddress += 1;
        }
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

    // Reset last step time
    this._lastStepTime = 0;

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
Interpreter.prototype.insertRom = function (rom, callback) {
    var interpreter = this;

    rom_loading.load_rom(rom, function (instructions) {
        interpreter.reset();
        interpreter.loadInstructions(instructions);
        if(callback) {
            callback();
        }
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
    var highByte = this.RAM[this.PC];
    var lowByte = this.RAM[this.PC + 1];
    var rawInstruction = (highByte << 8) | lowByte;
    var instructionString = rawInstruction.toString(16);

    // Decode instruction
    log.debug("Decoding instruction 0x" + instructionString);
    var decodedInstruction = disassembly.decodeInstruction(
        rawInstruction,
        this
    );

    // Execute instruction
    if(decodedInstruction !== null) {
        decodedInstruction();
    } else {
        log.warn("Invalid instruction 0x" + instructionString);
    }

    // Run timer logic
    this.stepTimers();

    // Increase program counter
    this.PC += 2;
};

/**
 * Decrement delay and sound timers at a rate of 60hz
 */
Interpreter.prototype.stepTimers = function() {
    var now = currentTime();
    var lastStepTime = this._lastStepTime || now;

    var secondsPassed = now - lastStepTime;
    var numSteps = Math.floor(secondsPassed * TIMER_FREQUENCY);

    this.DT -= numSteps;
    if(this.DT < 0) {
        this.DT = 0;
    }

    this.ST -= numSteps;
    if(this.ST < 0) {
        this.ST = 0;
    }

    this._lastStepTime = now;
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

/**
 * Mark one of the sixteen keys as having being pressed
 * @param {Number} keyCode - Numeric key code (0-15) of the key pressed.
 */
Interpreter.prototype.keyDown = function (keyCode) {
    log.debug(
        'Pressing key',
        keyCode.toString(16)
    );
    this.keyboard[keyCode] = true;
};

/**
 * Mark one of the sixteen keys as having being released
 * @param {Number} keyCode - Numeric key code (0-15) of the key pressed.
 */
Interpreter.prototype.keyUp = function (keyCode) {
    log.debug(
        'Releasing key',
        keyCode.toString(16)
    );
    this.keyboard[keyCode] = false;
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
    this.PC = this.popStack() - 2;
};

/**
 * 1nnn - JP addr
 * Jump to location nnn.
 * 
 * The interpreter sets the program counter to nnn.
 */
Interpreter.prototype.jump = function (jumpAddress) {
    log.debug("Jumping to 0x", jumpAddress.toString(16));
    this.PC = jumpAddress - 2;
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
    this.pushStack(this.PC + 2);
    this.PC = callAddress - 2;
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
        this.PC += 2;
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

    var shouldSkip = this.registers[registerNumber] !== immediateValue;
    if(shouldSkip) {
        log.debug(
            'Register V',
            registerNumber.toString(16),
            ' does not equal ',
            immediateValue.toString(16),
            ' - skipping next instruction'
        );
        this.PC += 2;
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
        this.PC += 2;
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
    this.registers[registerNumber] =
        (this.registers[registerNumber] + immediateValue) % 256;
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
 * Set Vx = Vx - Vy, set VF = borrow.
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
    var result = Math.abs(registerXValue - registerYValue);
    var borrowBit = registerXValue > registerYValue;

    this.registers[registerNumberX] = result;
    this.registers[0xF] = Number(borrowBit);
};

/**
 * 8xy6 - SHR Vx {, Vy}
 * Set Vy = Vx SHR 1.
 * 
 * If the least-significant bit of Vy is 1, then VF is set to 1, otherwise 0.
 * Then Vy is divided by 2 and set in Vx.
 */
Interpreter.prototype.shrRegister = function (
    registerNumberX,
    registerNumberY
    ) {
    log.debug(
        'Bit shifting the value of register',
        'V' + registerNumberY,
        'right, into register',
        'V' + registerNumberX
    );
    var registerYValue = this.registers[registerNumberY];
    var result = registerYValue >> 1;
    var overflowBit = registerYValue % 2 === 1;

    this.registers[registerNumberX] = result;
    this.registers[0xF] = Number(overflowBit);
};

/**
 * 8xy7 - SUBN Vx, Vy
 * Set Vx = Vy - Vx, set VF = borrow.
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
        registerNumberX,
        " from register V",
        registerNumberY
    );
    var registerXValue = this.registers[registerNumberX];
    var registerYValue = this.registers[registerNumberY];
    var result = Math.abs(registerYValue - registerXValue);
    var borrowBit = registerXValue > registerYValue;

    this.registers[registerNumberX] = result;
    this.registers[0xF] = Number(borrowBit);
};

/**
 * 8xyE - SHL Vx, Vy
 * Set Vx = Vx SHL 1.
 * 
 * If the most-significant bit of Vy is 1, then VF is set to 1, otherwise to
 * 0. Then Vy is multiplied by 2 and stored in Vx.
 */
Interpreter.prototype.shlRegister = function (
    registerNumberX,
    registerNumberY
    ) {
    log.debug(
        'Bit shifting the value of register',
        'V' + registerNumberY,
        'left, into register',
        'V' + registerNumberX
    );
    var registerYValue = this.registers[registerNumberY];
    var result = (registerYValue << 1) & 255;
    var overflowBit = (registerYValue & (1 << 7)) === 128;

    this.registers[registerNumberX] = result;
    this.registers[0xF] = Number(overflowBit);
};

/**
 * 9xy0 - SNE Vx, Vy
 * Skip next instruction if Vx != Vy.
 * 
 * The values of Vx and Vy are compared, and if they are not equal, the
 * program counter is increased by 2.
 */
Interpreter.prototype.skipNotEqual = function (
      registerNumberX,
      registerNumberY
  ) {
    log.debug("Skip Not Equal");

    var registerXValue = this.registers[registerNumberX];
    var registerYValue = this.registers[registerNumberY];
    var shouldSkip = registerXValue !== registerYValue;

    if(shouldSkip) {
        log.debug(
            'Register V',
            registerNumberX.toString(16),
            ' does not equal ',
            'Register V',
            registerNumberY.toString(16),
            ' - skipping next instruction'
        );
        this.PC += 2;
    } else {
        log.debug(
            'Register V',
            registerNumberX.toString(16),
            ' equals ',
            'Register V',
            registerNumberY.toString(16),
            ' - not skipping next instruction'
        );
    }
};

/**
 * Annn - LD I, addr
 * Set I = nnn.
 * 
 * The value of register I is set to nnn.
 */
Interpreter.prototype.setI = function (value) {
    log.debug(
        "Setting register I to",
        "0x" + value.toString(16)
    );

    this.I = value;
};

/**
 * Bnnn - JP V0, addr
 * Jump to location nnn + V0.
 * 
 * The program counter is set to nnn plus the value of V0.
 */
Interpreter.prototype.jumpPlus = function (value) {
    var register0Value = this.registers[0x0];
    var jumpAddress = register0Value + value;

    log.debug(
        'Jumping to V0',
        '(' + register0Value + ')',
        '+',
        value,
        '(=' + jumpAddress + ')'
    );

    this.PC = jumpAddress - 2;
};

/**
 * Cxkk - RND Vx, byte
 * Set Vx = random byte AND kk.
 * 
 * The interpreter generates a random number from 0 to 255, which is then
 * ANDed with the value kk. The results are stored in Vx. 
 */
Interpreter.prototype.loadRand = function (registerNumberX, value) {
    log.debug('Loading RND');

    log.debug(
        'register number =',
        registerNumberX,
        'AND value =',
        value
    );

    var rand = randRange(0, 255);
    var result = rand & value;

    log.debug(
        'Rand =',
        rand,
        'Result =',
        result
    );

    this.registers[registerNumberX] = result;
};

/**
 * Dxyn - DRW Vx, Vy, nibble
 * Display n-byte sprite starting at memory location I at (Vx, Vy), set VF =
 * collision.
 * 
 * The interpreter reads n bytes from memory, starting at the address stored
 * in I. These bytes are then displayed as sprites on screen at coordinates
 * (Vx, Vy). Sprites are XORed onto the existing screen. If this causes any
 * pixels to be erased, VF is set to 1, otherwise it is set to 0. If the
 * sprite is positioned so part of it is outside the coordinates of the
 * display, it wraps around to the opposite side of the screen. 
 */
Interpreter.prototype.drawSprite = function (
        registerNumberX,
        registerNumberY,
        spriteHeight
    ) {
    log.debug('Drawing Sprite');

    var spriteAddress = this.I;
    var xCoord = this.registers[registerNumberX];
    var yCoord = this.registers[registerNumberY];

    log.debug(
        'xCoord = ' + xCoord,
        'yCoord = ' + yCoord,
        'spriteHeight = ' + spriteHeight,
        'spriteAddress = ' + spriteAddress
    );

    this.registers[0xF] = 0;

    for (var y = 0; y < spriteHeight; y += 1) {
        var spriteByte = this.RAM[spriteAddress + y];
        for(var x = 0; x < 8; x += 1) {
            var drawX = (x + xCoord) % 64;
            var drawY = (y + yCoord) % 32;

            var oldPixel = this.getPixel(drawX, drawY);
            var newPixel = (spriteByte >> 7 - x) & 1;

            if(oldPixel === 1 && newPixel === 1) {
                this.registers[0xf] = 1;
            }

            this.setPixel(drawX, drawY, newPixel ^ oldPixel);
        }
    }

    if (this.registers[0xf] === 1) {
        log.debug('Collision bit set');
    }
};

/**
 * Ex9E - SKP Vx
 * Skip next instruction if key with the value of Vx is pressed.
 * 
 * Checks the keyboard, and if the key corresponding to the value of Vx is
 * currently in the down position, PC is increased by 2.
 */
Interpreter.prototype.skipKeyPressed = function (registerXNum) {
    log.debug(
        'Skipping if key in register',
        'V' + registerXNum.toString(16),
        'is pressed'
    );

    var keyCode = this.registers[registerXNum];

    log.debug(
        'KeyCode is',
        '0x' + keyCode
    );

    var keyPressed = this.keyboard[keyCode];

    if(keyPressed) {
        log.debug('Key is pressed - skipping');
        this.PC += 2;
    } else {
        log.debug('Key not pressed - not skipping');
    }
};

/**
 * ExA1 - SKNP Vx
 * Skip next instruction if key with the value of Vx is not pressed.
 * 
 * Checks the keyboard, and if the key corresponding to the value of Vx is
 * currently in the up position, PC is increased by 2.
 */
Interpreter.prototype.skipKeyNotPressed = function (registerXNum) {
    log.debug(
        'Skipping if key in register',
        'V' + registerXNum.toString(16),
        'is not pressed'
    );

    var keyCode = this.registers[registerXNum];

    log.debug(
        'KeyCode is',
        '0x' + keyCode
    );

    var keyPressed = this.keyboard[keyCode];

    if(keyPressed) {
        log.debug('Key is pressed - not skipping');
    } else {
        log.debug('Key not pressed - skipping');
        this.PC += 2;
    }
};

/**
 * Fx07 - LD Vx, DT
 * Set Vx = delay timer value.
 * 
 * The value of DT is placed into Vx.
 */
Interpreter.prototype.setRegisterDT = function (registerXNum) {
    log.debug(
        'Setting register',
        'V' + registerXNum.toString(16),
        'to value of delay timer:',
        '0x' + this.DT
    );

    this.registers[registerXNum] = this.DT;
};

/**
 * Fx0A - LD Vx, K
 * Wait for a key press, store the value of the key in Vx.
 * 
 * All execution stops until a key is pressed, then the value of that key is
 * stored in Vx.
 */
Interpreter.prototype.waitForKeyDown = function (registerXNum) {
    log.debug('Waiting for key press');

    var keyCode = null;
    for(var i = 0; i < this.keyboard.length; i += 1) {
        if(this.keyboard[i]) {
            keyCode = i;
            break;
        }
    }

    if(keyCode === null) {
        log.debug('No key pressed - blocking');
        this.PC -= 2;
    } else {
        log.debug(
            'Key',
            '0x' + keyCode,
            'pressed - setting value in register',
            'V' + registerXNum
        );
        this.registers[registerXNum] = keyCode;
    }
};

/**
 * Fx15 - LD DT, Vx
 * Set delay timer = Vx.
 * 
 * DT is set equal to the value of Vx.
 */
Interpreter.prototype.setDT = function (registerXNum) {
    var value = this.registers[registerXNum];

    log.debug(
        'Setting delay timer to value of register',
        'V' + registerXNum.toString(16),
        '-',
        '0x' + value.toString(16)
    );

    this.DT = value;
};

/**
 * Fx18 - LD ST, Vx
 * Set sound timer = Vx.
 * 
 * ST is set equal to the value of Vx.
 */
Interpreter.prototype.setST = function (registerXNum) {
    var value = this.registers[registerXNum];

    log.debug(
        'Setting sound timer to value of register',
        'V' + registerXNum.toString(16),
        '-',
        '0x' + value.toString(16)
    );

    this.ST = value;
};

/**
 * Fx1E - ADD I, Vx
 * Set I = I + Vx.
 * 
 * The values of I and Vx are added, and the results are stored in I.
 */
Interpreter.prototype.addIRegister = function (registerXNum) {
    var IValue = this.I;
    var registerXValue = this.registers[registerXNum];
    var result = (IValue + registerXValue) % 65536;

    log.debug(
        'Adding value of register',
        'V' + registerXNum.toString(16),
        '(0x' + registerXValue + ')',
        'into register I',
        '(0x' + IValue.toString(16) + ')'
    );

    this.I = result;
};

/**
 * Fx29 - LD F, Vx
 * Set I = location of sprite for digit Vx.
 * 
 * The value of I is set to the location for the hexadecimal sprite 
 * corresponding to the value of Vx.
 */
Interpreter.prototype.loadCharAddress = function (registerXNum) {
    var charIndex = this.registers[registerXNum];
    var charAddress = charIndex * 5;

    log.debug(
        'Loading address of char',
        charIndex.toString(16),
        '(' + charAddress.toString(16) + ')'
    );

    this.I = charAddress;
};

/**
 * Fx33 - LD B, Vx
 * Store BCD representation of Vx in memory locations I, I+1, and I+2.
 * 
 * The interpreter takes the decimal value of Vx, and places the hundreds
 * digit in memory at location in I, the tens digit at location I+1, and the
 * ones digit at location I+2.
 */
Interpreter.prototype.writeBCD = function (registerXNum) {
    var registerXValue = this.registers[registerXNum];

    var hundreds = Math.floor(registerXValue / 100);
    var tens = Math.floor((registerXValue / 10) % 10);
    var units = Math.floor((registerXValue / 1) % 10);

    var I = this.I;

    log.debug(
        'Loading BCD value',
        registerXValue,
        'from register',
        'V' + registerXNum.toString(16),
        'into I, I+1, I+2 starting at location',
        I.toString(16)
    );

    log.debug(
        'I = ' + hundreds + ', ',
        'I + 1 = ' + tens + ', ',
        'I + 2 = ' + units
    );

    this.RAM[I] = hundreds;
    this.RAM[I + 1] = tens;
    this.RAM[I + 2] = units;
};

/**
 * Fx55 - LD [I], Vx
 * Store registers V0 through Vx in memory starting at location I.
 * 
 * The interpreter copies the values of registers V0 through Vx into memory,
 * starting at the address in I. I is then set to I + X + 1.
 */
Interpreter.prototype.dumpRegisters = function (registerXNum) {
    var I = this.I;

    log.debug(
        'Dumping registers V0 -',
        'V' + registerXNum.toString(16),
        'to address',
        '0x' + I.toString(16)
    );

    for(var regIndex = 0; regIndex <= registerXNum; regIndex += 1) {
        this.RAM[I + regIndex] = this.registers[regIndex];
    }

    log.debug(
        'I is set to I +',
        registerXNum,
        '+ 1'
    );

    this.I = I + registerXNum + 1;
};

/**
 * Fx65 - LD Vx, [I]
 * Read registers V0 through Vx from memory starting at location I.
 * 
 * The interpreter reads values from memory starting at location I into
 * registers V0 through Vx. I is then set to I + X + 1.
 */
Interpreter.prototype.loadRegisters = function (registerXNum) {
    var I = this.I;

    log.debug(
        'Loading registers V0 -',
        'V' + registerXNum.toString(16),
        'from address',
        '0x' + I.toString(16)
    );

    for(var regIndex = 0; regIndex <= registerXNum; regIndex += 1) {
        this.registers[regIndex] = this.RAM[I + regIndex];
    }

    this.I = I + registerXNum + 1;
};


function randRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function currentTime() {
    return Date.now() / 1000;
}


module.exports = {
    Interpreter: Interpreter,
};
