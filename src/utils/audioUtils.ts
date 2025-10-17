let isSpeaking = false;

export const speak = (text: string) => {
  try {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Wait a bit before starting new speech
    setTimeout(() => {
      if (!isSpeaking) {
        isSpeaking = true;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1;
        utterance.lang = "en-US";
        
        utterance.onend = () => {
          isSpeaking = false;
        };
        
        utterance.onerror = (event) => {
          console.warn('Speech synthesis error:', event.error);
          isSpeaking = false;
        };
        
        window.speechSynthesis.speak(utterance);
      }
    }, 100);
  } catch (error) {
    console.warn('Speech synthesis not available:', error);
    isSpeaking = false;
  }
};

export const stopSpeaking = () => {
  try {
    window.speechSynthesis.cancel();
    isSpeaking = false;
  } catch (error) {
    console.warn('Error stopping speech:', error);
  }
};
