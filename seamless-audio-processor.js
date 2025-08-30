class SeamlessAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = new Float32Array(0);
        this.position = 0;
        this.isPlaying = false;

        this.port.onmessage = (event) => {
            if (event.data.type === 'data') {
                // Append new audio data to buffer
                const newBuffer = new Float32Array(this.buffer.length + event.data.audio.length);
                newBuffer.set(this.buffer);
                newBuffer.set(event.data.audio, this.buffer.length);
                this.buffer = newBuffer;
                this.isPlaying = true;
            } else if (event.data.type === 'stop') {
                // Clear the buffer and reset
                this.buffer = new Float32Array(0);
                this.position = 0;
                this.isPlaying = false;
            }
        };
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0][0];

        if (!this.isPlaying || this.buffer.length - this.position < output.length) {
            // Fill with silence if no data
            output.fill(0);
            
            // Request more data if buffer is low
            if (this.buffer.length - this.position < output.length && this.isPlaying) {
                this.port.postMessage('needData');
            }
            return true;
        }

        // Copy data from buffer to output
        for (let i = 0; i < output.length; i++) {
            output[i] = this.buffer[this.position + i] || 0;
        }

        this.position += output.length;

        // Clean up buffer periodically
        if (this.position > sampleRate * 2) {
            this.buffer = this.buffer.slice(this.position);
            this.position = 0;
        }

        return true;
    }
}

registerProcessor('seamless-audio-processor', SeamlessAudioProcessor);