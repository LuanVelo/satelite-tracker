# ORBITAL — Satellite Tracker

![ORBITAL Screenshot](image_sample.png)

Rastreador de satélites em tempo real com globo 3D interativo. Visualize posições, órbitas e passagens de satélites ao redor da Terra.

## Funcionalidades

- Globo 3D interativo com renderização via CesiumJS
- Dados TLE em tempo real (ISS, Starlink, GPS, meteorológicos, científicos, militares)
- Filtros por categoria de satélite
- Painel de passagens com horário e elevação máxima
- Controle de tempo: play/pause, velocidade 1×, 60×, 300×, 1000×
- Clique em qualquer satélite para ver detalhes da órbita

## Stack

- [CesiumJS](https://cesium.com/) — renderização do globo 3D
- [satellite.js](https://github.com/shashwatak/satellite-js) — propagação orbital (SGP4)
- [Vite](https://vitejs.dev/) — build tool

## Como rodar

```bash
npm install
npm run dev
```

---

Built with Claude Code
