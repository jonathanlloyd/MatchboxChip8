"use strict";

/**
 * Disassembly
 * Disassemble numeric opcode values
 * @module disassembly
 */


/**
 * Decode a numeric instruction into a lambda containing the needed
 * interpreter function with the necessary parameters embedded in the
 * closure.
 * @param {Number} rawInstruction - Numeric representation of an instruction
 * @param {Interpreter} interpreter - Reference to interpreter
 * @return {Function} insruction - Callable instruction object
 */
var decodeInstruction = function(rawInstruction, interpreter) {
    var firstNibble = (rawInstruction & 0xF000) >> 12;
    var lastNibble = rawInstruction & 0x000F;

    /*
     *  Common variables as stated in spec
     *  -----------------------------------
     *  |  x  | Second nibble             |
     *  -----------------------------------
     *  |  y  | Third nibble              |
     *  -----------------------------------
     *  | kk  | Last 2 nibbles            |
     *  -----------------------------------
     *  | nnn | Last 3 nibbles            |
     *  -----------------------------------
     */
    var x = (rawInstruction & 0x0F00) >> 8;
    var y = (rawInstruction & 0x00F0) >> 4;
    var kk = rawInstruction & 0x00FF;
    var nnn = rawInstruction & 0x0FFF;

    switch(firstNibble) {
        case 0x0:
            switch(lastNibble) {
                case 0x0:
                    return function () {
                        interpreter.clearDisplay();
                    };
                case 0xe:
                    return function () {
                        interpreter.subroutineReturn();
                    };
            }

            break;

        case 0x1:
            return function () {
                interpreter.jump(nnn);
            };

        case 0x2:
            return function () {
                interpreter.call(nnn);
            };

        case 0x3:
            return function () {
                interpreter.skipEqualImmediate(x, kk);
            };

        case 0x4:
            return function () {
                interpreter.skipNotEqualImmediate(x, kk);
            };

        case 0x5:
            return function () {
                interpreter.skipEqual(x, y);
            };

        case 0x6:
            return function () {
                interpreter.loadRegisterImmediate(x, kk);
            };

        case 0x7:
            return function () {
                interpreter.addRegisterImmediate(x, kk);
            };

        case 0x8:
            switch(lastNibble) {
                case 0x0:
                    return function () {
                        interpreter.loadRegister(x, y);
                    };

                case 0x1:
                    return function () {
                        interpreter.orRegister(x, y);
                    };

                case 0x2:
                    return function () {
                        interpreter.andRegister(x, y);
                    };

                case 0x3:
                    return function () {
                        interpreter.xorRegister(x, y);
                    };

                case 0x4:
                    return function () {
                        interpreter.addRegister(x, y);
                    };

                case 0x5:
                    return function () {
                        interpreter.subRegister(x, y);
                    };

                case 0x6:
                    return function () {
                        interpreter.shrRegister(x, y);
                    };

                case 0x7:
                    return function () {
                        interpreter.subnRegister(x, y);
                    };

                case 0xe:
                    return function () {
                        interpreter.shlRegister(x, y);
                    };
            }

            break;

        case 0x9:
            return function () {
                interpreter.skipNotEqual(x, y);
            };

        case 0xa:
            return function () {
                interpreter.setI(nnn);
            };

        case 0xb:
            return function () {
                interpreter.jumpPlus(nnn);
            };

        case 0xc:
            return function () {
                interpreter.loadRand(x, kk);
            };

        case 0xd:
            return function () {
                interpreter.drawSprite(x, y, lastNibble);
            };

        case 0xe:
            switch(lastNibble) {
                case 0xe:
                    return function () {
                        interpreter.skipKeyPressed(x);
                    };
                case 0x1:
                    return function () {
                        interpreter.skipKeyNotPressed(x);
                    };
            }

            break;

        case 0xf:
            switch(lastNibble) {
                case 0x7:
                    return function () {
                        interpreter.setRegisterDT(x);
                    };

                case 0xa:
                    return function () {
                        interpreter.waitForKeyDown(x);
                    };

                case 0x8:
                    return function () {
                        interpreter.setST(x);
                    };

                case 0xe:
                    return function () {
                        interpreter.addIRegister(x);
                    };

                case 0x9:
                    return function () {
                        interpreter.loadCharAddress(x);
                    };

                case 0x3:
                    return function () {
                        interpreter.writeBCD(x);
                    };

                case 0x5:
                    switch(y) {
                        case 0x1:
                            return function () {
                                interpreter.setDT(x);
                            };

                        case 0x5:
                            return function () {
                                interpreter.dumpRegisters(x);
                            };

                        case 0x6:
                            return function () {
                                interpreter.loadRegisters(x);
                            };
                    }
            }
    }

    return null;
};

module.exports = {
    decodeInstruction: decodeInstruction
};
