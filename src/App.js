import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from 'framer-motion';
import { 
  Bus, Footprints, MapPin, Search, Train, Clock, ArrowRight, 
  ChevronDown, Navigation, Compass, Circle, LocateFixed,
  ArrowLeftRight, Calendar, User, Settings, Sun, Battery,
  Signal, Wifi, Target
} from 'lucide-react';

// ==================== HOOK CUSTOMIZADO ====================
const useTransportData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Dados simulados - Em produção, conectar com API GTFS-Realtime
        setData({
          busLines: [
            { id: '1', line: '110.1', destination: 'Rodoviária do Plano Piloto', time: 3, stops: 5, distance: '2.5km' },
            { id: '2', line: '110.2', destination: 'W3 Sul - Via SIA', time: 8, stops: 12, distance: '6.8km' },
            { id: '3', line: '108.1', destination: 'L2 Norte - UnB', time: 12, stops: 8, distance: '10.2km' },
            { id: '4', line: '154.4', destination: 'Cruzeiro Novo', time: 5, stops: 3, distance: '4.1km' },
            { id: '5', line: '163.2', destination: 'Guará II - Via Estádio', time: 15, stops: 18, distance: '12.5km' },
            { id: '6', line: '0.100', destination: 'Setor Oeste - Via EPTG', time: 2, stops: 2, distance: '1.8km' },
            { id: '7', line: '0.111', destination: 'Taguatinga Centro', time: 7, stops: 9, distance: '6.2km' },
          ],
          metroLines: [
            { id: 'm1', line: 'Verde', destination: 'Terminal Ceilândia', time: 7, stops: 4, distance: '8.5km' },
            { id: 'm2', line: 'Laranja', destination: 'Samambaia', time: 4, stops: 2, distance: '4.3km' },
            { id: 'm3', line: 'Verde', destination: 'Central', time: 2, stops: 1, distance: '2.1km' },
          ],
          lastUpdate: new Date().toISOString(),
          activeVehicles: 47,
          onTimeRate: 94
        });
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados de transporte. Tente novamente.');
        console.error('API Error:', err);
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

// ==================== CONSTANTES ====================
const spring = { type: 'spring', stiffness: 100, damping: 20 };

const carouselImages = [
  {
    src: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1400&q=80',
    title: 'Eixo Monumental',
    subtitle: 'A imponência da arquitetura de Brasília',
    location: 'Eixo Monumental',
    time: 'Brasília, DF'
  },
  {
    src: 'https://images.unsplash.com/photo-1596229323364-0f5d8f6715f1?auto=format&fit=crop&w=1400&q=80',
    title: 'Congresso Nacional',
    subtitle: 'O coração da democracia brasileira',
    location: 'Praça dos Três Poderes',
    time: 'Centro Cívico'
  },
  {
    src: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1400&q=80',
    title: 'Ponte JK',
    subtitle: 'Arquitetura e engenharia em harmonia',
    location: 'Lago Sul',
    time: 'Paranoá'
  },
  {
    src: 'https://images.unsplash.com/photo-1583527859375-3d6d8d9b8c1f?auto=format&fit=crop&w=1400&q=80',
    title: 'Catedral de Brasília',
    subtitle: 'Linhas sagradas que tocam o céu',
    location: 'Eixo Monumental',
    time: 'Centro'
  },
  {
    src: 'https://images.unsplash.com/photo-1583417326944-d13c4f4b2b3e?auto=format&fit=crop&w=1400&q=80',
    title: 'Palácio do Planalto',
    subtitle: 'Modernismo e poder em cada traço',
    location: 'Praça dos Três Poderes',
    time: 'Centro Administrativo'
  },
];

const transportModes = [
  { name: 'Ônibus', Icon: Bus, type: 'bus', description: 'Linhas circulares e convencionais', color: '#0066cc' },
  { name: 'Metrô', Icon: Train, type: 'metro', description: 'Conexão rápida entre cidades satélites', color: '#0066cc' },
  { name: 'Pé', Icon: Footprints, type: 'walk', description: 'Trajetos de curta distância', color: '#0066cc' },
];

