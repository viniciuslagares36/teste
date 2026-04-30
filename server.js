import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        service: "LocalizaBus Backend",
        timestamp: new Date().toISOString()
    });
});

app.get("/api/realtime-vehicles", async (req, res) => {
    try {
  const response = await axios.get(
  "https://api.allorigins.win/raw?url=https://www.sistemas.dftrans.df.gov.br/service/gps/operacoes",
  {
    timeout: 60000
  }
);
        const vehicles = [];

        response.data.forEach((operadora) => {
            const empresa = operadora.operadora;

            operadora.veiculos?.forEach((v) => {
                vehicles.push({
                    id: v.numero,
                    line: v.linha,
                    lat: v.localizacao?.latitude,
                    lon: v.localizacao?.longitude,
                    speed: v.velocidade?.valor || 0,
                    speedUnit: v.velocidade?.unidade || "km/h",
                    timestamp: v.horario,
                    direction: v.direcao,
                    sentido: v.sentido,
                    valid: v.valid,
                    company: empresa?.nome,
                    agency: empresa?.sigla
                });
            });
        });

        res.json({
            success: true,
            total: vehicles.length,
            vehicles,
            lastUpdate: new Date().toISOString()
        });
    } catch (error) {
        console.error("Erro DFTrans GPS:", error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor LocalizaBus rodando na porta ${PORT}`);
});