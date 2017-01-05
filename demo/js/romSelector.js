var romSelector = (function ($) {
    var selectedRom = null;

    var romRegistry = [
        {
            "fileName": "BREAKOUT",
            "name": "Breakout",
            "author": "David Winters",
            "year": "1997",
            "description": [
                "Controls:",
                "Q - left, E - right"
            ].join('<br>')
        },
        {
            "fileName": "TETRIS",
            "name": "Tetris",
            "author": "Fran Dachille",
            "year": "1991",
            "description": [
                "Controls:",
                "Q - spin, W - left, E - right, A - down"
            ].join('<br>')
        },
        {
            "fileName": "PONG",
            "name": "Pong",
            "author": "Paul Vervalin",
            "year": "1990",
            "description": [
                "Controls:",
                "1 - up, Q - down"
            ].join('<br>')
        },
        {
            "fileName": "OUTLAW",
            "name": "Outlaw",
            "author": "John Earnest",
            "year": "2015",
            "description": [
                "Controls:",
                "W - up, A - left, S - down, D - right, E - Shoot"
            ].join('<br>')
        },
        {
            "fileName": "TRIP8",
            "name": "Trip-8",
            "year": "2008",
            "author": "Revival Studios",
            "description": [
                "DemoScene animation sequence",
            ].join('<br>')
        }
    ];


    function renderRomSelector(selectedRomIndex) {
        var htmlString = "";
        for(var i = 0; i < romRegistry.length; i += 1) {
            var rom = romRegistry[i];

            if(i === selectedRomIndex) {
                var selectedClass = "selected-rom";
                var description = rom.description;
                demo.loadRomFromURL("ROMS/" + rom.fileName);
            } else {
                var selectedClass = "";
                var description = "";
            }

            htmlString += [
                '<div class="rom-card ' + selectedClass + '" onclick="romSelector.selectRom(' + i + ');">',
                    '<p class="rom-card-name">',
                        rom.name,
                    '</p>',
                    '<p class="rom-card-description">',
                        description,
                    '</p>',
                    '<p class="rom-card-author">',
                        '- ' + rom.author + " (" + (rom.year || "Unknown") + ")",
                    '</p>',
                '</div>'
            ].join('');
        }

        $("#demo-rom-loader").html(htmlString);
    }

    renderRomSelector(null);


    $("#upload-rom-button").click(function() {
        $('#hidden-upload').trigger("click");
    });

    $("#hidden-upload").change(function() {
        demo.loadRomFromURL(this.files[0]);
        renderRomSelector(null);
    });


    return {
        "selectRom": renderRomSelector,
    }
})(jQuery);
