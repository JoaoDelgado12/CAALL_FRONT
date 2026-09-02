import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

// --- MOCK DO MAPWORD ---
const mapWord = new Map<string, string[]>([
  ["1", ["Eu", "Você", "Nós", "Eles", "Ela", "Ele", "Meu", "Seu", "Sua"]],
  ["2", ["Quero", "Gosto", "Sinto", "Estou", "Vou", "Falo", "Penso", "Acho", "Preciso"]],
  ["3", ["Ir", "Ficar", "Sair", "Voltar", "Correr", "Andar", "Parar", "Pular", "Sentar"]],
  ["4", ["Comer", "Beber", "Mastigar", "Engolir", "Provar", "Lanchar", "Jantar", "Almoçar", "Ceia"]],
  ["5", ["Água", "Suco", "Leite", "Café", "Chá", "Refrigerante", "Sopa", "Vitamina", "Achocolatado"]],
  ["6", ["Brincar", "Jogar", "Assistir", "Ouvir", "Ler", "Desenhar", "Pintar", "Cantar", "Dançar"]],
  ["7", ["Dormir", "Acordar", "Descansar", "Deitar", "Sonhar", "Cochilar", "Relaxar", "Espreguiçar", "Bocejar"]],
  ["8", ["Ajuda", "Por favor", "Obrigado", "Desculpa", "Sim", "Não", "Talvez", "Agora", "Depois"]]
]);

