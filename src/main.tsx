import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/*f('ServiceWorker' in navigator) {
  window.addEventListener('load', async () =>{
    try{
      const register = await navigator.serviceWorker.register('sw.ts')
    }catch{
      console.log('Erro na operação do SW ou do FIREBASE')
    }
  })
}*/

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
