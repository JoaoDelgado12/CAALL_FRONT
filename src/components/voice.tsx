export const falar = (fraseAtual: String[], vozes: SpeechSynthesisVoice[]) => {
const texto = fraseAtual.join(' ');
if (!texto) return;

const utterance = new SpeechSynthesisUtterance(texto);
utterance.lang = 'pt-BR';

// Configurações para soar mais amigável
utterance.rate = 0.95; // Levemente mais devagar
utterance.pitch = 1.1; // Tom levemente mais alto (soar mais meiga/amigável)

// Tentar encontrar uma voz premium/feminina brasileira
const ptVoices = vozes.filter(v => v.lang.includes('pt-BR'));
const friendlyVoice = ptVoices.find(v => 
    v.name.includes('Google') || 
    v.name.includes('Feminino') || 
    v.name.includes('Luciana') || 
    v.name.includes('Natural')
) || ptVoices[0];

if (friendlyVoice) utterance.voice = friendlyVoice;

window.speechSynthesis.speak(utterance);
};

