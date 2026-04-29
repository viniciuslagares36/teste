import express from 'express';
import cors from 'cors';
import { MoovitClient } from 'moovit-client';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Endpoint para buscar veículos em tempo real
app.get('/api/realtime-vehicles', async (req, res) => {
    let client = null;

    try {
        console.log('🟢 Buscando dados do Moovit...');

        // 1156 = Brasília (conforme documentação do moovit-client)
        client = new MoovitClient({ metroId: 1156 });
        await client.initialize();

        // Busca alerts (contém informações de linhas ativas)
        const alerts = await client.alerts.getAlerts();

        // Busca agências
        const agencies = await client.lines.getAgencies();

        // Exemplo: busca chegadas em tempo real
        // IMPORTANTE: IDs abaixo são exemplos. Você precisa descobrir os IDs reais de Brasília
        // Use o endpoint /api/search-stops para encontrar os IDs corretos
        const arrivals = await client.lines.getArrivals([
            { lineId: 123456, stopId: 789012 } // 🔴 SUBSTITUA PELOS IDS REAIS
        ]);

        // Formata os dados para o frontend
        const vehicles = arrivals.map(stop => ({
            id: stop.lineId,
            line: stop.lineNumber || stop.lineId,
            lat: stop.vehicleLat || null,
            lon: stop.vehicleLon || null,
            bearing: stop.bearing || 0,
            speed: stop.speed || 0,
            timestamp: new Date().toISOString(),
            eta: stop.arrivals[0]?.realTimeEta || null,
            agency: agencies.find(a => a.id === stop.agencyId)?.name || 'Desconhecida'
        }));

        console.log(`✅ Encontrados ${vehicles.length} veículos`);

        res.json({
            success: true,
            vehicles,
            alerts: alerts.slice(0, 5),
            lastUpdate: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro no Moovit:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Erro ao buscar dados em tempo real'
        });
    } finally {
        if (client) {
            await client.close();
            console.log('🔴 Conexão com Moovit fechada');
        }
    }
});

// Endpoint para buscar paradas por texto (útil para descobrir IDs)
app.get('/api/search-stops', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ success: false, error: 'Query é obrigatória' });
    }

    let client = null;

    try {
        console.log(`🔍 Buscando: "${query}"`);
        client = new MoovitClient({ metroId: 1156 });
        await client.initialize();

        const results = await client.locations.search(query);

        console.log(`✅ Encontrados ${results.length} resultados`);

        res.json({
            success: true,
            results: results.map(r => ({
                name: r.name,
                type: r.type,
                lat: r.lat,
                lon: r.lon,
                id: r.id,
                stopId: r.stopId
            }))
        });
    } catch (error) {
        console.error('❌ Erro na busca:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.close();
    }
});

// Endpoint para buscar rotas entre dois pontos
app.get('/api/routes', async (req, res) => {
    const { from, to } = req.query;

    if (!from || !to) {
        return res.status(400).json({ success: false, error: 'From e To são obrigatórios' });
    }

    let client = null;

    try {
        console.log(`🗺️ Buscando rota de "${from}" para "${to}"`);
        client = new MoovitClient({ metroId: 1156 });
        await client.initialize();

        const routes = await client.routes.search({
            from: { type: 'text', query: from },
            to: { type: 'text', query: to }
        });

        console.log(`✅ Encontradas ${routes.itineraries.length} rotas`);

        res.json({
            success: true,
            itineraries: routes.itineraries.map(route => ({
                duration: route.totalDuration,
                legs: route.legs.map(leg => ({
                    type: leg.type,
                    line: leg.line?.shortName,
                    from: leg.from?.name,
                    to: leg.to?.name,
                    duration: leg.duration
                }))
            }))
        });
    } catch (error) {
        console.error('❌ Erro na rota:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.close();
    }
});

// Endpoint para buscar alerts/notificações
app.get('/api/alerts', async (req, res) => {
    let client = null;

    try {
        console.log('🔔 Buscando alerts...');
        client = new MoovitClient({ metroId: 1156 });
        await client.initialize();

        const alerts = await client.alerts.getAlerts();

        res.json({
            success: true,
            alerts: alerts.slice(0, 10),
            total: alerts.length
        });
    } catch (error) {
        console.error('❌ Erro nos alerts:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) await client.close();
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        service: 'Moovit Client for Brasília'
    });
});

app.listen(PORT, () => {
    console.log(`
  🚀 Servidor Moovit rodando!
  📡 Endpoint: http://localhost:${PORT}
  📋 Rotas disponíveis:
     GET /api/health - Verificar status
     GET /api/realtime-vehicles - Veículos em tempo real
     GET /api/search-stops?query=termo - Buscar paradas
     GET /api/routes?from=origem&to=destino - Planejar rota
     GET /api/alerts - Alertas de transporte
  `);
});