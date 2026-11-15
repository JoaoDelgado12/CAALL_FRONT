export const falar = (
  fraseAtual: string[],
  vozes: SpeechSynthesisVoice[],
  onMissingVoiceWarning?: (msg: string) => void
): void => {
  if (!('speechSynthesis' in window)) {
    onMissingVoiceWarning?.('Síntese de voz não suportada neste dispositivo');
    return;
  }
  const texto = fraseAtual.join(' ').trim();
  if (!texto) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = 'pt-BR';

  const norm = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase();
  const local = vozes.filter((v) => v.localService === true);
  const ptBr = local.filter((v) => norm(v) === 'pt-br');
  const pool = ptBr.length ? ptBr : local.filter((v) => norm(v).startsWith('pt'));

  if (pool.length > 0) {
    utterance.voice =
      pool.find((v) => v.default || v.name.toLowerCase().includes('natural')) ?? pool[0];
  } else {
    onMissingVoiceWarning?.('Voz offline em português não instalada no dispositivo');
  }

  utterance.onerror = (e) => {
    if (e.error !== 'canceled' && e.error !== 'interrupted')
      onMissingVoiceWarning?.('Não foi possível reproduzir a voz');
  };
  window.speechSynthesis.speak(utterance);
};