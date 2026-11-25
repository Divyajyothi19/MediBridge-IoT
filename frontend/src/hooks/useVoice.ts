import { useCallback, useRef } from 'react';

interface VoiceSettings {
  enabled: boolean;
  volume: number;
  language: string;
}

export function useVoice(settings: VoiceSettings) {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string) => {
    if (!settings.enabled) return;
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = settings.volume;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    // Set language
    if (settings.language === 'kn') {
      utterance.lang = 'kn-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.lang === utterance.lang ||
      v.lang.startsWith(settings.language === 'kn' ? 'kn' : 'en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [settings]);

  const announceCompartmentOpened = useCallback((name: string) => {
    speak(`Compartment ${name} interaction recorded.`);
  }, [speak]);

  const announceWrongCompartment = useCallback(() => {
    speak('Warning! Wrong compartment opened. Please check your medication schedule.');
  }, [speak]);

  const announceStockEmpty = useCallback((name: string) => {
    speak(`Warning! Compartment ${name} medicine is empty. Please refill.`);
  }, [speak]);

  const announceReminder = useCallback((medicineName: string, compartmentNumber: number) => {
    speak(`It is time for ${medicineName}. Please open compartment ${compartmentNumber}.`);
  }, [speak]);

  const announceStockLow = useCallback((name: string) => {
    speak(`Compartment ${name} stock is running low. Please arrange a refill soon.`);
  }, [speak]);

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  return {
    speak,
    announceCompartmentOpened,
    announceWrongCompartment,
    announceStockEmpty,
    announceReminder,
    announceStockLow,
    cancel,
  };
}
