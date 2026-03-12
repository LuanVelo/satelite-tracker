# Satellite Tracker — Design System

## Conceito visual
"Observatory Glass" — missão de controle espacial vista através de vidro fosco.

Referência estrutural: dashboard da imagem (globo centralizado, painéis laterais,
fundo escuro com grid sutil, dados em tempo real).
Linguagem visual: glassmorphism do Apple Vision OS — painéis com blur, bordas
luminosas suaves, sem bordas duras ou brilho neon agressivo.

## Paleta
```css
--bg:          #04080f   /* fundo quase preto com tom azul */
--bg-grid:     #0a1020   /* células do grid de fundo */
--glass:       rgba(255, 255, 255, 0.05)
--glass-hover: rgba(255, 255, 255, 0.08)
--border:      rgba(255, 255, 255, 0.10)
--border-glow: rgba(100, 180, 255, 0.20)

/* texto */
--text-primary:   #e8f0fe
--text-secondary: #7a90b0
--text-mono:      #4fc3f7

/* satélites por categoria */
--col-stations: #69f0ae   /* verde — ISS e estações */
--col-starlink: #4fc3f7   /* azul ciano — Starlink */
--col-gps:      #ffeb3b   /* amarelo — GPS */
--col-military: #ff5252   /* vermelho — militar */
--col-weather:  #ce93d8   /* lilás — meteorológicos */
--col-science:  #ffab40   /* laranja — científicos */
```

## Tipografia
- Display / labels: `Space Mono` — monospace, caráter técnico
- Corpo / UI: `DM Sans` — moderno, legível, sem serifa suave

## Globo 3D (CesiumJS)
- Imagery: `EarthAtNight` ou imagery escura customizada
- Sem labels geográficos nativos do Cesium
- Atmosfera ativada, brilho sutil nas bordas
- Estrelas ativadas no fundo
- Trilhas orbitais: linha com opacidade 60%, cor da categoria
- Marcador de ponto selecionado: anel pulsante branco

## Painéis laterais (glassmorphism)
```css
background: rgba(10, 20, 40, 0.55);
backdrop-filter: blur(24px) saturate(1.4);
border: 1px solid rgba(255, 255, 255, 0.10);
border-radius: 16px;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255,255,255,0.07);
```

## Layout
```
┌─────────────────────────────────────────────────────────────┐
│  HEADER — logo · filtros de categoria · relógio · contador  │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│  PAINEL ESQ  │        GLOBO 3D              │  PAINEL DIR   │
│  · Satélite  │     (ocupa 60% da tela)      │  · Passagens  │
│    selecionado│                             │    sobre local│
│  · Stats     │                              │  · Timeline   │
│  · Categoria │                              │  · Velocidade │
│              │                              │               │
└──────────────┴──────────────────────────────┴───────────────┘
```

Painéis laterais: largura fixa 280px, cantos arredondados, flutam sobre o globo
(position absolute), não empurram o canvas.

## Animações e micro-interações
- Satélites: ponto com halo pulsante suave na cor da categoria
- Hover num satélite: label aparece com fade-in, ponto expande
- Click num satélite: painel lateral desliza com spring animation
- Troca de categoria: pontos antigos fazem fade-out, novos fade-in
- Timeline play: ícone transiciona suavemente, velocidade exibida em badge
- Fundo: grid estático sutil, sem animação (mantém foco no globo)

## O que NÃO fazer
- Sem gradientes neon agressivos (referência era estilo, não literal)
- Sem bordas em cor sólida brilhante nos painéis
- Sem fontes genéricas (Inter, Roboto, system-ui)
- Sem fundo branco em nenhum elemento
- Sem sombras coloridas nos textos