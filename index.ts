import axios from "axios";
import * as dotenv from "dotenv";
import Ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

// Input directory for the audio
const inputFilePath = "./inputs/AUDIO_FILE.mp3";
// Output directory for the transcription
const outputDirectory = "./outputs";
// OpenAi endpoint for speech-to-text
const speechToTextAPI = "https://api.openai.com/v1/audio/transcriptions";
// Language in ISO-639 format 1: https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes
const language = "es";
// Audio segment length (in seconds). Set to 300s (5 min) as it's OpenAi maximum audio processing length
const audioSegmentLength = 300;
// Config to output partial transcriptions
const outputPartialTranscriptions = false;

const apiKey = process.env.OPENAI_API_KEY;

async function sendToSpeechToText(filePath: string): Promise<string | null> {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([await fs.promises.readFile(filePath)]),
    filePath.replace(outputDirectory, "")
  );
  formData.append("model", "whisper-1");
  formData.append("language", language);

  try {
    const response = await axios.post(speechToTextAPI, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return response.data.text;
  } catch (error) {
    console.error(`Error transcribing ${filePath}:`, error);
    return null;
  }
}

function transcriptAudio(
  filePath: string,
  duration: number,
  outputDir: string
) {
  const inputFileName = path.basename(filePath, path.extname(filePath));
  Ffmpeg.ffprobe(filePath, (err, metadata) => {
    if (err) {
      console.error("Error getting metadata:", err);
      return;
    }

    const totalDuration = metadata.format.duration ?? 0;
    const numberOfSegments = Math.ceil(totalDuration / duration);

    let transcript = new Map<number, string>();

    const finishCallback = () => {
      const outputFileName = path.join(outputDir, `${inputFileName}.txt`);
      let output = "";
      for (let i = 0; i < numberOfSegments; i++) {
        output = `${output} ${transcript.get(i)}`;
      }
      fs.writeFileSync(outputFileName, output);
      console.log("Transcript saved to " + outputFileName);
    };

    let finishCount = 0;
    for (let i = 0; i < numberOfSegments; i++) {
      const startTime = i * duration;
      const outputFileName = path.join(
        outputDir,
        `${inputFileName}_part_${i + 1}.mp3`
      );
      Ffmpeg(filePath)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(outputFileName)
        .on("end", async () => {
          const partialTranscript = await sendToSpeechToText(outputFileName);
          if (partialTranscript) {
            transcript.set(i, partialTranscript);
            if (outputPartialTranscriptions) {
              const transcriptFileName = outputFileName.replace(".mp3", ".txt");
              fs.writeFileSync(transcriptFileName, partialTranscript);
              console.log(`Transcription saved to ${transcriptFileName}`);
            } else {
              fs.unlink(outputFileName, (err) => {
                if (err) {
                  console.error(`Error cleaning the file: ${err}`);
                  return;
                }
              });
            }
          }
          finishCount++;
          if (finishCount === numberOfSegments) {
            finishCallback();
          }
        })
        .on("error", (err) => {
          console.error("Error processing segment:", err);
        })
        .run();
    }
  });
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

// Split audio
transcriptAudio(inputFilePath, audioSegmentLength, outputDirectory);