// ==================== COMPONENTES ====================
const RouteResult = ({ vehicles, type, origin, destination }) => {
  if (!vehicles || vehicles.length === 0) return null;
  
  const bestRoute = vehicles[0];
  const alternatives = vehicles.slice(1, 3);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={spring}
      className="mt-8 space-y-6"
    >
      {/* Melhor Rota */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#1d1d1f]/45 uppercase tracking-wider">
              Melhor rota para hoje
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#1d1d1f]">{origin}</p>
              <ArrowRight className="h-3 w-3 text-[#1d1d1f]/40" strokeWidth={1.2} />
              <p className="text-sm font-semibold text-[#1d1d1f]">{destination}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold text-[#0066cc]">{bestRoute.time} min</p>
            <p className="text-xs text-[#1d1d1f]/45">{bestRoute.stops} paradas</p>
          </div>
        </div>

        {/* Rota Principal */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, ...spring }}
          className="relative overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-white/80 to-white/60 p-4"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-[#0066cc]/10 p-3">
              {type === 'bus' ? 
                <Bus className="h-5 w-5 text-[#0066cc]" strokeWidth={1.2} /> : 
                <Train className="h-5 w-5 text-[#0066cc]" strokeWidth={1.2} />
              }
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-base font-semibold text-[#1d1d1f]">Linha {bestRoute.line}</p>
                <span className="text-xs text-[#1d1d1f]/40">•</span>
                <p className="text-sm text-[#1d1d1f]/60">{bestRoute.destination}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#1d1d1f]/40" strokeWidth={1.2} />
                  <span className="text-xs text-[#1d1d1f]/55">Partida em {bestRoute.time} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5 text-[#1d1d1f]/40" strokeWidth={1.2} />
                  <span className="text-xs text-[#1d1d1f]/55">{bestRoute.distance}</span>
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-full bg-[#0066cc] px-4 py-2 text-xs font-medium text-white transition-all hover:bg-[#0052a3]"
            >
              Iniciar
            </motion.button>
          </div>
        </motion.div>

        {/* Alternativas */}
        {alternatives.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-xs font-medium text-[#1d1d1f]/45 uppercase tracking-wider px-1">
              Outras opções
            </p>
            {alternatives.map((vehicle, idx) => (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + idx * 0.05, ...spring }}
                className="flex items-center justify-between rounded-xl border border-white/40 bg-white/40 px-4 py-3 hover:bg-white/60 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-[#0066cc]/5 p-2">
                    {type === 'bus' ? 
                      <Bus className="h-3.5 w-3.5 text-[#0066cc]" strokeWidth={1.2} /> : 
                      <Train className="h-3.5 w-3.5 text-[#0066cc]" strokeWidth={1.2} />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f]">Linha {vehicle.line}</p>
                    <p className="text-xs text-[#1d1d1f]/45">{vehicle.destination}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#0066cc]">{vehicle.time} min</span>
                  <span className="text-xs text-[#1d1d1f]/40">{vehicle.stops} paradas</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const SlideIndicator = ({ total, current, onClick }) => {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
      {Array.from({ length: total }).map((_, idx) => (
        <button
          key={idx}
          onClick={() => onClick(idx)}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            idx === current ? 'w-8 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
          }`}
        />
      ))}
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================
function App() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedMode, setSelectedMode] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const { data, loading, error } = useTransportData();
  const searchSectionRef = useRef(null);
  const { scrollY } = useScroll();
  
  const searchSectionOpacity = useTransform(scrollY, [0, 300], [0, 1]);
  const searchSectionY = useTransform(scrollY, [0, 300], [50, 0]);
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0.7]);
  const heroScale = useTransform(scrollY, [0, 200], [1, 0.95]);
  
  const smoothSearchOpacity = useSpring(searchSectionOpacity, spring);
  const smoothSearchY = useSpring(searchSectionY, spring);
  const smoothHeroOpacity = useSpring(heroOpacity, spring);
  const smoothHeroScale = useSpring(heroScale, spring);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeItem = carouselImages[activeSlide];

  const handleScrollToSearch = () => {
    searchSectionRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  const handleSearchRoute = () => {
    if (!origin || !destination) return;
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 1000);
  };

  const handleModeSelect = (modeType) => {
    setSelectedMode(selectedMode === modeType ? null : modeType);
  };

  const getVehiclesByMode = () => {
    if (!data) return [];
    if (selectedMode === 'bus') return data.busLines || [];
    if (selectedMode === 'metro') return data.metroLines || [];
    return [];
  };

  const popularDestinations = [
    'Rodoviária do Plano Piloto',
    'Aeroporto de Brasília',
    'Parque da Cidade',
    'Esplanada dos Ministérios'
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] overflow-x-hidden">
      {/* ==================== HERO SECTION ==================== */}
      <motion.div 
        style={{ opacity: smoothHeroOpacity, scale: smoothHeroScale }}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Carrossel Background */}
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
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
        </div>

        {/* Conteúdo do Hero */}
        <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ...spring }}
            className="space-y-8"
          >
            {/* Badge Tempo Real */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="inline-flex items-center gap-2 rounded-full glass-effect-dark px-4 py-2 mx-auto"
            >
              <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-white/90 tracking-wide">
                Dados em tempo real • {loading ? 'Atualizando...' : `${data?.activeVehicles || 0} veículos ativos`}
              </span>
            </motion.div>
            
            {/* Título Principal */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-[1.1]">
              Mobilidade em Brasília
              <br />
              <span className="bg-gradient-to-r from-[#0066cc] to-[#40a0ff] bg-clip-text text-transparent">
                com precisão cirúrgica
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto font-light leading-relaxed">
              Tecnologia de ponta para deslocamentos inteligentes na capital do Brasil
            </p>
            
            {/* CTA Button */}
            <motion.button
              onClick={handleScrollToSearch}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              transition={spring}
              className="group bg-[#0066cc] text-white rounded-full px-8 py-4 md:px-10 md:py-5 font-semibold text-lg shadow-2xl shadow-black/20 hover:shadow-[#0066cc]/30 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                Localizar meu transporte agora
                <ChevronDown className="h-5 w-5 group-hover:translate-y-1 transition-transform" strokeWidth={1.5} />
              </span>
            </motion.button>

            {/* Indicador de Scroll */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60">
              <span className="text-xs text-white/60 tracking-wider">SCROLL</span>
              <div className="h-10 w-0.5 bg-white/40 rounded-full" />
            </div>
          </motion.div>
        </div>

        {/* Slide Indicator */}
        <SlideIndicator 
          total={carouselImages.length}
          current={activeSlide}
          onClick={setActiveSlide}
        />
      </motion.div>

      {/* ==================== SEÇÃO DE BUSCA ==================== */}
      <motion.div
        ref={searchSectionRef}
        style={{ opacity: smoothSearchOpacity, y: smoothSearchY }}
        className="relative z-20 -mt-20 px-4 pb-20"
      >
        <div className="max-w-5xl mx-auto">
          {/* Container Principal Glassmorphism */}
          <div className="rounded-[2.5rem] border border-white/60 bg-white/70 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Header com Gradiente */}
            <div className="bg-gradient-to-r from-[#0066cc]/5 to-transparent px-6 py-5 border-b border-white/40">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#1d1d1f]">Planeje sua rota</h2>
                  <p className="text-sm text-[#1d1d1f]/45 mt-0.5">Compare rotas em segundos com dados reais</p>
                </div>
                {!loading && data && (
                  <div className="flex items-center gap-3 rounded-full bg-emerald-500/10 px-3 py-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-medium text-emerald-600">
                      {data.onTimeRate}% de pontualidade
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6">
              {/* Campos de Origem/Destino */}
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <div className="rounded-full bg-[#0066cc]/10 p-1">
                      <LocateFixed className="h-3.5 w-3.5 text-[#0066cc]" strokeWidth={1.5} />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="De onde você vai sair?"
                    className="w-full rounded-2xl border border-white/50 bg-white/90 pl-12 pr-4 py-3.5 text-base text-[#1d1d1f] placeholder:text-[#1d1d1f]/40 focus:outline-none focus:border-[#0066cc]/50 focus:ring-1 focus:ring-[#0066cc]/20 transition-all"
                  />
                </div>
                
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <div className="rounded-full bg-[#0066cc]/10 p-1">
                      <Target className="h-3.5 w-3.5 text-[#0066cc]" strokeWidth={1.5} />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Para onde você vai?"
                    className="w-full rounded-2xl border border-white/50 bg-white/90 pl-12 pr-4 py-3.5 text-base text-[#1d1d1f] placeholder:text-[#1d1d1f]/40 focus:outline-none focus:border-[#0066cc]/50 focus:ring-1 focus:ring-[#0066cc]/20 transition-all"
                  />
                </div>

                {/* Destinos populares */}
                {!origin && !destination && (
                  <div className="flex flex-wrap gap-2 px-2">
                    <p className="text-xs text-[#1d1d1f]/40 mr-1">Destinos populares:</p>
                    {popularDestinations.map((dest, idx) => (
                      <button
                        key={idx}
                        onClick={() => setDestination(dest)}
                        className="text-xs text-[#0066cc] hover:bg-[#0066cc]/10 px-2 py-0.5 rounded-full transition-colors"
                      >
                        {dest}
                      </button>
                    ))}
                  </div>
                )}

                <motion.button
                  onClick={handleSearchRoute}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!origin || !destination}
                  className={`w-full rounded-2xl px-6 py-3.5 font-semibold transition-all ${
                    origin && destination
                      ? 'bg-[#0066cc] text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isSearching ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Calculando melhor rota...
                    </span>
                  ) : (
                    'Traçar rota inteligente'
                  )}
                </motion.button>
              </div>

              {/* Modalidades de Transporte */}
              <div className="mt-8">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">Modalidades disponíveis</h3>
                  <div className="h-4 w-px bg-[#1d1d1f]/20" />
                  <p className="text-xs text-[#1d1d1f]/45">Escolha sua preferência</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {transportModes.map(({ name, Icon, type, description }) => (
                    <motion.button
                      key={name}
                      onClick={() => handleModeSelect(type)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={spring}
                      className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                        selectedMode === type
                          ? 'border-[#0066cc]/40 bg-[#0066cc]/5 shadow-md'
                          : 'border-white/50 bg-white/60 hover:bg-white/80'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="h-5 w-5 text-[#0066cc]" strokeWidth={1.2} />
                            <span className="text-sm font-semibold text-[#1d1d1f]">{name}</span>
                          </div>
                          <p className="text-xs text-[#1d1d1f]/45">{description}</p>
                        </div>
                        {selectedMode === type && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="rounded-full bg-[#0066cc] p-1"
                          >
                            <Circle className="h-2 w-2 fill-white text-white" />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Resultados da Rota */}
              {loading && (
                <div className="mt-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 rounded-2xl bg-gray-200/60" />
                    </div>
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 rounded-xl bg-red-50/90 p-4 text-center"
                >
                  <p className="text-sm text-red-600">⚠️ {error}</p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default App;