import React, { useState, useRef, useCallback, useEffect } from 'react';
import './VoiceButton.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const supported = Boolean(SpeechRecognition);

/**
 * VoiceButton — microphone button that captures speech and converts to text,
 * and reads AI messages using TTS.
 */
export default function VoiceButton({ onTranscript, disabled, lastAiMessage }) {
  const [state, setState] = useState('idle'); // idle | listening | error
  const [errMsg, setErrMsg] = useState('');
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('tts_muted') === 'true';
  });
  const recognitionRef = useRef(null);

  const toggleMute = () => {
    setIsMuted(prev => {
      const newVal = !prev;
      localStorage.setItem('tts_muted', String(newVal));
      if (newVal) {
        window.speechSynthesis.cancel();
      }
      return newVal;
    });
  };

  useEffect(() => {
    if (lastAiMessage && !isMuted) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(lastAiMessage);
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  }, [lastAiMessage, isMuted]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setState('idle');
  }, []);

  const startListening = useCallback(() => {
    if (!supported) {
      setErrMsg('Speech recognition is not supported in this browser.');
      setState('error');
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang            = 'en-IN';
    rec.interimResults  = false;
    rec.maxAlternatives = 1;
    rec.continuous      = false;
    recognitionRef.current = rec;

    rec.onstart  = () => setState('listening');
    rec.onend    = () => { if (state !== 'error') setState('idle'); };
    rec.onerror  = (e) => {
      setState('error');
      if (e.error === 'not-allowed' || e.error === 'denied') {
        setErrMsg('Microphone permission denied. Please allow access in browser settings.');
      } else if (e.error === 'no-speech') {
        setErrMsg('No speech detected. Please try again.');
        setTimeout(() => setState('idle'), 2000);
      } else {
        setErrMsg(`Recognition error: ${e.error}`);
        setTimeout(() => setState('idle'), 2000);
      }
    };
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        onTranscript?.(transcript);
      } else {
        setErrMsg('Could not understand. Please try again.');
        setState('error');
        setTimeout(() => setState('idle'), 2000);
      }
    };

    try {
      rec.start();
    } catch (err) {
      setState('error');
      setErrMsg('Could not start microphone. Try again.');
      setTimeout(() => setState('idle'), 2000);
    }
  }, [onTranscript, state]);

  const handleClick = () => {
    if (disabled) return;
    if (state === 'listening') { stopListening(); return; }
    setErrMsg('');
    startListening();
  };

  if (!supported) {
    return (
      <div className="voice-container" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button className="voice-btn voice-btn--unsupported" title="Speech recognition not supported" disabled>
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
            <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="voice-container" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <div className="voice-wrapper">
        <button
          className={`voice-btn voice-btn--${state}`}
          onClick={handleClick}
          disabled={disabled}
          title={state === 'listening' ? 'Click to stop' : 'Click to speak'}
          aria-label={state === 'listening' ? 'Stop recording' : 'Start voice input'}
        >
          {state === 'listening' ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>
        {state === 'error' && errMsg && (
          <div className="voice-error">{errMsg}</div>
        )}
      </div>

      <button
        className={`voice-btn ${isMuted ? 'voice-btn--muted' : 'voice-btn--unmuted'}`}
        onClick={toggleMute}
        title={isMuted ? 'Unmute voice reading' : 'Mute voice reading'}
        aria-label={isMuted ? 'Unmute voice reading' : 'Mute voice reading'}
      >
        {isMuted ? (
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        )}
      </button>
    </div>
  );
}
