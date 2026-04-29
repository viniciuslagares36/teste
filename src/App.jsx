import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bus, Footprints, MapPin, Train, Clock, ArrowRight, ChevronDown, Circle } from 'lucide-react';

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
            { id: '1', line: '110.1', destination: 'Rodoviaria do Plano Piloto', time: 3, stops: 5 },
            { id: '2', line: '110.2', destination: 'W3 Sul - Via SIA', time: 8, stops: 12 },
            { id: '3', line: '108.1', destination: 'L2 Norte - UnB', time: 12, stops: 8 },
          ],
          metroLines: [
            { id: 'm1', line: 'Verde', destination: 'Terminal Ceilandia', time: 7, stops: 4 },
            { id: 'm2', line: 'Laranja', destination: 'Samambaia', time: 4, stops: 2 },
          ],
        });
      } catch (err) {
        setError('Erro ao carregar dados');
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
  },
  {
    src: 'https://images.unsplash.com/photo-1596229323364-0f5d8f6715f1?auto=format&fit=crop&w=1400&q=80',
    title: 'Congresso Nacional',
  },
  {
    src: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1400&q=80',
    title: 'Ponte JK',
  },
];

const RouteResult = ({ vehicles, type, origin, destination }) => {
  if (!vehicles || vehicles.length === 0) return null;
  
  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Melhor rota</p>
          <p className="text-sm font-semibold mt-1">{origin} → {destination}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold text-blue-600">{vehicles[0].time} min</p>
        </div>
      </div>
      
      {vehicles.slice(0, 3).map((vehicle) => (
        <div key={vehicle.id} className="flex items-center justify-between rounded-xl border bg-white p-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              {type === 'bus' 
                ? <Bus className="h-4 w-4 text-blue-600" />
                : <Train className="h-4 w-4 text-blue-600" />
              }
            </div>
            <div>
              <p className="font-semibold text-sm">Linha {vehicle.line}</p>
              <p className="text-xs text-gray-500">{vehicle.destination}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-sm font-medium text-blue-600">{vehicle.time} min</span>
          </div>
        </div>
      ))}
    </div>
  );
};

function App() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedMode, setSelectedMode] = useState(null);
  const searchRef = useRef(null);
  
  const { data, loading, error } = useTransportData();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSearch = () => {
    searchRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getVehicles = () => {
    if (!data) return [];
    if (selectedMode === 'bus') return data.busLines;
    if (selectedMode === 'metro') return data.metroLines;
    return [];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative h-screen flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <img src={carouselImages[activeSlide].src} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 text-center px-6">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
            Mobilidade em Brasilia
          </h1>
          <p className="text-xl text-white/90 mb-8">Precisao cirurgica para seus deslocamentos</p>
          <button
            onClick={scrollToSearch}
            className="bg-blue-600 text-white rounded-full px-8 py-4 font-semibold text-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
          >
            Localizar meu transporte
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        <div className="absolute bottom-8 left-1/2 flex gap-2">
          {carouselImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === activeSlide ? 'w-8 bg-white' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Search Section */}
      <div ref={searchRef} className="max-w-4xl mx-auto px-4 -mt-20 pb-20">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <div>
              <h2 className="text-xl font-semibold">Planeje sua rota</h2>
              <p className="text-sm text-gray-500">Compare rotas em segundos</p>
            </div>
            {!loading && data && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600">Dados ao vivo</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Ponto de partida"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3"
            />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Destino final"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3"
            />
          </div>

          <div className="mt-8">
            <h3 className="font-semibold mb-3">Modalidades</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Onibus', type: 'bus', icon: Bus },
                { name: 'Metro', type: 'metro', icon: Train },
                { name: 'Pe', type: 'walk', icon: Footprints },
              ].map((mode) => (
                <button
                  key={mode.name}
                  onClick={() => setSelectedMode(selectedMode === mode.type ? null : mode.type)}
                  className={`rounded-2xl border p-4 text-center transition ${
                    selectedMode === mode.type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <mode.icon className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">{mode.name}</p>
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="mt-6 space-y-3">
              <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            </div>
          )}

          {!loading && selectedMode && origin && destination && (
            <RouteResult 
              vehicles={getVehicles()} 
              type={selectedMode}
              origin={origin}
              destination={destination}
            />
          )}

          {error && (
            <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-xl text-center text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;