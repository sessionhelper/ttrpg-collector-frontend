import { NextResponse } from "next/server";
import { dataApi } from "@/lib/data-api";

/**
 * GET /api/sessions/:id/audio
 *
 * Fetches all per-speaker PCM chunks from the data-api, mixes them into
 * a single interleaved stereo 48kHz stream, wraps it in a WAV header,
 * and returns it as audio/wav.
 *
 * Query params:
 *   speaker - optional pseudo_id to return a single speaker's audio
 *
 * The data-api serves raw s16le stereo 48kHz PCM at:
 *   GET /internal/sessions/{id}/audio/{pseudo_id}/chunk/{seq}
 *
 * Chunks are numbered sequentially starting at 0. We fetch until we get
 * a 404 (no more chunks).
 */

const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const BYTES_PER_SAMPLE = 2; // s16le

function writeWavHeader(buffer: ArrayBuffer, dataLength: number): void {
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE, true);
  view.setUint16(32, CHANNELS * BYTES_PER_SAMPLE, true);
  view.setUint16(34, BYTES_PER_SAMPLE * 8, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);
}

/** Fetch all sequential chunks for a speaker until 404. */
async function fetchSpeakerPcm(
  sessionId: string,
  pseudoId: string
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let seq = 0;

  while (true) {
    try {
      const res = await dataApi.getAudioChunk(sessionId, pseudoId, seq);
      const arrayBuf = await res.arrayBuffer();
      chunks.push(Buffer.from(arrayBuf));
      seq++;
    } catch (e) {
      // Stop on any error (404 = no more chunks, or network error)
      break;
    }
  }

  if (chunks.length === 0) {
    return Buffer.alloc(0);
  }

  return Buffer.concat(chunks);
}

/**
 * Mix multiple s16le PCM buffers by summing samples with clipping.
 * All buffers must be the same format (stereo 48kHz s16le).
 * Output length = longest input.
 */
function mixPcmBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) return Buffer.alloc(0);
  if (buffers.length === 1) return buffers[0];

  const maxLen = Math.max(...buffers.map((b) => b.length));
  // Ensure even number of bytes (s16le)
  const alignedLen = maxLen - (maxLen % 2);
  const output = Buffer.alloc(alignedLen);

  for (let i = 0; i < alignedLen; i += 2) {
    let sum = 0;
    for (const buf of buffers) {
      if (i + 1 < buf.length) {
        sum += buf.readInt16LE(i);
      }
    }
    // Clip to s16 range
    sum = Math.max(-32768, Math.min(32767, sum));
    output.writeInt16LE(sum, i);
  }

  return output;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const speakerFilter = url.searchParams.get("speaker");

    // Get participants to know which pseudo_ids have audio
    const participants = await dataApi.getParticipantsForAudio(id);

    let pcmData: Buffer;

    if (speakerFilter) {
      // Single speaker
      pcmData = await fetchSpeakerPcm(id, speakerFilter);
    } else {
      // All speakers mixed
      const speakerPcms = await Promise.all(
        participants.map((p) => fetchSpeakerPcm(id, p.pseudo_id))
      );
      const nonEmpty = speakerPcms.filter((b) => b.length > 0);
      pcmData = mixPcmBuffers(nonEmpty);
    }

    if (pcmData.length === 0) {
      return NextResponse.json(
        { error: "No audio data found" },
        { status: 404 }
      );
    }

    // Build WAV
    const wavHeader = new ArrayBuffer(44);
    writeWavHeader(wavHeader, pcmData.length);

    const wav = Buffer.concat([Buffer.from(wavHeader), pcmData]);

    return new Response(wav, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wav.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch audio";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
