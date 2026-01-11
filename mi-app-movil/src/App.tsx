// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Sword, Shield, Trash2, PlusCircle, TrendingUp, XCircle, CheckCircle, Search, Download, Upload, Share2, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

// --- 1. TU CONFIGURACIÓN DE FIREBASE ---
// Reemplaza esto con las claves que copiaste de la consola de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDw23wZZARphepRGvCb3rjTi_xDrQnAfBc",
  authDomain: "rkalling-b8a9a.firebaseapp.com",
  projectId: "rkalling-b8a9a",
  storageBucket: "rkalling-b8a9a.firebasestorage.app",
  messagingSenderId: "217373021545",
  appId: "1:217373021545:web:078271562a06d6834419f8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'matchups-app'; // ID fijo para tu app personal

export default function App() {
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados del formulario
  const [myChamp, setMyChamp] = useState('');
  const [enemyChamp, setEnemyChamp] = useState('');
  const [lane, setLane] = useState('Mid');
  const [result, setResult] = useState('Win');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState('');
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);

  // 1. Autenticación Anónima Simplificada
  useEffect(() => {
    const initAuth = async () => {
      try {
         await signInAnonymously(auth);
      } catch (error) {
        console.error("Error de autenticación:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Sincronización de Datos (Firestore)
  useEffect(() => {
    if (!user) return;

    // Referencia a la colección privada del usuario
    const collectionRef = collection(db, 'users', user.uid, 'matchups');

    // Escuchar cambios en tiempo real
    const unsubscribeSnapshot = onSnapshot(collectionRef, (snapshot) => {
      const fetchedMatches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar: más reciente primero
      fetchedMatches.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      setMatches(fetchedMatches);
      setLoading(false);
    }, (error) => {
      console.error("Error al leer datos:", error);
      setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [user]);

  // Manejar envío (Guardar en Firestore)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!myChamp.trim() || !enemyChamp.trim() || !user) return;

    try {
      await addDoc(collection(db, 'users', user.uid, 'matchups'), {
        myChamp: myChamp.trim(),
        enemyChamp: enemyChamp.trim(),
        lane,
        result,
        notes: notes.trim(),
        date: new Date().toLocaleDateString('es-ES'),
        createdAt: Date.now()
      });

      setMyChamp('');
      setEnemyChamp('');
      setNotes('');
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar en el servidor.");
    }
  };

  // Eliminar (Borrar de Firestore)
  const handleDelete = async (docId) => {
    if (!user) return;
    if (confirm('¿Estás seguro de borrar este matchup del servidor?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'matchups', docId));
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  // --- Funciones de Utilidad ---

  const handleExport = () => {
    const dataStr = JSON.stringify(matches, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lol_matchups_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          setIsImporting(true);
          let count = 0;
          const batchPromises = importedData.map(match => {
             const { id, ...matchData } = match; 
             const finalData = {
               ...matchData,
               createdAt: matchData.createdAt || Date.now()
             };
             return addDoc(collection(db, 'users', user.uid, 'matchups'), finalData)
               .then(() => count++)
               .catch(err => console.error("Error importando item", err));
          });
          
          await Promise.all(batchPromises);
          setIsImporting(false);
          alert(`¡Sincronización completada! ${count} partidas subidas a la nube.`);
        } else {
          alert("El archivo no tiene el formato correcto.");
        }
      } catch (err) {
        setIsImporting(false);
        alert("Error al leer el archivo JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleCopyStats = () => {
    const text = `📊 LoL Matchup Stats:\nWin Rate: ${winRate}%\nVictorias: ${wins} - Derrotas: ${losses}\nTotal: ${totalGames} partidas\nCloud Sync: Activo ✅`;
    navigator.clipboard.writeText(text).then(() => alert("Estadísticas copiadas al portapapeles!"));
  };

  // Cálculos
  const totalGames = matches.length;
  const wins = matches.filter(m => m.result === 'Win').length;
  const losses = totalGames - wins;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;

  const filteredMatches = matches.filter(match => 
    match.myChamp.toLowerCase().includes(filter.toLowerCase()) ||
    match.enemyChamp.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white pb-10">
      
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-2.5 rounded-xl shadow-lg shadow-cyan-900/20">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                LoL Matchup Tracker
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Cloud Edition</span>
                {user ? (
                   <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded border border-green-400/20">
                     <Cloud size={10} /> Online
                   </span>
                ) : (
                   <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                     <Loader2 size={10} className="animate-spin" /> Conectando...
                   </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-all hover:text-cyan-400"
            >
              <Download size={14} /> Backup
            </button>
            <button 
              onClick={handleImportClick}
              disabled={isImporting}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-all hover:text-cyan-400 disabled:opacity-50"
            >
              {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} 
              {isImporting ? 'Subiendo...' : 'Restaurar'}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".json" 
              className="hidden" 
            />
            <button 
              onClick={handleCopyStats}
              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold text-white transition-all shadow-lg shadow-cyan-900/30"
            >
              <Share2 size={14} /> Stats
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Input y Stats */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Tarjeta Stats */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 text-slate-700/30 group-hover:text-cyan-900/20 transition-colors">
              <TrendingUp size={120} />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Win Rate Global</h2>
              {loading ? (
                <div className="h-16 flex items-center text-slate-500 gap-2">
                  <Loader2 className="animate-spin" /> Cargando datos...
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className={`text-5xl font-black ${Number(winRate) >= 50 ? 'text-cyan-400' : 'text-slate-200'}`}>
                      {winRate}%
                    </span>
                    <span className="text-sm text-slate-500 font-medium">de {totalGames} partidas</span>
                  </div>
                  
                  <div className="w-full bg-slate-900/50 h-4 rounded-full overflow-hidden flex mb-4 border border-slate-700/50">
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-700 ease-out" style={{ width: `${winRate}%` }}></div>
                    <div className="bg-slate-700 h-full transition-all duration-700 ease-out" style={{ width: `${100 - winRate}%` }}></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 text-center">
                      <div className="text-cyan-400 font-black text-xl">{wins}</div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Victorias</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 text-center">
                      <div className="text-red-400 font-black text-xl">{losses}</div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Derrotas</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Formulario */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
            <h2 className="text-slate-200 font-bold mb-5 flex items-center gap-2 text-lg">
              <PlusCircle className="w-5 h-5 text-cyan-400" /> Nuevo Matchup
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider ml-1">Yo (Campeón)</label>
                  <div className="relative group">
                    <Sword className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      type="text"
                      value={myChamp}
                      onChange={(e) => setMyChamp(e.target.value)}
                      placeholder="Ej. Ahri"
                      disabled={!user}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-sm font-medium disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider ml-1">Rival</label>
                  <div className="relative group">
                    <Shield className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-red-400 transition-colors" />
                    <input
                      type="text"
                      value={enemyChamp}
                      onChange={(e) => setEnemyChamp(e.target.value)}
                      placeholder="Ej. Fizz"
                      disabled={!user}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all text-sm font-medium disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider ml-1">Línea</label>
                  <div className="relative">
                    <select 
                      value={lane}
                      onChange={(e) => setLane(e.target.value)}
                      disabled={!user}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:border-cyan-500 text-sm appearance-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="Top">Top</option>
                      <option value="Jungle">Jungle</option>
                      <option value="Mid">Mid</option>
                      <option value="ADC">ADC</option>
                      <option value="Support">Support</option>
                    </select>
                    <div className="absolute right-3 top-3 pointer-events-none text-slate-500">▼</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider ml-1">Resultado</label>
                  <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setResult('Win')}
                      disabled={!user}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${result === 'Win' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Win
                    </button>
                    <button
                      type="button"
                      onClick={() => setResult('Loss')}
                      disabled={!user}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${result === 'Loss' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Loss
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider ml-1">Notas (Clave para mejorar)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Jugar pasivo hasta nivel 3, comprar Zhonyas..."
                  rows="3"
                  disabled={!user}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:border-cyan-500 text-sm resize-none disabled:opacity-50"
                ></textarea>
              </div>

              <button 
                type="submit"
                disabled={!myChamp || !enemyChamp || !user}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-cyan-900/50 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {!user ? <Loader2 className="animate-spin" /> : <PlusCircle size={20} />}
                {user ? 'REGISTRAR EN LA NUBE' : 'CONECTANDO...'}
              </button>
            </form>
          </div>
        </div>

        {/* Columna Derecha: Historial */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-5 border-b border-slate-700 bg-slate-800/95 backdrop-blur sticky top-0 z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Cloud className="text-cyan-500" size={20} />
                <h2 className="font-bold text-lg text-slate-200">Historial en Nube</h2>
                <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full font-mono">{filteredMatches.length}</span>
              </div>
              
              <div className="relative w-full sm:w-64 group">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Buscar campeón o línea..." 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[700px]">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                   <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
                   <p>Sincronizando partidas...</p>
                </div>
              ) : filteredMatches.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60 py-20">
                  <div className="bg-slate-900 p-6 rounded-full mb-4">
                    <Sword className="w-10 h-10" />
                  </div>
                  <p className="font-medium">No se encontraron partidas</p>
                  <p className="text-sm">¡A jugar se ha dicho!</p>
                </div>
              ) : (
                filteredMatches.map((match) => (
                  <div 
                    key={match.id}
                    className={`relative rounded-xl p-4 border-l-[6px] transition-all hover:bg-slate-750 hover:translate-x-1 shadow-sm ${
                      match.result === 'Win' 
                        ? 'bg-slate-900/40 border-cyan-500 hover:shadow-cyan-900/10' 
                        : 'bg-slate-900/40 border-red-500 hover:shadow-red-900/10'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* Info Principal */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`p-2.5 rounded-xl shrink-0 ${match.result === 'Win' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-400'}`}>
                          {match.result === 'Win' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                        </div>
                        
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-bold text-slate-100 text-lg">{match.myChamp}</span>
                            <span className="text-[10px] text-slate-500 font-black uppercase px-1.5 bg-slate-800 rounded border border-slate-700">VS</span>
                            <span className="font-bold text-slate-300">{match.enemyChamp}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1 font-semibold text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded">
                              {match.lane}
                            </span>
                            <span>{match.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Notas y Acciones */}
                      <div className="flex items-start md:items-center justify-between md:justify-end gap-4 w-full md:w-auto pl-14 md:pl-0">
                        {match.notes && (
                          <div className="text-sm text-slate-400 italic bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 max-w-full md:max-w-[250px] line-clamp-2 md:line-clamp-none">
                            <span className="text-slate-500 not-italic mr-1">📝</span>
                            {match.notes}
                          </div>
                        )}
                        
                        <button 
                          onClick={() => handleDelete(match.id)}
                          className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                          title="Eliminar registro"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}