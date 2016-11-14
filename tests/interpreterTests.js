var assert = require('assert');
var MatchboxChip8 = require('../src/MatchboxChip8');

describe('interpreter', function() {
    it('00E0 - should clear the display', function() {
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

    it('00EE - should return from subroutine', function() {
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

    it('1nnn - should jump to address', function() {
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

    it('2nnn - should call subroutine', function() {
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

    it('3xkk - should skip if immediate value equal (equal)', function() {
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

    it('3xkk - should skip if immediate value equal (not equal)', function() {
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

    it('4xkk - should skip if immediate value not equal (equal)', function() {
        var instruction = 0x4A10;
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
            oldPC + 1,
            'Program counter should increase by 1'
        );
    });

    it('4xkk - should skip if i\' value not equal (not equal)', function() {
        var instruction = 0x4A10;
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
            oldPC + 2,
            'Program counter should increase by 2'
        );
    });

    it('5xy0 - should skip if register value equal (equal)', function() {
        var instruction = 0x5A10;
        var registerXNum = 0xA;
        var registerYNum = 0x1;
        var registerXValue = registerYValue = 0x1;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        var oldPC = interpreter.PC;
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

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

    it('5xy0 - should skip if register value equal (not equal)', function() {
        var instruction = 0x5A10;
        var registerXNum = 0xA;
        var registerYNum = 0x1;
        var registerXValue = 0x1;
        var registerYValue = 0x2;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        var oldPC = interpreter.PC;
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

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

    it('6xkk - should load byte into register', function() {
        var instruction = 0x6011;
        var registerXNum = 0x0;
        var byteValue = 0x11;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            byteValue,
            'Register X value should equal byte value'
        );
    });

    it('7xkk - should add byte value to register', function() {
        var instruction = 0x7011;
        var registerXNum = 0x0;
        var registerXValue = 0x1;
        var byteValue = 0x11;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            byteValue + registerXValue,
            'Register X value should equal byte value + old value'
        );
    });

    it('8xy0 - should load register y into register x', function() {
        var instruction = 0x8010;
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0x0;
        var registerYValue = 0xA;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            registerYValue,
            'Register X value should equal register Y value'
        );
    });

    it('8xy1 - should OR register y into register x', function() {
        var instruction = 0x8011;
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0xA;
        var registerYValue = 0xB;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            registerYValue | registerXValue,
            'Register X value should equal ry OR rx'
        );
    });

    it('8xy2 - should AND register y into register x', function() {
        var instruction = 0x8012;
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0xA;
        var registerYValue = 0xB;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            registerYValue & registerXValue,
            'Register X value should equal ry AND rx'
        );
    });

    it('8xy3 - should XOR register y into register x', function() {
        var instruction = 0x8013;
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0xA;
        var registerYValue = 0xB;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            registerYValue ^ registerXValue,
            'Register X value should equal ry XOR rx'
        );
    });

    it('8xy4 - should ADD register y into register x (no carry)', function() {
        var instruction = 0x8014;
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0x01;
        var registerYValue = 0x03;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            registerYValue + registerXValue,
            'Register X value should equal ry ADD rx'
        );

        assert.equal(
            interpreter.registers[0xF],
            0,
            'Register 0xF value (carry bit) should equal 0'
        );
    });

    it('8xy4 - should ADD register y into register x (carry)', function() {
        var instruction = 0x8014;
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0xFF;
        var registerYValue = 0x04;

        var testProgram = [
            instruction
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            registerYValue - 1,
            'Register X value should equal ry - 1'
        );

        assert.equal(
            interpreter.registers[0xF],
            1,
            'Register 0xF value (carry bit) should equal 1'
        );
    });
});

