# Transcript audio to text using OpenAI Whisper

Small pet project to transcript (speech-to-text) audio using OpenAI Whisper, FFMPEG and Typescript.

## Prerequisites

You might need to install ffmpeg in your computer. Follow the instructions at [fluent-ffmpeg doc](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/blob/master/README.md).

## Usage

1. Create a `.env` file on the root of this project with your OpenAI API key, like so:
```
OPENAI_API_KEY="PASTE_YOUR_KEY_HERE"
```
2. On `index.ts`, point `inputFilePath` to the path of your audio file
```
// Input directory for the audio
const inputFilePath = "./inputs/AUDIO_FILE.mp3";
```
3. Install dependencies:
```
npm install
```
4. Run the script:
```
npm run start
```

You'll find the transcription on the `./outputs` directory.