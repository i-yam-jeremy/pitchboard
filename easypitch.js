/*
	A library for easily playing notes in browser
*/
const EasyPitch = (() => {

	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	/* The audio context used by this library */
	let context = new AudioContext();

	/*
		The LogNormal distribution function. Used for attack and decay.
	*/
	function lognormal(x) {
		return 1/Math.sqrt(2*Math.PI) * Math.pow(Math.E, -1/2*Math.pow(Math.log(x), 2));
	}
	
	/*
		The frequencies of notes in octave 8 by name
	*/
	const noteFreqs = {
		"C": 4186.01,
		"C#": 4434.92,
		"Db": 4434.92,
		"D": 4698.63,
		"D#": 4978.03,
		"Eb": 4978.03,
		"E": 5274.04,
		"F": 5587.65,
		"F#": 5919.91,
		"Gb": 5919.91,
		"G": 6271.93,
		"G#": 6644.88,
		"Ab": 6644.88,
		"A": 7040.00,
		"A#": 7458.62,
		"Bb": 7458.62,
		"B": 7902.13
	};

	/*
		A note with a name, octave, and length (whole note, half-note, quarter-note, etc.)
	*/	
	class Note {

		/*
			Fields:
				name - string - the name of this note (A, B, C#, Db, etc.)
				octave - integer - the octave of this note (using scientific pitch notation)
				length - number - the length of this note (1 for whole note, 1/2 for half-note, etc.)
		*/

		/*
			Creates a note object from the given data
			@param name - string - the name of this note (A, B, C#, Db, etc.)
			@param octave - integer - the octave of this note (using scientific pitch notation)
			@param length - number - the length of this note (1 for whole note, 1/2 for half-note, etc.)
		*/
		constructor(name, octave, length) {
			this.name = name;
			this.octave = octave;
			this.length = length;
		}

		/*
			Returns the frequency of this note
			@param - number - the frequency of this note
		*/
		getFreq() {
			let octaveScale = Math.pow(2, this.octave - 8);
			return octaveScale*noteFreqs[this.name];
		}
	}

	/*
		An instrument. Determines how a note will sound based on
			the given waveform function
	*/
	class Instrument {

		/*
			Fields:
				waveformFunc - (number, number) => number - the function that defines the waveform
					with the signature (t, freq) => number where t is the current time in seconds
					and freq is the frequency of the note to be played and the output is the position of the wave
		*/

		/*
			Creates an instrument from the given waveform function
			@param waveformFunc - (number, number) => number - the function that defines the waveform
				with the signature (t, freq) => number where t is the current time in seconds
				and freq is the frequency of the note to be played and the output is the position of the wave
		*/
		constructor(waveformFunc) {
			this.waveformFunc = waveformFunc;
		}

		/*
			Plays a note of the specified frequency for the specified amount of time
			@param freq - number - the frequency to play
			@param time - number - the time in seconds to play the note for
		*/
		_playFreq(freq, time) {
			let source = context.createBufferSource(); // creates a sound source
			let buffer = context.createBuffer(2, context.sampleRate*time, context.sampleRate);
			for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
				var channelBuffer = buffer.getChannelData(channel);
				for (let i = 0; i < channelBuffer.length; i++) {
					channelBuffer[i] = this.waveformFunc(i/context.sampleRate, freq);
				}
			}
			source.buffer = buffer;                    // tell the source which sound to play
			source.connect(context.destination);       // connect the source to the context's destination (the speakers)
			source.start(0);
		}

		/*
			Plays the given note at the specified bpm and calls the callback when finished
			@param note - Note - the note to play
			@param bpm - number - the beats per minute
			@param callback - () => void - called when the note is done playing
		*/
		playNote(note, bpm, callback) {
			let secondsPerWholeNote = 60 / bpm;
			let seconds = secondsPerWholeNote * note.length;
			this._playFreq(note.getFreq(), seconds);
			setTimeout(callback, 1000*seconds);
		}

		/*
			Plays multiple notes, waiting until the previous note has finished before playing the next one
			@param notes - Note[] - the notes to play
			@param bpm - number - the beats per minute
			@param callback - () => void - called when all notes are done playing
		*/
		playNotes(notes, bpm, callback) {
			let thisInstrument = this;
			let i = 0;
			function nextNote() {
				if (i < notes.length) {
					thisInstrument.playNote(notes[i++], bpm, nextNote);
				}
				else {
					callback();
				}
			};
			nextNote();
		}
	}

	/*
		An instrument that is based on overtone-series.
		All is needed is the weightings of the overtones, no waveform function needed
	*/
	class SimpleInstrument extends Instrument {

		/*
			Creates an instrument with the given overtones
			@param overtones - number[] - the weightings of each overtone starting at
				the fundamental frequency and increasing to 2*fundamental, 3*fundamental,
				4*fundamental, etc.
		*/
		constructor(overtones) {
			let overtoneSum = overtones.reduce((a, b) => a+b);

			super((t, freq) => {
				let sample = 0;
				for (let i = 0; i < overtones.length; i++) {
					let overtoneFreq = freq*(i+1);
					let wave = Math.sin(2*Math.PI*overtoneFreq*t);
					let amplitude = overtones[i] * lognormal(50*t);
					sample += amplitude*wave;
				}
				return sample / overtoneSum;
			});
		}
	}

	return {
		Instrument,
		SimpleInstrument,
		Note
	};

})();
