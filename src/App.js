import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from 'framer-motion';
import { 
  Bus, Footprints, MapPin, Search, Train, Clock, ArrowRight, 
  ChevronDown, Navigation, Circle, LocateFixed, Target
} from 'lucide-react';

// Hook de dados
const useTransportData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setData({
          busLines: [
            { id: '1', line: '110.1', destination: 'Rodoviária do Plano Piloto', time: 3, stops: 5, distance: '2.5km' },
            { id: '2', line: '110.2', destination: 'W3 Sul - Via SIA', time: 8, stops: 12, distance: '6.8km' },
            { id: '3', line: '108.1', destination: 'L2 Norte - UnB', time: 12, stops: 8, distance: '10.2km' },
            { id: '4', line: '154.4', destination: 'Cruzeiro Novo', time: 5, stops: 3, distance: '4.1km' },
            { id: '5', line: '163.2', destination: 'Guará II - Via Estádio', time: 15, stops: 18, distance: '12.5km' },
          ],
          metroLines: [
            { id: 'm1', line: 'Verde', destination: 'Terminal Ceilândia', time: 7, stops: 4, distance: '8.5km' },
            { id: 'm2', line: 'Laranja', destination: 'Samambaia', time: 4, stops: 2, distance: '4.3km' },
          ],
          lastUpdate: new Date().toISOString(),
          activeVehicles: 47,
          onTimeRate: 94
        });
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados de transporte');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
};

const spring = { type: 'spring', stiffness: 100, damping: 20 };

const carouselImages = [
  {
    src: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1400&q=80',
    title: 'Eixo Monumental',
    subtitle: 'A imponência da arquitetura de Brasília',
  },
  {
    src: 'https://images.unsplash.com/photo-1596229323364-0f5d8f6715f1?auto=format&fit=crop&w=1400&q=80',
    title: 'Congresso Nacional',
    subtitle: 'O coração da democracia brasileira',
  },
  {
    src: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1400&q=80',
    title: 'Ponte JK',
    subtitle: 'Arquitetura e engenharia em harmonia',
  },
];

const transportModes = [
  { name: 'Ônibus', Icon: Bus, type: 'bus', description: 'Linhas circulares e convencionais' },
  { name: 'Metrô', Icon: Train, type: 'metro', description: 'Conexão rápida entre cidades satélites' },
  { name: 'Pé', Icon: Footprints, type: 'walk', description: 'Trajetos de curta distância' },
];

// Componente de Resultado
const RouteResult = ({ vehicles, type, origin, destination }) => {
  if (!vehicles || vehicles.length === 0) return null;
  
  const bestRoute = vehicles[0];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={spring}
      className="mt-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Melhor rota encontrada
          </p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm font-semibold text-gray-900">{origin}</p>
            <ArrowRight className="h-3 w-3 text-gray-400" strokeWidth={1.2} />
            <p className="text-sm font-semibold text-gray-900">{destination}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-blue-600">{bestRoute.time} min</p>
          <p className="text-xs text-gray-500">{bestRoute.stops} paradas</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-medium text-emerald-600">Dados em tempo real</span>
        </div>
        
        {vehicles.slice(0, 3).map((vehicle, idx) => (
          <motion.div
            key={vehicle.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05, ...spring }}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/60 p-3 hover:bg-white/80 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/10 p-2">
                {type === 'bus' 
                  ? <Bus className="h-4 w-4 text-blue-600" strokeWidth={1.2} />
                  : <Train className="h-4 w-4 text-blue-600" strokeWidth={1.2} />
                }
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Linha {vehicle.line}</p>
                <p className="text-xs text-gray-500">{vehicle.destination}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-gray-400" strokeWidth={1.2} />
              <span className="text-sm font-medium text-blue-600">{vehicle.time} min</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// Componente Principal
function App() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedMode, setSelectedMode] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const { data, loading, error } = useTransportData();
  const searchSectionRef = useRef(null);
  const { scrollY } = useScroll();
  
  const searchOpacity = useTransform(scrollY, [200, 400], [0, 1]);
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0.8]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeItem = carouselImages[activeSlide];

  const scrollToSearch = () => {
    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSearch = () => {
    if (!origin || !destination) return;
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 1000);
  };

  const getVehiclesByMode = () => {
    if (!data) return [];
    if (selectedMode === 'bus') return data.busLines || [];
    if (selectedMode === 'metro') return data.metroLines || [];
    return [];
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
          >
            <img 
              src={activeItem.src} 
              alt={activeItem.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ...spring }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2">
              <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-white/90">
                Dados em tempo real
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
              Mobilidade em Brasília
              <br />
              <span className="text-blue-400">com precisão cirúrgica</span>
            </h1>
            
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              Tecnologia de ponta para deslocamentos inteligentes na capital
            </p>
            
            <button
              onClick={scrollToSearch}
              className="group bg-blue-600 text-white rounded-full px-8 py-4 font-semibold text-lg shadow-2xl hover:bg-blue-700 transition-all"
            >
              <span className="flex items-center gap-2">
                Localizar meu transporte agora
                <ChevronDown className="h-5 w-5 group-hover:translate-y-1 transition-transform" />
              </span>
            </button>
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {carouselImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === activeSlide ? 'w-8 bg-white' : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Search Section */}
      <motion.div
        ref={searchSectionRef}
        style={{ opacity: searchOpacity }}
        className="relative z-20 -mt-20 px-4 pb-20"
      >
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl shadow-xl p-6 border border-white/60">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold">Planeje sua rota</h2>
                <p className="text-sm text-gray-500 mt-1">Compare rotas em segundos</p>
              </div>
              {!loading && data && (
                <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-600">Dados ao vivo</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="relative">
                <LocateFixed className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Ponto de partida"
                  className="w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div className="relative">
                <Target className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Destino final"
                  className="w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={!origin || !destination}
                className={`w-full rounded-2xl py-3 font-semibold transition-all ${
                  origin && destination
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSearching ? 'Calculando...' : 'Traçar rota inteligente'}
              </button>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-semibold mb-4">Modalidades disponíveis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {transportModes.map(({ name, Icon, type, description }) => (
                  <button
                    key={name}
                    onClick={() => setSelectedMode(selectedMode === type ? null : type)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      selectedMode === type
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 text-blue-600 mb-2" />
                    <p className="font-semibold text-sm">{name}</p>
                    <p className="text-xs text-gray-500 mt-1">{description}</p>
                  </button>
                ))}
              </div>
            </div>

            {loading && (
              <div className="mt-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            )}

            {!loading && selectedMode && origin && destination && (
              <RouteResult 
                vehicles={getVehiclesByMode()} 
                type={selectedMode}
                origin={origin}
                destination={destination}
              />
            )}

            {error && !loading && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-center">
                <p className="text-sm text-red-600">⚠️ {error}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default App;