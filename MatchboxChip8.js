"use strict";

/*
 * Copyright (c) 2016 Jonathan Lloyd - copyright@thisisjonathan.com
 * 
 * The MIT License
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */


/**
 * Matchbox - Chip 8 Interpreter
 * A Chip 8 interpreter written in JavaScript for HTML5 Canvas.
 * @module matchboxchip8
 */
var MatchboxChip8 = (function () {
    var INSTRUCTIONS = {
        "^F.65$": function(interpreter, x) {
            return function() {
                interpreter.ldvxi(x);
            }
        }
    };

    function dissassembleRom(rom) {
        console.log(rom[0]);
    }

    /**
     * Matchbox interpreter
     * @constructor
     * @param {CanvasRenderingContext2D} context - The 2D canvas drawing
     *     context used to draw the screen for the VM.
     */
    var Interpreter = function (context) {
        this.drawingContext = context;

        /*
         * 4KB of internal memory
         * 0x000 -> 0x1FF: Reserved
         * 0x200 -> 0xFFF: Space for program logic/data
         */
        this.RAM = new Array(4096);

        // 16 8-bit general purpose registers
        this.registers = {
            V0: 0,
            V1: 0,
            V2: 0,
            V3: 0,
            V4: 0,
            V5: 0,
            V6: 0,
            V7: 0,
            V8: 0,
            V9: 0,
            VA: 0,
            VB: 0,
            VC: 0,
            VD: 0,
            VE: 0,
            VF: 0,
        };

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
    };

    Interpreter.prototype.insertRom = function (rom) {
        var instructions = dissassembleRom(rom);
    };

    Interpreter.prototype.step = function() {
        // Fetch instruction
        var rawInstruction = this.RAM[this.PC];
        // Decode instruction
        var decodedInstruction = this.decodeInstruction(rawInstruction);
        // Execute instruction
        var interpreterMethod = this[decodedInstruction['instructionName']];
        interpreterMethod(decodedInstruction['parameters']);
    };

    return {
        Interpreter: Interpreter,
    };
}());
