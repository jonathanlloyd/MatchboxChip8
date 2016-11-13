var assert = require('assert');
var MatchboxChip8 = require('../src/MatchboxChip8');

describe('interpreter', function() {
    it('should clear the display - 00E0', function() {
        var instruction = 0x00E0;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.setPixel(0, 0, 1)
        interpreter.loadInstructions(testProgram);

        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        for(var x = 0; x < 64; x += 1) {
            for(var y = 0; y < 32; y += 1) {
              var pixel = interpreter.getPixel(x, y);
              assert.equal(pixel, 0);
            }
        }
    });

    it('should return from subroutine - 00EE', function() {
        var instruction = 0x00EE;
        var testReturnAddress = 100;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.pushStack(testReturnAddress);

        var oldStackTop = interpreter.stack[0];
        var oldSP = interpreter.SP;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldStackTop,
            'Program counter should equal old top of stack'
        );
        assert.equal(
            interpreter.SP,
            oldSP - 1,
            'Stack pointer should be decremented by 1'
        );
    });

    it('should jump to address - 1nnn', function() {
        var instruction = 0x1123;
        var testTargetAddress = 0x123;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            testTargetAddress,
            'Program counter should equal target address'
        );
    });

    it('should call subroutine - 2nnn', function() {
        var instruction = 0x2123;
        var testTargetAddress = 0x123;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        var oldPC = interpreter.PC;
        var oldSP = interpreter.SP;

        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.SP,
            oldSP + 1,
            'Stack pointer should increase by 1'
        );
        assert.equal(
            interpreter.stack[0],
            oldPC,
            'Top of stack should equal old program counter value'
        );
        assert.equal(
            interpreter.PC,
            testTargetAddress,
            'Program counter should equal target address'
        );
    });

    it('should skip if equal (equal) - 3xkk', function() {
        var instruction = 0x3A10;
        var testRegisterNumber = 0xA;
        var testOperand = 0x10;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        var oldPC = interpreter.PC;
        interpreter.registers[testRegisterNumber] = testOperand;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 2,
            'Program counter should increase by 2'
        );
    });

    it('should skip if equal (not equal) - 3xkk', function() {
        var instruction = 0x3A10;
        var testRegisterNumber = 0xA;
        var testOperand = 0x10;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        var oldPC = interpreter.PC;
        interpreter.registers[testRegisterNumber] = testOperand + 1;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 1,
            'Program counter should increase by 1'
        );
    });
});

