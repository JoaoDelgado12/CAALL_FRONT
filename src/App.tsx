import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import { falar } from './components/voice';
import { mapWord } from './components/dictionary';

const App: React.FC = () => {
  const [fraseAtual, setFraseAtual] = useState<string[]>([]);
  const [menuAberto, setMenuAberto] = useState(false);
  const [catNome, setCatNome] = useState("Selecione Categoria");
  const [labels, setLabels] = useState<string[]>([]);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[]>([]);

  // Drag State Tracking
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const activeTargetRef = useRef<number | null>(null);
  const maxDistanceRef = useRef(110);
  const labelsRef = useRef<string[]>(labels);

  const joystickRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    labelsRef.current = labels;
  }, [labels]);

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
  };

  const selecionar = useCallback((cat: number) => {
    const newLabels = Array.from({ length: 8 }).map((_, i) => {
      const wordList = mapWord.get(String(i + 1));
      return wordList && wordList[cat - 1] ? wordList[cat - 1] : "---";
    });
    setLabels(newLabels);
  }, []);

  useEffect(() => {
    const carregarVozes = () => setVozes(window.speechSynthesis.getVoices());
    carregarVozes();
    window.speechSynthesis.onvoiceschanged = carregarVozes;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
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

  // Spatial Hover Detection (Applies bounding box logic for visual feedback)
  const checkProximity = useCallback((clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    
    // Drag threshold to avoid accidental selections on simple taps
    const dragDist = Math.sqrt(
      (clientX - startPosRef.current.x) ** 2 + 
      (clientY - startPosRef.current.y) ** 2
    );

    if (dragDist < 25) {
      activeTargetRef.current = null;
      return;
    }

    const joyRect = joystickRef.current.getBoundingClientRect();
    const joyCx = joyRect.left + joyRect.width / 2;
    const joyCy = joyRect.top + joyRect.height / 2;

    const btns = document.querySelectorAll('.joy-btn[data-index]');
    let hoveredIndex: number | null = null;
    let minDistance = Infinity;
    let nearestIndex: number | null = null;

    btns.forEach((btn) => {
      const rect = btn.getBoundingClientRect();
      const btnIndex = Number(btn.getAttribute('data-index'));

      // Strict Box Collision
      if (joyCx >= rect.left && joyCx <= rect.right && joyCy >= rect.top && joyCy <= rect.bottom) {
        hoveredIndex = btnIndex;
      }

      // Nearest Neighbor calculation
      const btnCx = rect.left + rect.width / 2;
      const btnCy = rect.top + rect.height / 2;
      const dist = Math.sqrt((joyCx - btnCx) ** 2 + (joyCy - btnCy) ** 2);

      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = btnIndex;
      }
    });

    activeTargetRef.current = hoveredIndex !== null ? hoveredIndex : nearestIndex;
  }, []);

  // Global Pointer Move Handler
  const handleGlobalPointerMove = useCallback((e: PointerEvent) => {
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
    checkProximity(e.clientX, e.clientY);
  }, [checkProximity]);

  // Global Pointer Up Handler (Implements Modules 1, 2, and 3)
  const handleGlobalPointerUp = useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    window.removeEventListener('pointermove', handleGlobalPointerMove);
    window.removeEventListener('pointerup', handleGlobalPointerUp);

    const joystick = joystickRef.current;
    let finalTargetIndex: number | null = null;

    if (joystick) {
      // MODULE 1: Capture Joystick Center
      const joyRect = joystick.getBoundingClientRect();
      const joyCx = joyRect.left + joyRect.width / 2;
      const joyCy = joyRect.top + joyRect.height / 2;

      // MODULE 2 & 3: Bounding Box Collision and Fallback
      const btns = document.querySelectorAll('.joy-btn[data-index]');
      let minDistance = Infinity;
      let nearestIndex: number | null = null;

      btns.forEach((btn) => {
        const rect = btn.getBoundingClientRect();
        const btnIndex = Number(btn.getAttribute('data-index'));

        // Strict Box Collision Check
        if (joyCx >= rect.left && joyCx <= rect.right && joyCy >= rect.top && joyCy <= rect.bottom) {
          finalTargetIndex = btnIndex;
        }

        // Euclidean Distance for nearest neighbor calculation
        const btnCx = rect.left + rect.width / 2;
        const btnCy = rect.top + rect.height / 2;
        const dist = Math.sqrt((joyCx - btnCx) ** 2 + (joyCy - btnCy) ** 2);

        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = btnIndex;
        }
      });

      // Calculate total drag distance to ensure intent
      const dragDist = Math.sqrt(
        (e.clientX - startPosRef.current.x) ** 2 + 
        (e.clientY - startPosRef.current.y) ** 2
      );

      // Fallback: If no direct collision but dragged far enough, pick the closest button
      if (finalTargetIndex === null && nearestIndex !== null && dragDist > 25) {
        finalTargetIndex = nearestIndex;
      }
    }

    // Apply the selection
    if (finalTargetIndex !== null) {
      const currentLabels = labelsRef.current;
      const selectedLabel = currentLabels[finalTargetIndex];
      if (selectedLabel) {
        setFraseAtual((prev) => [...prev, selectedLabel]);
        setCatNome(selectedLabel);
        selecionar(finalTargetIndex + 1);
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }

    // Reset State & UI
    activeTargetRef.current = null;
    setJoystickPos({ x: 0, y: 0 });

    if (joystickRef.current) {
      joystickRef.current.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }
  }, [handleGlobalPointerMove, selecionar]);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    if (joystickRef.current) {
      joystickRef.current.style.transition = 'none';
    }

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });
    window.addEventListener('pointerup', handleGlobalPointerUp);
  };

  const renderJoyBtn = (labelIndex: number) => {
    const isHovered = activeTargetRef.current === labelIndex;
    return (
      <button
        key={labelIndex}
        data-index={labelIndex}
        className={`joy-btn ${isHovered ? 'hovered' : ''}`}
        style={isHovered ? { transform: 'scale(1.2)', backgroundColor: '#e0f7fa' } : {}}
      >
        {labels[labelIndex]}
      </button>
    );
  };

  return (
    <div className="pwa-container">
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
            
            <div 
              id="joyStick"
              className="joy-btn center-dot"
              ref={joystickRef}
              onPointerDown={startDrag}
              style={{
                transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`
              }}
            />
            
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