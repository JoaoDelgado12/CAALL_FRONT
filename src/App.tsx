import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import {falar} from './components/voz'

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
  
  // Refs para lidar com eventos globais sem conflito com o ciclo de vida do React
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 }); //definindo a posição do botão
  const activeTargetRef = useRef<number | null>(null); // Resolve o bug de duplicação
  const maxDistanceRef = useRef(110);
  
  const joystickRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  const [vozes, setVozes] = useState<SpeechSynthesisVoice[]>([]);

  const timerSelecaoRef = useRef(null);
  const TEMPO_DWELL = 600;

  const resetBtn = useCallback(() => {
    const defaultLabels = Array.from({ length: 8 }).map((_, i) => {
      const wordList = mapWord.get(String(i + 1));
      return wordList ? wordList[0] : `Cat ${i + 1}`;
    });
    setLabels(defaultLabels);
  }, []);
  
  const limpar = () => {
    setFraseAtual([]);
    setCatNome('Selecione Categoria');
    resetBtn();
  };
  

  const carregarFala = () => {
    falar(fraseAtual, vozes);
    limpar();
  }
   
  const checkProximity = (dist: number, clientX: number, clientY: number) => {
    if (dist < 20) {
      activeTargetRef.current = null;
      return;
    }

    if (joystickRef.current) joystickRef.current.style.pointerEvents = 'none';
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement;
    if (joystickRef.current) joystickRef.current.style.pointerEvents = 'auto';

    if (target && target.classList.contains('joy-btn')) {
      const index = Number(target.getAttribute('data-index'));
      activeTargetRef.current = index; // Guarda a intenção
    } else {
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

  useEffect(() => {
    const carregarVozes = () => setVozes(window.speechSynthesis.getVoices());
    carregarVozes();
    window.speechSynthesis.onvoiceschanged = carregarVozes;
  }, []); 
  

  useEffect(() => {
    resetBtn();
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
        const selectedLabel = labels[active];
        setFraseAtual((prev) => [...prev, selectedLabel]);
        setCatNome(selectedLabel);
        selecionar(active + 1);
        
        if (navigator.vibrate) navigator.vibrate(50);
      }

      // Limpeza de estado e visual
      activeTargetRef.current = null;
      setJoystickPos({ x: 0, y: 0 });
      
      if (joystickRef.current) {
        joystickRef.current.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      }
    };
    document.getElementById('joyStick')?.addEventListener('pointermove', doDrag, {passive: false});
    document.getElementById('joyStick')?.addEventListener('pointerup', stopDrag);

    return () => {
      document.getElementById('joyStick')?.removeEventListener('pointermove', doDrag);
      document.getElementById('joyStick')?.removeEventListener('pointerup', stopDrag);
    };
  }, [labels]);

  



  const renderJoyBtn = (labelIndex: number) => {
    return (
      <button
        key={labelIndex}
        data-index={labelIndex}
        className={`joy-btn`}
        onPointerUp={() => {
          if(isDraggingRef.current){
            setFraseAtual((prev) => [...prev, labels[labelIndex]]);
            setCatNome(labels[labelIndex]);
            selecionar(labelIndex + 1);
            if (navigator.vibrate) navigator.vibrate(30);
          }
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
      <main>
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
          <button className="btn-action btn-play" onClick={carregarFala}>🔊 Falar</button>
        </div>

        <div className="joystick-area">
          <div className="category-label" id="cat-nome">{catNome}</div>

          <div className="joystick-grid">
            {renderJoyBtn(0)}
            {renderJoyBtn(1)}
            {renderJoyBtn(2)}
            
            {renderJoyBtn(3)}
            
            {/* Joystick Center Dot */}
            <div id="joyStick"
              className="joy-btn center-dot"
              ref={joystickRef}
              onPointerDown={startDrag}
              style={{
                transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`
              }}
            >
            </div>
            
            {renderJoyBtn(4)}
            
            {renderJoyBtn(5)}
            {renderJoyBtn(6)}
            {renderJoyBtn(7)}
          </div>
        </div>
      </main>

    </div>
    
  );
};

export default App;
