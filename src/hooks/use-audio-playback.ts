"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Audio playback hook for the session transcript viewer.
 *
 * Fetches the mixed WAV from the BFF audio proxy, creates an
 * HTMLAudioElement, and exposes play/pause/seek controls. Tracks
 * currentTime so the transcript can highlight the active segment
 * and auto-scroll to follow playback.
 *
 * The audio source is: GET /api/sessions/{id}/audio
 * which returns a WAV file mixing all speakers.
 */

export interface UseAudioPlayback {
  /** Whether audio is currently playing */
  playing: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration of the audio in seconds (0 until loaded) */
  duration: number;
  /** Whether the audio has been loaded */
  loaded: boolean;
  /** Loading state */
  loading: boolean;
  /** Error message if audio failed to load */
  error: string | null;
  /** Start or resume playback, optionally from a specific time */
  play: (startTime?: number) => void;
  /** Pause playback */
  pause: () => void;
  /** Toggle play/pause */
  togglePlay: () => void;
  /** Seek to a specific time without changing play/pause state */
  seek: (time: number) => void;
  /** Stop and reset to beginning */
  stop: () => void;
}

export function useAudioPlayback(sessionId: string): UseAudioPlayback {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Time-update loop using requestAnimationFrame for smooth tracking
  const startTimeLoop = useCallback(() => {
    const tick = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTimeLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Ensure audio element exists and WAV is loaded
  const ensureAudio = useCallback(async (): Promise<HTMLAudioElement | null> => {
    if (audioRef.current && loaded) return audioRef.current;
    if (loading) return null;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/audio`);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Audio fetch failed: ${res.status} ${body}`);
      }

      const blob = await res.blob();

      // Revoke any previous blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }

      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      // Wait for metadata to be loaded
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener("loadedmetadata", () => resolve(), { once: true });
        audio.addEventListener("error", () => reject(new Error("Audio decode error")), { once: true });
      });

      setDuration(audio.duration);
      setLoaded(true);
      setLoading(false);

      audio.addEventListener("ended", () => {
        setPlaying(false);
        stopTimeLoop();
      });

      return audio;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load audio";
      setError(msg);
      setLoading(false);
      return null;
    }
  }, [sessionId, loaded, loading, stopTimeLoop]);

  const play = useCallback(
    async (startTime?: number) => {
      const audio = await ensureAudio();
      if (!audio) return;

      if (startTime !== undefined) {
        audio.currentTime = startTime;
        setCurrentTime(startTime);
      }

      try {
        await audio.play();
        setPlaying(true);
        startTimeLoop();
      } catch {
        // Autoplay may be blocked — user gesture required
        setError("Playback blocked. Click play to start.");
      }
    },
    [ensureAudio, startTimeLoop]
  );

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlaying(false);
    stopTimeLoop();
  }, [stopTimeLoop]);

  const togglePlay = useCallback(() => {
    if (playing) {
      pause();
    } else {
      play();
    }
  }, [playing, play, pause]);

  const seek = useCallback(
    async (time: number) => {
      const audio = await ensureAudio();
      if (!audio) return;
      audio.currentTime = time;
      setCurrentTime(time);
    },
    [ensureAudio]
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
    setCurrentTime(0);
    stopTimeLoop();
  }, [stopTimeLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  // Reset when session changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoaded(false);
    setLoading(false);
    setError(null);
  }, [sessionId]);

  return {
    playing,
    currentTime,
    duration,
    loaded,
    loading,
    error,
    play,
    pause,
    togglePlay,
    seek,
    stop,
  };
}
