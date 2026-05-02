// src/comp/WalkingMapModal.jsx — Navegação 3D estilo TomTom
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Footprints, Navigation, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Play, Square, ChevronUp, ChevronDown, MapPin } from 'lucide-react';

const TOMTOM_API_KEY = 'kVt12B5jgJTHfcvXLLDSPgcX6bz4f7R1';

// ── Utils ─────────────────────────────────────────────────────────────────────
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371000, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};
const calcBearing = (lat1,lon1,lat2,lon2) => {
  const dLon=(lon2-lon1)*Math.PI/180;
  const y=Math.sin(dLon)*Math.cos(lat2*Math.PI/180);
  const x=Math.cos(lat1*Math.PI/180)*Math.sin(lat2*Math.PI/180)-Math.sin(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.cos(dLon);
  return ((Math.atan2(y,x)*180/Math.PI)+360)%360;
};
const fmtDist = (m) => m<1000?`${Math.round(m)}m`:`${(m/1000).toFixed(1)}km`;
const fmtTime = (sec) => { if(sec<60) return `${sec}s`; const m=Math.floor(sec/60),s=sec%60; return s>0?`${m}min ${s}s`:`${m}min`; };

// Ícone de manobra baseado no tipo TomTom
const getManeuverIcon = (type) => {
  if (!type) return <ArrowUp className="w-8 h-8 text-white" strokeWidth={2.5}/>;
  const t = type.toLowerCase();
  if (t.includes('left')) return <ArrowLeft className="w-8 h-8 text-white" strokeWidth={2.5}/>;
  if (t.includes('right')) return <ArrowRight className="w-8 h-8 text-white" strokeWidth={2.5}/>;
  if (t.includes('uturn')) return <RotateCcw className="w-8 h-8 text-white" strokeWidth={2.5}/>;
  return <ArrowUp className="w-8 h-8 text-white" strokeWidth={2.5}/>;
};

// ── SDK TomTom ────────────────────────────────────────────────────────────────
let sdkLoadPromise = null;
const loadTomTomSDK = () => {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve, reject) => {
    if (window.tt) { resolve(window.tt); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js';
    script.onload = () => resolve(window.tt);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return sdkLoadPromise;
};

// ── Rota TomTom com instruções ────────────────────────────────────────────────
const fetchWalkingRoute = async (origin, dest) => {
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${origin.lat},${origin.lon}:${dest.lat},${dest.lon}/json`
    + `?key=${TOMTOM_API_KEY}&travelMode=pedestrian&routeType=shortest&instructionsType=tagged&language=pt-BR&sectionType=pedestrian`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro ao calcular rota');
  const data = await res.json();
  const r = data.routes?.[0];
  if (!r) throw new Error('Nenhuma rota encontrada');
  const points = r.legs[0].points.map(p => [p.longitude, p.latitude]);
  const instructions = (r.guidance?.instructions || []).map(inst => ({
    message: inst.message || inst.street || 'Continue em frente',
    maneuver: inst.maneuver || 'STRAIGHT',
    distanceToNext: inst.routeOffsetInMeters || 0,
    point: inst.point ? [inst.point.longitude, inst.point.latitude] : null,
  }));
  return {
    points,
    instructions,
    distanceMeters: r.summary.lengthInMeters,
    travelTimeSeconds: r.summary.travelTimeInSeconds,
    geojson: { type:'Feature', geometry:{ type:'LineString', coordinates:points } },
  };
};

// ── Geocode ───────────────────────────────────────────────────────────────────
const geocodeAddress = async (address) => {
  const res = await fetch(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(address)}.json?key=${TOMTOM_API_KEY}&countrySet=BR&limit=1`);
  const data = await res.json();
  const loc = data.results?.[0]?.position;
  if (!loc) throw new Error('Endereço não encontrado: ' + address);
  return { lat: loc.lat, lon: loc.lon };
};

// ── Componente ────────────────────────────────────────────────────────────────
const WalkingMapModal = ({ route, userLocation, onClose, isDark }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastPosRef = useRef(null);
  const routeDataRef = useRef(null);
  const resolvedOriginRef = useRef(null);
  const resolvedDestRef = useRef(null);

  const [sdkReady, setSdkReady] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [resolvedOrigin, setResolvedOrigin] = useState(null);
  const [resolvedDest, setResolvedDest] = useState(null);

  // Navegação state
  const [navigating, setNavigating] = useState(false); // true = modo 3D nav
  const [tracking, setTracking] = useState(false);
  const [userPos, setUserPos] = useState(userLocation || null);
  const [bearing, setBearing] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [distCovered, setDistCovered] = useState(0);
  const [distRemaining, setDistRemaining] = useState(null);
  const [arrived, setArrived] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const [currentInstruction, setCurrentInstruction] = useState(null);
  const [nextInstruction, setNextInstruction] = useState(null);
  const [showOverview, setShowOverview] = useState(false); // alternar entre 3D e visão geral

  // ── Resolver coordenadas ──────────────────────────────────────────────────
  useEffect(() => {
    const resolve = async () => {
      try {
        let orig = userLocation;
        if (!orig && route.origin) orig = await geocodeAddress(route.origin);
        if (!orig) orig = { lat: -15.7934, lon: -47.8823 };

        let dest;
        if (route.isWalk && route.destination) {
          dest = { ...(await geocodeAddress(route.destination)), name: route.destination };
        } else if (route.lat && route.lon) {
          dest = { lat: route.lat, lon: route.lon, name: route.fromStop || 'Ponto de embarque' };
        } else if (route.fromStop && route.fromStop !== 'Ponto de embarque') {
          dest = { ...(await geocodeAddress(route.fromStop)), name: route.fromStop };
        } else if (route.destination) {
          dest = { ...(await geocodeAddress(route.destination)), name: route.destination };
        } else {
          dest = { lat: -15.7801, lon: -47.9292, name: 'Destino' };
        }

        setResolvedOrigin(orig);
        setResolvedDest(dest);
        resolvedOriginRef.current = orig;
        resolvedDestRef.current = dest;
      } catch (e) {
        setRouteError('Erro ao resolver endereços: ' + e.message);
        setLoadingRoute(false);
      }
    };
    resolve();
  }, []);

  // ── SDK ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadTomTomSDK().then(() => setSdkReady(true)).catch(() => setRouteError('Falha ao carregar SDK'));
  }, []);

  // ── Inicializar mapa ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!sdkReady || !mapContainerRef.current || mapRef.current || !resolvedOrigin) return;

    const map = window.tt.map({
      key: TOMTOM_API_KEY,
      container: mapContainerRef.current,
      center: [resolvedOrigin.lon, resolvedOrigin.lat],
      zoom: 15,
      style: `https://api.tomtom.com/map/1/style/22.2.1-1/basic_main.json?key=${TOMTOM_API_KEY}`,
      language: 'pt-BR',
      pitch: 0,
      bearing: 0,
    });

    mapRef.current = map;

    map.on('load', () => {
      if (resolvedDest) addDestMarker(map, resolvedDest);
      addUserMarker(map, resolvedOrigin);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [sdkReady, resolvedOrigin]);

  // ── Buscar rota ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!resolvedOrigin || !resolvedDest) return;
    setLoadingRoute(true);
    fetchWalkingRoute(resolvedOrigin, resolvedDest)
      .then(data => {
        setRouteData(data);
        routeDataRef.current = data;
        setDistRemaining(data.distanceMeters);
        if (data.instructions?.length) {
          setCurrentInstruction(data.instructions[0]);
          setNextInstruction(data.instructions[1] || null);
        }
        setLoadingRoute(false);
        if (mapRef.current?.loaded()) {
          drawRoute(mapRef.current, data);
          fitBounds(mapRef.current, data.points);
        }
      })
      .catch(e => { setRouteError(e.message); setLoadingRoute(false); });
  }, [resolvedOrigin, resolvedDest]);

  // ── Desenhar rota ─────────────────────────────────────────────────────────
  const drawRoute = (map, data) => {
    if (!data || !map.getStyle) return;
    try {
      if (map.getSource('walk-route')) { map.getSource('walk-route').setData(data.geojson); return; }
      map.addSource('walk-route', { type: 'geojson', data: data.geojson });
      // Sombra
      map.addLayer({ id:'walk-shadow', type:'line', source:'walk-route',
        layout:{'line-join':'round','line-cap':'round'},
        paint:{'line-color':'#000','line-width':10,'line-opacity':0.18,'line-blur':6}});
      // Linha principal azul sólida (estilo TomTom)
      map.addLayer({ id:'walk-bg', type:'line', source:'walk-route',
        layout:{'line-join':'round','line-cap':'round'},
        paint:{'line-color':'#1a6eff','line-width':8,'line-opacity':1}});
      // Borda clara
      map.addLayer({ id:'walk-fg', type:'line', source:'walk-route',
        layout:{'line-join':'round','line-cap':'round'},
        paint:{'line-color':'#4d94ff','line-width':4,'line-opacity':0.9}});
    } catch(_) {}
  };

  const fitBounds = (map, points) => {
    if (!points?.length) return;
    const lons = points.map(p=>p[0]), lats = points.map(p=>p[1]);
    map.fitBounds([[Math.min(...lons),Math.min(...lats)],[Math.max(...lons),Math.max(...lats)]],
      { padding:{top:80,bottom:180,left:40,right:40}, duration:800 });
  };

  const addDestMarker = (map, dest) => {
    const el = document.createElement('div');
    el.innerHTML = `<div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:#1a6eff;border:3px solid #fff;box-shadow:0 4px 16px rgba(26,110,255,0.5);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);font-size:15px;">${route.isWalk?'🏁':'🚌'}</div></div>`;
    new window.tt.Marker({ element: el, anchor:'bottom' }).setLngLat([dest.lon, dest.lat]).addTo(map);
  };

  const addUserMarker = (map, pos) => {
    if (userMarkerRef.current) { userMarkerRef.current.setLngLat([pos.lon, pos.lat]); return; }
    const el = document.createElement('div');
    el.style.cssText = 'position:relative;width:28px;height:28px;';
    el.innerHTML = `
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(26,110,255,0.2);animation:pr 2s infinite;"></div>
      <div style="position:absolute;inset:4px;border-radius:50%;background:#1a6eff;border:3px solid #fff;box-shadow:0 2px 10px rgba(26,110,255,0.7);"></div>
      <style>@keyframes pr{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.5);opacity:0}}</style>
    `;
    userMarkerRef.current = new window.tt.Marker({ element: el, anchor:'center' }).setLngLat([pos.lon, pos.lat]).addTo(map);
  };

  // ── Encontrar instrução mais próxima ──────────────────────────────────────
  const updateInstruction = useCallback((lat, lon, distCoveredM) => {
    const rd = routeDataRef.current;
    if (!rd?.instructions?.length) return;
    // Pegar instrução com maior offset já passado
    let idx = 0;
    for (let i = 0; i < rd.instructions.length; i++) {
      if (rd.instructions[i].distanceToNext <= distCoveredM) idx = i;
      else break;
    }
    setCurrentInstruction(rd.instructions[idx]);
    setNextInstruction(rd.instructions[idx+1] || null);
  }, []);

  // ── Atualizar posição ──────────────────────────────────────────────────────
  const updatePosition = useCallback((pos) => {
    const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
    setUserPos({ lat, lon });
    setAccuracy(Math.round(acc));

    let newBearing = 0;
    if (lastPosRef.current) {
      newBearing = calcBearing(lastPosRef.current.lat, lastPosRef.current.lon, lat, lon);
      setBearing(newBearing);
    }
    lastPosRef.current = { lat, lon };

    if (mapRef.current) {
      if (userMarkerRef.current) userMarkerRef.current.setLngLat([lon, lat]);
      else addUserMarker(mapRef.current, { lat, lon });

      // Modo navegação 3D: câmera segue com pitch e bearing
      mapRef.current.easeTo({
        center: [lon, lat],
        zoom: 18,
        pitch: 60,        // inclinação 3D
        bearing: newBearing,
        duration: 600,
        easing: t => t,
      });

      const rd = routeDataRef.current;
      if (rd && mapRef.current.getSource('walk-route')) drawRoute(mapRef.current, rd);
    }

    const orig = resolvedOriginRef.current;
    const dest = resolvedDestRef.current;
    const rd = routeDataRef.current;
    if (rd && orig) {
      const covered = Math.min(haversine(orig.lat, orig.lon, lat, lon), rd.distanceMeters);
      setDistCovered(covered);
      setDistRemaining(Math.max(0, rd.distanceMeters - covered));
      updateInstruction(lat, lon, covered);
      if (dest && haversine(lat, lon, dest.lat, dest.lon) < 25) setArrived(true);
    }
  }, [updateInstruction]);

  // ── Iniciar navegação ─────────────────────────────────────────────────────
  const startNavigation = useCallback(() => {
    if (!navigator.geolocation) return;
    setNavigating(true);
    setTracking(true);
    setShowOverview(false);
    startTimeRef.current = Date.now() - elapsed * 1000;
    intervalRef.current = setInterval(() => setElapsed(Math.floor((Date.now()-startTimeRef.current)/1000)), 1000);
    watchIdRef.current = navigator.geolocation.watchPosition(
      updatePosition,
      err => console.warn('GPS:', err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
  }, [elapsed, updatePosition]);

  const pauseNavigation = useCallback(() => {
    setTracking(false);
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    clearInterval(intervalRef.current);
    // Volta para visão plana ao pausar
    if (mapRef.current) mapRef.current.easeTo({ pitch: 0, bearing: 0, zoom: 15, duration: 600 });
  }, []);

  const toggleOverview = () => {
    setShowOverview(v => {
      const next = !v;
      if (mapRef.current) {
        if (next) {
          // Visão geral plana
          if (routeDataRef.current) fitBounds(mapRef.current, routeDataRef.current.points);
          mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 600 });
        } else {
          // Volta para 3D
          if (userPos) mapRef.current.easeTo({ center:[userPos.lon,userPos.lat], zoom:18, pitch:60, bearing, duration:600 });
        }
      }
      return next;
    });
  };

  const resetAll = useCallback(() => {
    pauseNavigation();
    setNavigating(false);
    setElapsed(0); setDistCovered(0);
    setDistRemaining(routeDataRef.current?.distanceMeters ?? null);
    setArrived(false); setBearing(0);
    lastPosRef.current = null; startTimeRef.current = null;
    if (mapRef.current && routeDataRef.current) {
      fitBounds(mapRef.current, routeDataRef.current.points);
      mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    }
    if (routeDataRef.current?.instructions?.length) {
      setCurrentInstruction(routeDataRef.current.instructions[0]);
      setNextInstruction(routeDataRef.current.instructions[1] || null);
    }
  }, [pauseNavigation, bearing]);

  useEffect(() => () => { pauseNavigation(); }, []);

  const etaSeconds = distRemaining!=null ? Math.round((distRemaining/1000)/4.8*3600) : routeData?.travelTimeSeconds ?? null;
  const progress = routeData ? Math.min(100,(distCovered/routeData.distanceMeters)*100) : 0;
  const destName = resolvedDest?.name || route.fromStop || route.destination || 'Destino';

  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-50 flex flex-col" style={{background:'#000'}}>

        {/* ── MAPA ── */}
        <div ref={mapContainerRef} className="flex-1 w-full relative overflow-hidden">

          {/* Loading */}
          {(!sdkReady || loadingRoute) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-950">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
                <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin" />
                <Footprints className="absolute inset-0 m-auto h-6 w-6 text-blue-400" />
              </div>
              <p className="text-sm font-medium text-white/70">
                {!sdkReady ? 'Carregando mapa…' : 'Calculando rota…'}
              </p>
            </div>
          )}

          {routeError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 bg-gray-950">
              <MapPin className="h-8 w-8 text-red-400" />
              <p className="text-sm text-center text-red-400">{routeError}</p>
            </div>
          )}

          {/* ── Botão fechar ── */}
          <motion.button whileTap={{scale:0.9}} onClick={onClose}
            className="absolute top-12 left-4 z-20 w-10 h-10 rounded-full flex items-center justify-center shadow-xl"
            style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.15)'}}>
            <X className="h-4 w-4 text-white" />
          </motion.button>

          {/* ── Botão visão geral (quando navegando) ── */}
          {navigating && (
            <motion.button initial={{opacity:0}} animate={{opacity:1}} whileTap={{scale:0.9}}
              onClick={toggleOverview}
              className="absolute top-12 right-4 z-20 px-3 py-2 rounded-full text-xs font-semibold shadow-xl"
              style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.15)',color:'white'}}>
              {showOverview ? '3D' : 'Visão geral'}
            </motion.button>
          )}

          {/* ── Badge precisão GPS ── */}
          {tracking && accuracy!=null && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-lg"
              style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(12px)',color: accuracy<20?'#34d399':accuracy<50?'#fbbf24':'#f87171'}}>
              GPS ±{accuracy}m
            </div>
          )}

          {/* ── PAINEL DE INSTRUÇÃO (modo navegação) ── */}
          {navigating && !showOverview && currentInstruction && !arrived && (
            <motion.div
              initial={{y:-80,opacity:0}} animate={{y:0,opacity:1}} exit={{y:-80,opacity:0}}
              className="absolute top-0 left-0 right-0 z-20"
              style={{paddingTop:'env(safe-area-inset-top,0px)'}}>
              <div style={{background:'#1a6eff',borderRadius:'0 0 20px 20px',boxShadow:'0 8px 32px rgba(26,110,255,0.4)'}}>
                <div className="flex items-center gap-4 px-5 pt-4 pb-4">
                  {/* Ícone manobra */}
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{background:'rgba(255,255,255,0.18)'}}>
                    {getManeuverIcon(currentInstruction.maneuver)}
                  </div>
                  {/* Texto */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xl font-bold leading-tight truncate">
                      {currentInstruction.message}
                    </p>
                    {nextInstruction && (
                      <p className="text-white/70 text-xs mt-1 truncate">
                        Depois: {nextInstruction.message}
                      </p>
                    )}
                  </div>
                </div>
                {/* Barra de progresso */}
                <div className="h-1 mx-4 mb-3 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.2)'}}>
                  <motion.div className="h-full rounded-full bg-white"
                    animate={{width:`${progress}%`}} transition={{duration:0.6}}/>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ARRIVED ── */}
          {arrived && (
            <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}
              className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 px-8 py-6 rounded-3xl text-center shadow-2xl"
              style={{background:'rgba(0,0,0,0.85)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.15)'}}>
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-white font-bold text-lg">{route.isWalk?'Chegou!':'Chegou ao ponto!'}</p>
              <p className="text-white/60 text-sm mt-1">{fmtDist(routeData?.distanceMeters||0)} em {fmtTime(elapsed)}</p>
            </motion.div>
          )}
        </div>

        {/* ── PAINEL INFERIOR ── */}
        <div style={{background:'#111827',borderTop:'1px solid rgba(255,255,255,0.1)'}}>

          {/* Destino */}
          <div className="flex items-center gap-3 px-5 pt-4 pb-3" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
            <MapPin className="h-4 w-4 text-blue-400 flex-shrink-0" strokeWidth={2}/>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Destino</p>
              <p className="text-sm font-semibold text-white truncate">{destName}</p>
            </div>
            {distRemaining!=null && (
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-blue-400">{fmtDist(distRemaining)}</p>
                <p className="text-[10px] text-white/40">{etaSeconds!=null?fmtTime(etaSeconds):'—'}</p>
              </div>
            )}
          </div>

          {/* Métricas rápidas */}
          <div className="grid grid-cols-3 gap-px px-5 py-3" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
            {[
              {label:'Percorrido', value: fmtDist(distCovered)},
              {label:'Caminhando', value: fmtTime(elapsed)},
              {label:'Precisão', value: accuracy!=null?`±${accuracy}m`:'—'},
            ].map(({label,value})=>(
              <div key={label} className="text-center">
                <p className="text-base font-bold text-white">{value}</p>
                <p className="text-[10px] text-white/40">{label}</p>
              </div>
            ))}
          </div>

          {/* Controles */}
          <div className="flex gap-3 px-5 py-4 pb-8">
            {!navigating ? (
              // Botão iniciar grande
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                onClick={startNavigation} disabled={!routeData}
                className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-2xl text-base font-bold text-white disabled:opacity-40 shadow-lg"
                style={{background:'linear-gradient(135deg,#1a6eff,#0051cc)',boxShadow:'0 4px 20px rgba(26,110,255,0.4)'}}>
                <Navigation className="h-5 w-5" strokeWidth={2}/>
                Iniciar navegação
              </motion.button>
            ) : tracking ? (
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                onClick={pauseNavigation}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white"
                style={{background:'linear-gradient(135deg,#ff3b30,#cc2f26)'}}>
                <Square className="h-5 w-5" fill="currentColor"/>
                Pausar
              </motion.button>
            ) : (
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                onClick={startNavigation}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white"
                style={{background:'linear-gradient(135deg,#1a6eff,#0051cc)'}}>
                <Play className="h-5 w-5" fill="currentColor"/>
                Retomar
              </motion.button>
            )}

            {navigating && (
              <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                onClick={resetAll}
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)'}}>
                <RotateCcw className="h-5 w-5 text-white/60"/>
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WalkingMapModal;
