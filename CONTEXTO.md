# 🧠 Contexto do projeto — Studio Bella (Nail Designer)

> Documento de continuidade: tudo que você (ou o Claude) precisa saber para
> retomar o trabalho em outra máquina. Atualizado em **10/06/2026**.

## O que é

Sistema de **agendamento online + painel de gestão** para nail designers
(unhas e sobrancelhas). É um **modelo para vender** a clientes reais — por isso
a marca é fictícia (Studio Bella, profissional "Bella Monteiro") e tudo de
marca fica centralizado para personalização rápida.

Nasceu inspirado no projeto da **Barbearia Avance** (repo
`DaviSoftEng/Avance-Barbearia`, em produção no Railway), que serve de
referência de arquitetura — mas este projeto tem identidade, regras e
funcionalidades próprias. **Status: em teste/desenvolvimento local. Ainda não
foi deployado.**

## Stack e arquitetura

- **Frontend**: React 18 + Vite + Tailwind em `client/` (SPA com React Router)
- **Backend**: Node/Express + Prisma + SQLite em `server/`
- **Deploy alvo**: Railway como serviço único (Express serve API + build do
  React; banco e uploads em volume `/data`) — passo a passo em `DEPLOY.md`
- Rotas API: `/api/auth, /api/services, /api/appointments, /api/slots,
  /api/business, /api/gallery` — JWT, rate limit, Helmet, log de auditoria

## Como rodar

```bash
npm run setup          # instala raiz + server + client
# criar server/.env a partir de server/.env.example
# (JWT_SECRET >= 32 chars, ADMIN_EMAIL, ADMIN_PASSWORD >= 8)
npm run db:setup       # cria tabelas + seed
npm run dev            # API :3001 + site :5173
```

- Painel: `http://localhost:5173/login`
- Login de dev usado até agora: usuário **bella** / senha **bella1234**
  (o `.env` não vai pro git — recrie na nova máquina)

## Decisões de design (do dono do projeto)

1. **Tema DARK GLAM obrigatório** — o dono é sensível a telas claras ("dói a
   vista"). Tema claro foi tentado duas vezes e rejeitado. Paleta atual:
   fundo cacau `#231816`, cartões `#2E2220`, texto marfim `#F4E8E0`, acentos
   rosé `#C77E8A`/`#E0A0AC` e dourado `#D9B886`. **Nunca usar branco puro.**
2. As cores são **semânticas** no `client/tailwind.config.js` (`white` =
   superfície, `cocoa` = texto, `cream` = fundo) — re-skin é trocar esse arquivo
   (+ 3 hexes no `index.css`). ⚠️ Mudou o tailwind.config? **Reinicie o
   `npm run dev`** — o Tailwind já segurou config velha em cache uma vez.
3. **Animações "breathing"** (estilo mouse Logitech: cor fixa, intensidade
   acende/apaga): blobs do hero e glow dos botões CTA — keyframes `breathe` e
   `glowPulse` em `client/src/index.css`, palavra "autoestima" com
   `.text-shimmer`.
4. **Marca centralizada** em `client/src/config/brand.js` (nome, profissional,
   WhatsApp, Instagram, endereço, Maps) — é o ponto de personalização ao vender.

## O que difere da barbearia (regras de negócio)

- Slots de **30 em 30 min** (serviços longos) — `server/src/controllers/slotController.js`
- **Pausa de almoço configurável por dia** (BusinessHours.breakStart/breakEnd),
  não fixa no código
- Clientes fixas (RecurringBlock) com **duração real** do atendimento
- Serviços com **categoria** (`unhas` | `sobrancelhas`) + filtros no site
- **Galeria/portfólio** (model GalleryPhoto) gerenciada pelo painel
- **Política de sinal**: % do valor + chave Pix + prazo de cancelamento
  (Settings: `depositPercent`, `depositPixKey`, `cancelHours`) — exibida na
  home, no agendamento e na confirmação
- Lógica de conflitos compartilhada em `server/src/utils/schedule.js`

## Painel admin (reformulado — estilo app)

`client/src/pages/Admin.jsx`: sidebar no desktop + **bottom nav no mobile**,
sem a navbar pública (ver `Shell` em `App.jsx`). Dashboard com saudação por
horário, card **"Próxima cliente"** (com WhatsApp pronto), **gráfico de
faturamento 7 dias** (CSS puro), KPIs, mais pedidos e agenda do dia. Botão
**"+ Encaixe rápido"** abre modal para a profissional marcar cliente direto
(servidor valida conflitos). Abas: Início, Agenda, Clientes, Serviços,
Galeria, Ajustes.

## Assets reais (pasta `fotos/` = matriz)

- `fotos/bella.png` → otimizada em `client/public/profissional.jpg` (seção Sobre)
- `fotos/logo.png` (wordmark SB rose gold) → `client/public/logo-marca.png`
  (navbar, footer, sidebar do painel, login). Favicon segue `logo.svg` (monograma)
- `fotos/catalogo 1.jpeg` e `catalogo 2.jpeg`: flyers de preços com fotos
  circulares de unhas → **recortei as 7 fotos** (quadrado inscrito no círculo)
  para `client/public/galeria/*.jpg` e elas são o portfólio atual (seed + banco)

## Estado atual

- ✅ Tudo funcional e testado local (API, conflitos, build, painel)
- ✅ Repo: https://github.com/DaviSoftEng/Naildesigner.git (branch `main`)
- O banco local (`server/prisma/dev.db`) não vai pro git — na nova máquina o
  `db:setup` recria com o seed (que já tem as fotos reais do portfólio)

## Pendências / próximos passos possíveis

- [ ] **Deploy no Railway** (seguir DEPLOY.md; configurar volume + variáveis)
- [ ] Atualizar **serviços/preços do seed com a tabela real do catálogo**
      (Molde F1 R$ 80 / manut. R$ 50–65 · Gel na tips R$ 110 / manut. R$ 70 ·
      Fibra de vidro R$ 150 / manut. R$ 90 · Banho em gel R$ 55–60 ·
      Esmaltação em gel R$ 40 · Blindagem R$ 30) — dono ainda não confirmou
- [ ] Fotos de sobrancelhas para o portfólio (filtro está vazio nessa categoria)
- [ ] Ideias faladas e não implementadas: lembrete de retorno ("cliente sumida
      há 30 dias"), exportar fechamento do mês, slots disponíveis dentro do
      modal de encaixe, favicon recortado da logo nova
