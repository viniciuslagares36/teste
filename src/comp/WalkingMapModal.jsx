// src/comp/WalkingMapModal.jsx
// Modal de mapa de caminhada com TomTom SDK — tracker ao vivo, estética LocalizaBus
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Footprints, Navigation, Clock, MapPin, ChevronUp, ChevronDown, Play, Square, RotateCcw } from 'lucide-react';

const TOMTOM_API_KEY = 'kVt12B5jgJTHfcvXLLDSPgcX6bz4f7R1';

// ── Haversine ────────────────────────────────────────────────────────────────
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fmtDist = (m) =>
  m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;

const fmtTime = (sec) => {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
};

// ── TomTom SDK loader ────────────────────────────────────────────────────────
let sdkLoadPromise = null;
const loadTomTomSDK = () => {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve, reject) => {
    if (window.tt) { resolve(window.tt); return; }

    // CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css';
    document.head.appendChild(link);

    // JS
    const script = document.createElement('script');
    script.src = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js';
    script.onload = () => resolve(window.tt);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return sdkLoadPromise;
};

// ── Pegar rota pedestre via TomTom Routing ───────────────────────────────────
const fetchWalkingRoute = async (origin, destination) => {
  const url =
    `https://api.tomtom.com/routing/1/calculateRoute/` +
    `${origin.lat},${origin.lon}:${destination.lat},${destination.lon}/json` +
    `?key=${TOMTOM_API_KEY}&travelMode=pedestrian&routeType=shortest&traffic=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro ao calcular rota');
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error('Nenhuma rota encontrada');

  const points = route.legs[0].points.map((p) => [p.longitude, p.latitude]);
  const summary = route.summary;

  return {
    points,
    distanceMeters: summary.lengthInMeters,
    travelTimeSeconds: summary.travelTimeInSeconds,
    geojson: {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: points },
    },
  };
};

// ── Componente principal ─────────────────────────────────────────────────────
const WalkingMapModal = ({ route, userLocation, onClose, isDark }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const [sdkReady, setSdkReady] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

  const [userPos, setUserPos] = useState(userLocation || null);
  const [tracking, setTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distCovered, setDistCovered] = useState(0);
  const [distRemaining, setDistRemaining] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [arrived, setArrived] = useState(false);

  // Destino: coordenadas do ponto de embarque da rota de ônibus
  const destination = {
    lat: route.lat ?? -15.7934,
    lon: route.lon ?? -47.8823,
    name: route.fromStop || 'Ponto de embarque',
  };

  const origin = userLocation || { lat: -15.7934, lon: -47.8823 };

  // ── Carregar SDK ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadTomTomSDK()
      .then(() => setSdkReady(true))
      .catch(() => setRouteError('Falha ao carregar SDK do mapa'));
  }, []);

  // ── Inicializar mapa ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sdkReady || !mapContainerRef.current || mapRef.current) return;

    const map = window.tt.map({
      key: TOMTOM_API_KEY,
      container: mapContainerRef.current,
      center: [origin.lon, origin.lat],
      zoom: 15,
      style: isDark
        ? 'https://api.tomtom.com/style/2/custom/style/dHRzdHlsZTo6OWY4ZDM5M2MtYTM4My00NGI5LTk0ZWMtNmE4ZjYxNzUyYjYw/drafts/0.json?key=' + TOMTOM_API_KEY
        : `https://api.tomtom.com/map/1/style/22.2.1-1/basic_main.json?key=${TOMTOM_API_KEY}`,
      language: 'pt-BR',
    });

    // Controles
    map.addControl(new window.tt.NavigationControl({ showZoom: true, showCompass: true }), 'bottom-right');

    mapRef.current = map;
    map.on('load', () => {
      drawRoute(map);
      addDestinationMarker(map);
      addUserMarker(map, origin);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [sdkReady]);

  // ── Buscar rota walking ─────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingRoute(true);
    fetchWalkingRoute(origin, destination)
      .then((data) => {
        setRouteData(data);
        setDistRemaining(data.distanceMeters);
        setLoadingRoute(false);
        if (mapRef.current && mapRef.current.loaded()) {
          drawRoute(mapRef.current, data);
          fitBounds(mapRef.current, data.points);
        }
      })
      .catch((e) => {
        setRouteError(e.message);
        setLoadingRoute(false);
      });
  }, []);

  const drawRoute = useCallback((map, data) => {
    const rd = data || routeData;
    if (!rd || !map.getStyle) return;
    try {
      if (map.getSource('walk-route')) {
        map.getSource('walk-route').setData(rd.geojson);
        return;
      }
      map.addSource('walk-route', { type: 'geojson', data: rd.geojson });
      // Sombra
      map.addLayer({
        id: 'walk-route-shadow',
        type: 'line',
        source: 'walk-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#000', 'line-width': 8, 'line-opacity': 0.15, 'line-blur': 4 },
      });
      // Rota principal — cyan neon para combinar com estética
      map.addLayer({
        id: 'walk-route-line',
        type: 'line',
        source: 'walk-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#00f3ff',
          'line-width': 5,
          'line-opacity': 0.95,
        },
      });
      // Tracejado animado sobre a rota
      map.addLayer({
        id: 'walk-route-dash',
        type: 'line',
        source: 'walk-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': 2,
          'line-dasharray': [2, 4],
          'line-opacity': 0.7,
        },
      });
    } catch (_) {}
  }, [routeData]);

  const fitBounds = (map, points) => {
    if (!points?.length) return;
    const lons = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);
    map.fitBounds(
      [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
      { padding: { top: 80, bottom: 220, left: 40, right: 40 }, duration: 800 }
    );
  };

  const addDestinationMarker = (map) => {
    // Pin de destino customizado
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        width:40px;height:40px;border-radius:50% 50% 50% 0;
        background:linear-gradient(135deg,#0071e3,#00f3ff);
        border:3px solid #fff;
        box-shadow:0 4px 16px rgba(0,113,227,0.5);
        transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center;
      ">
        <div style="transform:rotate(45deg);color:white;font-size:16px;">🚌</div>
      </div>
    `;
    el.style.cursor = 'pointer';
    new window.tt.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([destination.lon, destination.lat])
      .addTo(map);
  };

  const addUserMarker = (map, pos) => {
    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([pos.lon, pos.lat]);
      return;
    }
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="position:relative;width:24px;height:24px;">
        <div style="
          position:absolute;inset:0;border-radius:50%;
          background:rgba(0,113,227,0.25);
          animation:pulse-ring 2s infinite;
        "></div>
        <div style="
          position:absolute;inset:4px;border-radius:50%;
          background:#0071e3;border:2.5px solid #fff;
          box-shadow:0 2px 8px rgba(0,113,227,0.6);
        "></div>
      </div>
      <style>
        @keyframes pulse-ring{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.5);opacity:0}}
      </style>
    `;
    userMarkerRef.current = new window.tt.Marker({ element: el, anchor: 'center' })
      .setLngLat([pos.lon, pos.lat])
      .addTo(map);
  };

  // ── Atualizar posição no mapa ───────────────────────────────────────────────
  const updatePosition = useCallback((pos) => {
    const { latitude: lat, longitude: lon } = pos.coords;
    setUserPos({ lat, lon });

    if (mapRef.current) {
      addUserMarker(mapRef.current, { lat, lon });
      mapRef.current.easeTo({ center: [lon, lat], duration: 500 });

      // Redibujar rota se o source já existir
      if (routeData && mapRef.current.getSource('walk-route')) {
        drawRoute(mapRef.current, routeData);
      }
    }

    if (routeData) {
      const distFromStart = haversine(origin.lat, origin.lon, lat, lon);
      const covered = Math.min(distFromStart, routeData.distanceMeters);
      const remaining = Math.max(0, routeData.distanceMeters - covered);
      setDistCovered(covered);
      setDistRemaining(remaining);

      // Chegou (dentro de 30m do destino)
      const distToDest = haversine(lat, lon, destination.lat, destination.lon);
      if (distToDest < 30) setArrived(true);
    }
  }, [routeData, origin]);

  // ── Start / Stop tracking ──────────────────────────────────────────────────
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) return;
    setTracking(true);
    startTimeRef.current = Date.now() - elapsed * 1000;

    // Timer
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // GPS watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      updatePosition,
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }, [elapsed, updatePosition]);

  const stopTracking = useCallback(() => {
    setTracking(false);
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    clearInterval(intervalRef.current);
  }, []);

  const resetTracking = useCallback(() => {
    stopTracking();
    setElapsed(0);
    setDistCovered(0);
    setDistRemaining(routeData?.distanceMeters ?? null);
    setArrived(false);
    startTimeRef.current = null;
  }, [stopTracking, routeData]);

  // Cleanup
  useEffect(() => () => {
    stopTracking();
  }, []);

  // ── ETA dinâmico ─────────────────────────────────────────────────────────
  const etaSeconds = distRemaining != null
    ? Math.round((distRemaining / 1000) / 4.8 * 3600)
    : routeData?.travelTimeSeconds ?? null;

  const progress = routeData
    ? Math.min(100, (distCovered / routeData.distanceMeters) * 100)
    : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* ── Mapa ── */}
        <div ref={mapContainerRef} className="flex-1 w-full relative">
          {/* Loading overlay */}
          {(!sdkReady || loadingRoute) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
              style={{ background: 'var(--bg-primary)' }}>
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" />
                <div className="absolute inset-0 rounded-full border-2 border-t-cyan-400 animate-spin" />
                <Footprints className="absolute inset-0 m-auto h-5 w-5 text-cyan-400" />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {!sdkReady ? 'Carregando mapa…' : 'Calculando rota a pé…'}
              </p>
            </div>
          )}

          {/* Erro */}
          {routeError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-sm text-center font-medium text-red-500">{routeError}</p>
            </div>
          )}

          {/* Botão fechar */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl border shadow-lg"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <X className="h-4 w-4" />
          </motion.button>

          {/* Badge topo centro */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border shadow-lg"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
              <Footprints className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Rota a pé
              </span>
              {tracking && (
                <>
                  <span className="w-px h-3" style={{ background: 'var(--border)' }} />
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-70" />
                    <span className="relative rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-[10px] font-bold text-green-400">AO VIVO</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Painel inferior ── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 20 }}
          className="relative flex-shrink-0 rounded-t-3xl border-t shadow-2xl"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border)',
            backdropFilter: 'blur(24px)',
          }}
        >
          {/* Handle + toggle */}
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className="w-full flex flex-col items-center pt-3 pb-1"
          >
            <div className="w-10 h-1 rounded-full mb-2" style={{ background: 'var(--border)' }} />
            <div className="flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
              {panelOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </div>
          </button>

          <AnimatePresence>
            {panelOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-5 pb-6 space-y-4">
                  {/* Destino */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(0,113,227,0.12)', border: '1px solid rgba(0,113,227,0.25)' }}>
                      <MapPin className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                        Destino
                      </p>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {destination.name}
                      </p>
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Distância restante */}
                    <div className="rounded-2xl p-3 text-center"
                      style={{ background: 'var(--card-inner)', border: '1px solid var(--border)' }}>
                      <Navigation className="h-4 w-4 mx-auto mb-1 text-cyan-400" strokeWidth={1.5} />
                      <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                        {distRemaining != null ? fmtDist(distRemaining) : '—'}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>restante</p>
                    </div>

                    {/* Tempo estimado */}
                    <div className="rounded-2xl p-3 text-center"
                      style={{ background: 'var(--card-inner)', border: '1px solid var(--border)' }}>
                      <Clock className="h-4 w-4 mx-auto mb-1 text-[var(--accent)]" strokeWidth={1.5} />
                      <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                        {etaSeconds != null ? fmtTime(etaSeconds) : '—'}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>ETA</p>
                    </div>

                    {/* Tempo decorrido */}
                    <div className="rounded-2xl p-3 text-center"
                      style={{ background: 'var(--card-inner)', border: '1px solid var(--border)' }}>
                      <Footprints className="h-4 w-4 mx-auto mb-1 text-green-400" strokeWidth={1.5} />
                      <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                        {fmtTime(elapsed)}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>caminhando</p>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                        Progresso
                      </span>
                      <span className="text-[10px] font-bold text-cyan-400">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden"
                      style={{ background: 'var(--card-inner)', border: '1px solid var(--border)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, #0071e3, #00f3ff)',
                          boxShadow: '0 0 8px rgba(0,243,255,0.5)',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                    {routeData && (
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                          {fmtDist(distCovered)} percorrido
                        </span>
                        <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                          {fmtDist(routeData.distanceMeters)} total
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Arrived */}
                  {arrived && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl p-3 text-center"
                      style={{
                        background: 'rgba(52,199,89,0.12)',
                        border: '1px solid rgba(52,199,89,0.3)',
                      }}
                    >
                      <p className="text-sm font-bold text-green-400">🎉 Você chegou ao ponto de embarque!</p>
                    </motion.div>
                  )}

                  {/* Controles */}
                  <div className="flex gap-2">
                    {!tracking ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={startTracking}
                        disabled={!routeData}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg,#0071e3,#00b4d8)' }}
                      >
                        <Play className="h-4 w-4" fill="currentColor" />
                        {elapsed > 0 ? 'Retomar' : 'Iniciar navegação'}
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={stopTracking}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg,#ff3b30,#ff6b35)' }}
                      >
                        <Square className="h-4 w-4" fill="currentColor" />
                        Pausar
                      </motion.button>
                    )}

                    {elapsed > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        onClick={resetTracking}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WalkingMapModal;