const App: React.FC = () => {
  const [fraseAtual, setFraseAtual] = useState<string[]>([]); //Frase do visor
  const [menuAberto, setMenuAberto] = useState(false);
  const [catNome, setCatNome] = useState("Selecione Categoria");
  const [labels, setLabels] = useState<string[]>([]); //Palavra escolhida no trackpad 
  
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null); //Para evedencia as palavras

  // Refs para lidar com eventos globais sem conflito com o ciclo de vida do React
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const activeTargetRef = useRef<number | null>(null); // Resolve o bug de duplicação
  const maxDistanceRef = useRef(110);
  
  const joystickRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  // --- CARREGAMENTO DE VOZES ---
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[]>([]);
  
  useEffect(() => {
    const carregarVozes = () => setVozes(window.speechSynthesis.getVoices());
    carregarVozes();
    window.speechSynthesis.onvoiceschanged = carregarVozes;
  }, []);

  const resetBtn = useCallback(() => {
    const defaultLabels = Array.from({ length: 8 }).map((_, i) => {
      const wordList = mapWord.get(String(i + 1));
      return wordList ? wordList[0] : `Cat ${i + 1}`;
    });
    setLabels(defaultLabels);
  }, []);

  useEffect(() => {
    resetBtn();
    // Calcula o limite do joystick com base na largura da tela para não bugar em telas pequenas
    maxDistanceRef.current = Math.min(110, window.innerWidth * 0.25);
  }, [resetBtn]);

  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollTop = displayRef.current.scrollHeight;
    }
  }, [fraseAtual]);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    if (joystickRef.current) joystickRef.current.style.transition = 'none';
  };

  useEffect(() => {
    const doDrag = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();

      let dx = e.clientX - startPosRef.current.x;
      let dy = e.clientY - startPosRef.current.y;

      const distance = Math.sqrt(dx * dx + dy * dy);
      const limit = maxDistanceRef.current;
      
      if (distance > limit) {
        dx *= limit / distance;
        dy *= limit / distance;
      }

      setJoystickPos({ x: dx, y: dy });
      checkProximity(distance, e.clientX, e.clientY);
    };

    const stopDrag = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const active = activeTargetRef.current;
      if (active !== null) {
        // Agora os estados são atualizados aqui fora de funcções updaters
        const selectedLabel = labels[active];
        setFraseAtual((prev) => [...prev, selectedLabel]);
        setCatNome(selectedLabel);
        selecionar(active + 1);
        
        if (navigator.vibrate) navigator.vibrate(50);
      }

      // Limpeza de estado e visual
      activeTargetRef.current = null;
      setHighlightedIndex(null);
      setJoystickPos({ x: 0, y: 0 });
      
      if (joystickRef.current) {
        joystickRef.current.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      }
    };

    window.addEventListener('pointermove', doDrag, { passive: false });
    window.addEventListener('pointerup', stopDrag);

    return () => {
      window.removeEventListener('pointermove', doDrag);
      window.removeEventListener('pointerup', stopDrag);
    };
  }, [labels]);

  const checkProximity = (dist: number, clientX: number, clientY: number) => {
    if (dist < 20) {
      setHighlightedIndex(null);
      activeTargetRef.current = null;
      return;
    }

    if (joystickRef.current) joystickRef.current.style.pointerEvents = 'none';
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement;
    if (joystickRef.current) joystickRef.current.style.pointerEvents = 'auto';

    if (target && target.classList.contains('joy-btn')) {
      const index = Number(target.getAttribute('data-index'));
      setHighlightedIndex(index);
      activeTargetRef.current = index; // Guarda a intenção
    } else {
      setHighlightedIndex(null);
      activeTargetRef.current = null;
    }
  };

  const selecionar = (cat: number) => {
    const newLabels = labels.map((_, i) => {
      const wordList = mapWord.get(String(i + 1));
      return wordList && wordList[cat - 1] ? wordList[cat - 1] : "---"; 
    });
    setLabels(newLabels);
  };

  const limpar = () => {
    setFraseAtual([]);
    setCatNome('Selecione Categoria');
    resetBtn();
  };

  const falar = () => {
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
    limpar();
  };

  const renderJoyBtn = (gridIndex: number, labelIndex: number) => {
    return (
      <button
        key={labelIndex}
        data-index={labelIndex}
        className={`joy-btn ${highlightedIndex === labelIndex ? 'highlight' : ''}`}
        onClick={() => {
          // Clique direto para quem preferir não arrastar o dedo
          setFraseAtual((prev) => [...prev, labels[labelIndex]]);
          setCatNome(labels[labelIndex]);
          selecionar(labelIndex + 1);
          if (navigator.vibrate) navigator.vibrate(30);
        }}
      >
        {labels[labelIndex]}
      </button>
    );
  };

  return (
    <div className="pwa-container">
      
      {/* Header Responsivo */}
      <header className="header">
        <h1 className="app-title">Voz Ativa</h1>
        <button
          id="menu-btn"
          className={menuAberto ? 'btn-menu-action' : 'btn-menu-desativado'}
          onClick={() => setMenuAberto(!menuAberto)}
        >
          ☰
        </button>
      </header>

      <nav id="menu" className={menuAberto ? 'show' : 'hidden'}>
        <ul>
          <li><a href="#">Perfil</a></li>
          <li><a href="#">Editar palavras</a></li>
          <li><a href="#">Contatos</a></li>
        </ul>
      </nav>

      <div className="display-container">
        <div id="frase-display" ref={displayRef}>
          {fraseAtual.length > 0 ? fraseAtual.join(' ') + '...' : 'Toque em uma categoria...'}
        </div>
      </div>

      <div className="action-bar">
        <button className="btn-action btn-clear" onClick={limpar}>🗑️ Limpar</button>
        <button className="btn-action btn-play" onClick={falar}>🔊 Falar</button>
      </div>

      <div className="joystick-area">
        <div className="category-label" id="cat-nome">{catNome}</div>

        <div className="joystick-grid">
          {renderJoyBtn(0, 0)}
          {renderJoyBtn(1, 1)}
          {renderJoyBtn(2, 2)}
          
          {renderJoyBtn(3, 3)}
          
          {/* Joystick Center Dot */}
          <div
            className="joy-btn center-dot"
            ref={joystickRef}
            onPointerDown={startDrag}
            style={{
              transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`
            }}
          >
            ●
          </div>
          
          {renderJoyBtn(5, 4)}
          
          {renderJoyBtn(6, 5)}
          {renderJoyBtn(7, 6)}
          {renderJoyBtn(8, 7)}
        </div>
      </div>
    </div>
  );
};

export default App;