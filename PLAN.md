# Satellite Tracker — Project Plan

## Objetivo
Dashboard web para visualização de satélites em órbita sobre um globo 3D interativo.
O usuário pode filtrar satélites por categoria, controlar o tempo e clicar em qualquer
ponto do globo para ver passagens futuras sobre aquela localização.

## Stack
- **Vite** — bundler, zero config
- **CesiumJS** — globo 3D, câmera interativa, timeline nativa
- **satellite.js** — propagação SGP4 a partir de dados TLE
- **CelesTrak API** — fonte de TLE gratuita, sem autenticação

Sem framework JS pesado. HTML + JS modular é suficiente.
Sem backend. Tudo roda no browser.

## Estrutura de arquivos
```
src/
├── main.js           — entry point, inicializa Cesium
├── globe.js          — setup do viewer, câmera, estilo do globo
├── satellites.js     — fetch TLE, propagação, entidades Cesium
├── timeline.js       — controle de tempo, play/pause, velocidade
├── filters.js        — filtro por categoria de satélite
├── locationPicker.js — clique no globo, cálculo de passagens
├── ui.js             — painel lateral, listas, stats
└── style.css         — design system completo
```

## Categorias de satélites (fonte: CelesTrak)
| ID interno | Nome exibido       | Endpoint CelesTrak              |
|------------|--------------------|---------------------------------|
| stations   | Estações Espaciais | /SOCRATES/query.php (ISS, etc.) |
| starlink   | Starlink           | /supplemental/starlink.txt      |
| gps        | GPS (EUA)          | /gnss/gps.txt                   |
| military   | Militar            | /supplemental/tle-new.txt (filtrado) |
| weather    | Meteorológicos     | /weather.txt                    |
| science    | Científicos        | /science.txt                    |

## Funcionalidades — ordem de implementação
1. Globo 3D escuro com grade atmosférica, estrelas, sem mapa base colorido
2. Fetch + parse TLE do CelesTrak (começar com "stations" — ISS)
3. Calcular posição atual via satellite.js e plotar satélites como pontos
4. Trilha orbital (próximas 2h) como linha tracejada por satélite
5. Timeline — play/pause, speeds: 1x / 60x / 300x / 1000x
6. Slider de período — navegar entre "agora − 12h" até "agora + 12h"
7. Filtro por categoria — botões no painel, troca o grupo ativo
8. Click no globo — fixa um marcador e lista próximas passagens
9. Painel lateral — satélite selecionado, altitude, velocidade, inclinação
10. Contador de satélites ativos no header

## Dados exibidos por satélite (ao clicar)
- Nome / NORAD ID
- Altitude (km)
- Velocidade (km/s)
- Inclinação orbital (graus)
- Próxima passagem sobre ponto selecionado (se houver)

## Considerações técnicas
- Máximo 500 satélites simultâneos renderizados para manter performance
- TLE atualizado a cada 30 minutos (localStorage com timestamp)
- Trilhas computadas em Web Worker para não travar UI
- CesiumJS Ion token: usar token público gratuito ou imagery offline