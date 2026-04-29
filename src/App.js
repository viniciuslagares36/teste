import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bus, Footprints, MapPin, Search, Train, Clock, ArrowRight } from 'lucide-react';

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
            { id: '110.1', destination: 'Rodoviária do Plano Piloto', time: 3, line: '110.1' },
            { id: '110.2', destination: 'W3 Sul - Via SIA', time: 8, line: '110.2' },
            { id: '108.1', destination: 'L2 Norte - UnB', time: 12, line: '108.1' },
            { id: '154.4', destination: 'Cruzeiro Novo', time: 5, line: '154.4' },
          ],
          metroLines: [
            { id: 'Verde', destination: 'Terminal Ceilândia', time: 7, line: 'Verde' },
            { id: 'Laranja', destination: 'Samambaia', time: 4, line: 'Laranja' },
          ]
        });
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { data, loading, error };
};

const spring = { type: 'spring', stiffness: 100, damping: 20 };

const carouselImages = [
  {
    src: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1400&q=80',
    title: 'Eixo Monumental',
    subtitle: 'Mobilidade em sincronia com a arquitetura da cidade',
  },
  {
    src: 'https://images.unsplash.com/photo-1596229323364-0f5d8f6715f1?auto=format&fit=crop&w=1400&q=80',
    title: 'Congresso Nacional',
    subtitle: 'Linhas estratégicas conectando o coração cívico',
  },
  {
    src: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1400&q=80',
    title: 'Ponte JK',
    subtitle: 'Trajetos inteligentes entre lago e centro urbano',
  },
];

const transportModes = [
  { name: 'Ônibus', Icon: Bus, type: 'bus' },
  { name: 'Metrô', Icon: Train, type: 'metro' },
  { name: 'Pé', Icon: Footprints, type: 'walk' },
];

const VehicleList = ({ vehicles, type }) => {
  if (!vehicles || vehicles.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={spring}
      className="mt-4 space-y-2"
    >
      <div className="flex items-center justify-between px-2 mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Próximos {type === 'bus' ? 'Ônibus' : 'Trens'}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-medium text-emerald-600">Ao Vivo</span>
        </div>
      </div>
      
      {vehicles.map((vehicle, idx) => (
        <motion.div
          key={vehicle.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05, ...spring }}
          className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white/40 px-4 py-3 hover:bg-white/60 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-500/10 p-2">
              {type === 'bus' ? <Bus className="h-4 w-4 text-blue-600" /> : <Train className="h-4 w-4 text-blue-600" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{vehicle.line}</p>
              <p className="text-xs text-gray-500">{vehicle.destination}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-sm font-medium text-blue-600">{vehicle.time} min</span>
            <ArrowRight className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

function App() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const { data, loading, error } = useTransportData();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselImages.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const activeItem = carouselImages[activeSlide];

  const handleModeSelect = (modeType) => {
    setSelectedMode(selectedMode === modeType ? null : modeType);
  };

  const getVehiclesByMode = () => {
    if (!data) return [];
    if (selectedMode === 'bus') return data.busLines || [];
    if (selectedMode === 'metro') return data.metroLines || [];
    return [];
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Navbar */}
      <nav className="fixed inset-x-0 top-5 z-50 mx-auto flex w-[min(94%,72rem)] items-center justify-between rounded-3xl border border-white/60 bg-white/70 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900/90">
          <MapPin className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
          <span>LocalizaBus · Brasília</span>
        </div>
        <div className="text-xs font-medium text-gray-500">Dashboard</div>
      </nav>

      {/* Conteúdo Principal */}
      <div className="relative mx-auto flex w-[min(94%,72rem)] flex-col gap-12 px-2 pb-16 pt-36">
        {/* Background Image */}
        <div 
          className="absolute inset-x-2 top-32 -z-10 h-[22rem] overflow-hidden rounded-3xl border border-white/50 bg-white/40 backdrop-blur-md"
          style={{
            backgroundImage: `url(${activeItem.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-blue-600/20" />
        </div>

        {/* Header */}
        <div className="space-y-5 px-5 pt-8">
          <p className="text-xs uppercase tracking-wider text-gray-600">Mobilidade Inteligente</p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight md:text-6xl">
            Descubra o melhor trajeto em Brasília com fluidez iOS.
          </h1>
        </div>

        {/* Search Bar */}
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/60 bg-white/70 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-5 py-4">
            <Search className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Pesquisar origem, destino ou parada"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* Carousel Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-4 backdrop-blur-md">
            <div className="relative h-[18rem] overflow-hidden rounded-2xl">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeItem.src}
                  src={activeItem.src}
                  alt={activeItem.title}
                  initial={{ opacity: 0, scale: 1 }}
                  animate={{ opacity: 1, scale: 1.05 }}
                  exit={{ opacity: 0, scale: 1 }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            </div>
            <div className="mt-5 space-y-2 px-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeItem.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={spring}
                >
                  <h2 className="text-2xl font-semibold">{activeItem.title}</h2>
                  <p className="text-sm text-gray-600">{activeItem.subtitle}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Modes Card */}
          <aside className="rounded-3xl border border-white/60 bg-white/70 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Modalidades</h3>
              {!loading && data && (
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[11px] font-medium text-emerald-600">• Ao Vivo</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600">Escolha como deseja se deslocar agora.</p>
            
            {loading ? (
              <div className="mt-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
                    <div className="h-4 w-20 rounded-lg bg-gray-300"></div>
                    <div className="h-5 w-5 rounded-lg bg-gray-300"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {transportModes.map(({ name, Icon, type }) => (
                  <div key={name}>
                    <motion.button
                      onClick={() => handleModeSelect(type)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={spring}
                      className={`w-full flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all ${
                        selectedMode === type
                          ? 'border-blue-600/30 bg-blue-600/5'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-medium">{name}</span>
                      <Icon className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
                    </motion.button>
                    
                    {selectedMode === type && (
                      <AnimatePresence mode="wait">
                        {getVehiclesByMode().length > 0 && (
                          <VehicleList vehicles={getVehiclesByMode()} type={type} />
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {error && !loading && (
              <div className="mt-4 rounded-xl bg-red-50/80 p-3 text-center text-xs text-red-600">
                ⚠️ {error}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

export default App;
