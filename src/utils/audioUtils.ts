export const speak = (text: string) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1;
  utterance.pitch = 1;
  utterance.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};
