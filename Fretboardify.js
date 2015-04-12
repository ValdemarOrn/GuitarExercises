var fretboardify = (function() {

    var svgns = "http://www.w3.org/2000/svg";
    
    var stringDx = 24;
    var fretDx = 40;
    var fretThickness = 2.0;
    var nutThickness = 6.0;
    var paddingX = 40;
    var paddingY = 40;
    var fretColor = 'black';
    var stringColor = '#777';
    var fretMarkerColor = '#bbb';
    var fretMarks = [3,5,7,9,12,15,17,19,21,24,27];

    var defaultConfiguration = {
    	fromFret: 0, 
    	toFret: 24,
        stringCount: 6, 
        lefty: false, 
        tuning:  ['E', 'A', 'D', 'G', 'B', 'E'], 
        useFlats: false,
        defaultColor: 'blue', 
        showNotesByDefault: true, 
        showFretNumbers: true,
    };

	// ---------------------------------------------------------------------------------------------------------
	// ---------------------------------------- Helper Functions -----------------------------------------------
	// ---------------------------------------------------------------------------------------------------------

	// returns an independent cloned object
	function clone(obj) {
		var clonedObj = JSON.parse(JSON.stringify(obj));
		return clonedObj;
	}

	// applies any properties of the overrides object to the baseObject
	function applyValues(baseObject, overrides) {
		for (var key in overrides) {
			baseObject[key] = overrides[key];
		}
	}

	// reads config from the attributes on an html element
	function getConfigOverrides(htmlElement) {
		var config = {};

		var fromFret = htmlElement.getAttribute("data-fromFret");
		var toFret = htmlElement.getAttribute("data-toFret");
		var stringCount = htmlElement.getAttribute("data-stringCount");
		var defaultColor = htmlElement.getAttribute("data-defaultColor");

		var lefty = htmlElement.getAttribute("data-lefty");
		var useFlats = htmlElement.getAttribute("data-useFlats");
		var showNotesByDefault = htmlElement.getAttribute("data-showNotesByDefault");
		var showFretNumbers = htmlElement.getAttribute("data-showFretNumbers");

		var tuning = htmlElement.getAttribute("data-tuning");

		if (fromFret) config.fromFret = parseInt(fromFret);
		if (toFret) config.toFret = parseInt(toFret);
		if (stringCount) config.stringCount = parseInt(stringCount);
		if (defaultColor) config.defaultColor = defaultColor;

		if (lefty !== null) config.lefty = lefty.toLowerCase() == "false" ? false : true;
		if (useFlats !== null) config.useFlats = useFlats.toLowerCase() == "false" ? false : true;
		if (showNotesByDefault !== null) config.showNotesByDefault = showNotesByDefault.toLowerCase() == "false" ? false : true;
		if (showFretNumbers !== null) config.showFretNumbers = showFretNumbers.toLowerCase() == "false" ? false : true;

		if (tuning) {
			var notes = tuning.split(',');
			for (var i = 0; i < notes.length; i++) {
				var val = notes[i].trim();
				if (val.length == 2)
					val = val.substr(0, 1).toUpperCase() + val.substr(1, 1).toLowerCase();
				else
					val = val.toUpperCase();

				notes[i] = val;
			}

			config.tuning = notes;
		}

		return config;
	}

	function parseNotes(notesString) {
		// 1,2,orange,R;2,4,blue;3,4,blue;4,4,,R
		var notes = notesString.split(';');
		var output = [];
		for (var i = 0; i < notes.length; i++) {
			var note = {};
			var parts = notes[i].split(',');
			if (parts.length < 2) continue;

			note.string = parseInt(parts[0]);
			note.fret = parts[1].toUpperCase() == 'X' ? 'X' : parseInt(parts[1]);

			// colors and captions not allowed for muted strings
			if (note.fret !== 'X') {
				if (parts.length > 2 && parts[2])
					note.color = parts[2];

				if (parts.length > 3 && typeof(parts[3]) === 'string')
					note.caption = parts[3];
			}

			output.push(note);
		}

		return output;
	}

	// ---------------------------------------------------------------------------------------------------------
	// ---------------------------------------- Fretboard Class ------------------------------------------------
	// ---------------------------------------------------------------------------------------------------------

    function fretboard(htmlElement, configOverrides) {
    	this.element = htmlElement;

	    var configuration = clone(defaultConfiguration);
	    if (configOverrides)
            applyValues(configuration, configOverrides);
        
    	// We add one additional lower fret in order to see the fret "range" of the lowest fret.
		// The "fromFret" specified the actual wire fret from which we draw.
	    this.fromFret = configuration.fromFret > 0 ? configuration.fromFret - 1: 0;
	    this.toFret = configuration.toFret;
	    this.stringCount = configuration.stringCount;
        this.lefty = configuration.lefty;
        this.tuning = configuration.tuning.reverse();
        this.useFlats = configuration.useFlats;
        this.defaultColor = configuration.defaultColor;
        this.showNotesByDefault = configuration.showNotesByDefault;
        this.showFretNumbers = configuration.showFretNumbers;

        this.frets = (this.toFret - this.fromFret);
        this.width = this.frets * fretDx + 2 * paddingX;
        this.height = (this.stringCount - 1) * stringDx + 2 * paddingY;
        
        this.svg = this.init();
        if (this.showFretNumbers)
            this.drawFretNumbers();
    }

	fretboard.prototype.init = function() {
		var svg = document.createElementNS(svgns, "svg");
		svg.setAttributeNS(null, "viewBox", "0 0 " + this.width + " " + this.height);
		this.element.appendChild(svg);

		var g = document.createElementNS(svgns, "g");
		svg.appendChild(g);
		g.setAttribute('transform', 'translate(' + paddingX + ',' + paddingY + ')');
		return g;
	};

    fretboard.prototype.drawFretNumbers = function () {
    	var svg = this.svg;
    	var frets = this.toFret - this.fromFret + 1;

    	for (var i = 1; i < frets; i++) {
			var fret = this.fromFret + i;
			var dx = this.lefty
				? (this.frets + 1 - i - 0.5) * fretDx
				: (i - 0.5) * fretDx;
    		var dyText = (this.stringCount - 1) * stringDx;
    		var dyMarker = (this.stringCount - 1) * stringDx / 2;
    		
    		var show = fretMarks.indexOf(fret) > -1;
    		if (!show)
    			continue;

		    if (fret == 12 || fret == 24) {
			    var dot = document.createElementNS(svgns, 'circle');
			    dot.setAttributeNS(null, 'cx', dx);
			    dot.setAttributeNS(null, 'cy', dyMarker + (this.stringCount / 4) * stringDx);
			    dot.setAttributeNS(null, 'r', stringDx * 0.3);
			    dot.setAttributeNS(null, 'fill', fretMarkerColor);
			    svg.appendChild(dot);

			    var dot = document.createElementNS(svgns, 'circle');
			    dot.setAttributeNS(null, 'cx', dx);
			    dot.setAttributeNS(null, 'cy', dyMarker - (this.stringCount / 4) * stringDx);
			    dot.setAttributeNS(null, 'r', stringDx * 0.3);
			    dot.setAttributeNS(null, 'fill', fretMarkerColor);
			    svg.appendChild(dot);
		    }
		    else {
		    	var dot = document.createElementNS(svgns, 'circle');
		    	dot.setAttributeNS(null, 'cx', dx);
		    	dot.setAttributeNS(null, 'cy', dyMarker);
		    	dot.setAttributeNS(null, 'r', stringDx * 0.3);
		    	dot.setAttributeNS(null, 'fill', fretMarkerColor);
		    	svg.appendChild(dot);
		    }

		    var text = document.createElementNS(svgns, 'text');
    		text.setAttributeNS(null, 'x', dx);
    		text.setAttributeNS(null, 'y', dyText);
    		text.setAttributeNS(null, 'text-anchor', 'middle');
    		text.setAttributeNS(null, 'baseline-shift', '-20');
    		text.style.fill = 'black';
    		text.style['font-size'] = '12';
    		text.style['font-family'] = 'sans-serif';
    		text.textContent = fret;
    		svg.appendChild(text);
    	}
    };

	fretboard.prototype.drawBase = function() {
		var svg = this.svg;
		var frets = this.toFret - this.fromFret + 1;

		function thickness(str) { return (str) / 2 + 1; }

		// Draw frets
		for (var i = 0; i < frets; i++) {
			var line = document.createElementNS(svgns, 'line');
			line.setAttributeNS(null, 'x1', i * fretDx);
			line.setAttributeNS(null, 'x2', i * fretDx);
			line.setAttributeNS(null, 'y1', 0);
			line.setAttributeNS(null, 'y2', (this.stringCount - 1) * stringDx);

			line.setAttributeNS(null, 'stroke', fretColor);
			line.setAttributeNS(null, 'stroke-width', fretThickness);
			svg.appendChild(line);
		}

		// Draw strings
		for (var i = 0; i < this.stringCount; i++) {
			var line = document.createElementNS(svgns, 'line');
			var thick = thickness(i);
			line.setAttributeNS(null, 'x1', -(fretThickness / 2));
			line.setAttributeNS(null, 'x2', (frets - 1) * fretDx + fretThickness / 2);
			line.setAttributeNS(null, 'y1', i * stringDx);
			line.setAttributeNS(null, 'y2', i * stringDx);
			line.setAttributeNS(null, 'stroke', stringColor);
			line.setAttributeNS(null, 'stroke-width', thick);
			svg.appendChild(line);
		}

		// Draw nut
		if (this.fromFret == 0) {
			var line = document.createElementNS(svgns, 'line');
			var min = -thickness(0) / 2;
			var max = (this.stringCount - 1) * stringDx + thickness(this.stringCount - 1) / 2;

			var xPos = this.lefty
				? (frets - 1) * fretDx + nutThickness / 2 - fretThickness / 2
				: -nutThickness / 2 + fretThickness / 2;

			line.setAttributeNS(null, 'x1', xPos);
			line.setAttributeNS(null, 'x2', xPos);
			line.setAttributeNS(null, 'y1', min);
			line.setAttributeNS(null, 'y2', max);

			line.setAttributeNS(null, 'stroke', fretColor);
			line.setAttributeNS(null, 'stroke-width', nutThickness);
			svg.appendChild(line);
		}
	};
    
    fretboard.prototype.getNote = function(string, fret) {
        var baseNote = this.tuning[string - 1];
        var sharps = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A'];
        var flats = ['A', 'Bb', 'B', 'B', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A'];
        var arr = this.useFlats ? flats : sharps;
        var idx = (arr.indexOf(baseNote) + fret) % 12;
        var note = arr[idx];
        return note;
    };

	fretboard.prototype.drawNote = function(noteObject) {
		var svg = this.svg;
		var noteColor = 'white';

		var string = noteObject.string;
		var fret = noteObject.fret;
		var color = noteObject.color ? noteObject.color : this.defaultColor;
		var showNote = this.showNotesByDefault;
		var caption = null;

		if (typeof(fret) === 'string' && fret.toUpperCase() == 'X') {
			caption = 'X';
			noteColor = 'black';
			fret = 0;
			color = 'transparent';
		} 
		else {

			if (this.stringCount < string) return;
			if (this.fromFret != 0 && fret <= this.fromFret) return;
			if (fret > this.toFret) return;

			if (typeof(noteObject.caption) === 'string')
				caption = noteObject.caption;
			else
				caption = this.getNote(string, fret);
		}

		var dx = this.lefty
			? (this.frets - fret + 0.5 + this.fromFret) * fretDx
			: (fret - 0.5 - this.fromFret) * fretDx;

		var dy = (string - 1) * stringDx;

		var dot = document.createElementNS(svgns, 'circle');
		dot.setAttributeNS(null, 'cx', dx);
		dot.setAttributeNS(null, 'cy', dy);
		dot.setAttributeNS(null, 'r', stringDx * 0.4);
		dot.setAttributeNS(null, 'fill', color);
		svg.appendChild(dot);

		if (!showNote) return;
		var text = document.createElementNS(svgns, 'text');
		text.setAttributeNS(null, 'x', dx);
		text.setAttributeNS(null, 'y', dy);
		text.setAttributeNS(null, 'text-anchor', 'middle');
		text.setAttributeNS(null, 'baseline-shift', '-5');
		text.style.fill = noteColor;
		text.style['font-size'] = '12';
		text.style['font-family'] = 'sans-serif';
		text.textContent = caption;
		svg.appendChild(text);
	};
    
	function makeFretboard(element) {

		var notes = parseNotes(element.getAttribute("data-notes"));
		var configOverride = getConfigOverrides(element);
		var x = new fretboard(element, configOverride);
		x.drawBase();

		for (var i = 0; i < notes.length; i++) {
			x.drawNote(notes[i]);
		}
    }
    
    function setConfiguration(configuration) {
	    applyValues(defaultConfiguration, configuration);
    }
	
    document.addEventListener('DOMContentLoaded', function () {

	    var elements = document.getElementsByClassName("fretboard");
	    for (var i = 0; i < elements.length; i++) {
	    	var element = elements[i];
	    	makeFretboard(element);
	    }
        
    });
    
    return {
        makeFretboard: makeFretboard,
        setConfiguration: setConfiguration
    };
})();

