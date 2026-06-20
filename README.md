<div align="center">

<img src="client/public/logo-marca.png" alt="Studio Bella" width="120" />

# 💅 Studio Bella — Nail Designer

**Sistema completo de agendamento online + painel de gestão para nail designers.**

As clientes agendam pelo site em poucos cliques; a profissional administra agenda,
clientes, serviços, portfólio e finanças por um painel próprio — tudo em uma
aplicação full-stack pronta para produção.

<br/>

[![Demo ao vivo](https://img.shields.io/badge/▶_Demo_ao_vivo-naildesigner.onrender.com-C77E8A?style=for-the-badge)](https://naildesigner.onrender.com)

<br/>

![React](https://img.shields.io/badge/React_18-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)

</div>

---

## 🔗 Demo ao vivo

| | |
|---|---|
| 🌐 **Site público** | https://naildesigner.onrender.com |
| 🔐 **Painel da profissional** | https://naildesigner.onrender.com/login |
| 👤 **Login de demonstração** | usuário `admin` · senha sob solicitação |

> ⏳ Hospedado no plano gratuito do Render: a primeira visita após um período
> ocioso pode levar ~50s para "acordar" o servidor. Depois, navegação normal.

---

## 📋 Sobre o projeto

O **Studio Bella** é um produto full-stack pensado como **modelo white-label**
para nail designers: toda a identidade (nome, contatos, cores) fica centralizada
e é trocada em poucos arquivos, permitindo entregar o mesmo sistema para
diferentes profissionais.

A aplicação cobre as duas pontas do negócio:

- **Para a cliente** — uma vitrine elegante com catálogo, portfólio e um fluxo
  de agendamento em 4 passos que respeita horários reais, pausas e conflitos.
- **Para a profissional** — um painel estilo aplicativo, com dashboard
  financeiro, agenda em linha do tempo, gestão de clientes, serviços e galeria.

---

## ✨ Funcionalidades

### 🛍️ Site público (cliente)
- Catálogo de serviços por categoria (**Unhas** / **Sobrancelhas**) com preço e duração
- **Portfólio** de trabalhos com filtro por categoria e lightbox
- **Agendamento em 4 passos** (serviço → data/horário → dados → confirmação)
- Horários gerados de **30 em 30 min**, respeitando em tempo real:
  - horário de funcionamento por dia da semana
  - **pausa configurável por dia** (ex.: almoço 12h–13h)
  - duração real de cada serviço e conflitos com outros agendamentos
  - **janela de agendamento** configurável (ex.: apenas os próximos 14 dias)
- **Política de sinal** (percentual + chave Pix + prazo de cancelamento)
- Confirmação direta no **WhatsApp** com mensagem pronta
- Consulta e cancelamento da própria reserva pelo telefone

### 📱 Painel da profissional (autenticado)
- **Dashboard**: faturamento (dia/semana/mês), ticket médio, serviços mais pedidos,
  card "próxima cliente" e gráfico de faturamento de 7 dias
- **Agenda** em linha do tempo: cliente, serviços, duração, valor, atalho de
  WhatsApp, espaços livres e ações rápidas (concluir / faltou / cancelar / editar)
- **Encaixe rápido**: marca cliente direto pelo painel com validação de conflitos
- **Clientes**: histórico, total gasto e número de visitas
- **Serviços**: criar/editar/ativar por categoria, com upload de foto
- **Galeria**: gestão do portfólio do site (upload, legenda, categoria, ocultar)
- **Configurações**: sinal, prazo de cancelamento, janela de agendamento,
  WhatsApp, horário de funcionamento com pausa por dia, bloqueios de data e
  clientes fixas (reserva recorrente)
- Layout adaptativo: **sidebar no desktop, bottom-nav no mobile**

### 🔒 Segurança
- Autenticação **JWT**, senhas com **bcrypt**
- **Rate limiting** (login e rotas públicas) e **Helmet** (cabeçalhos + CSP)
- Validação de entrada, limite de payload e **log de auditoria** das ações admin

---

## 🧱 Stack & arquitetura

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 18, React Router, Vite, Tailwind CSS, Axios |
| **Backend** | Node.js, Express, Prisma ORM |
| **Banco** | SQLite (arquivo, em volume persistente) |
| **Auth** | JWT + bcryptjs |
| **Deploy** | Serviço único (o Express serve a API **e** o site buildado) |

**Arquitetura de serviço único:** em produção o Express serve a API REST
(`/api/*`) e também os arquivos estáticos do build do React (SPA com fallback),
simplificando o deploy para um único processo.

```
Rotas da API:  /api/auth · /api/services · /api/appointments
               /api/slots · /api/business · /api/gallery
```

A lógica de geração de horários e detecção de conflitos é compartilhada em
[`server/src/utils/schedule.js`](server/src/utils/schedule.js), garantindo que o
site público e o painel apliquem exatamente as mesmas regras.

---

## 📁 Estrutura

```
.
├── client/                 # Frontend React (Vite + Tailwind)
│   ├── public/             # logo, favicon e placeholders da galeria
│   └── src/
│       ├── config/         # brand.js — identidade da marca (ponto de personalização)
│       ├── pages/          # Home, Booking, Admin, Login, MinhaReserva
│       ├── components/     # Navbar, ProtectedRoute
│       └── services/       # api.js (cliente Axios)
├── server/                 # Backend Express + Prisma
│   ├── prisma/             # schema, seed e scripts de banco
│   └── src/
│       ├── controllers/    # regras de cada recurso (inclui galeria)
│       ├── routes/         # rotas da API
│       ├── middleware/     # auth, rate limit, upload, validação
│       └── utils/          # auditoria, agenda compartilhada, settings
├── render.yaml             # blueprint de deploy (Render)
└── DEPLOY.md               # passo a passo de deploy em produção
```

---

## 🚀 Rodando localmente

**Pré-requisitos:** Node.js 18+

```bash
# 1. Clonar
git clone https://github.com/DaviSoftEng/Naildesigner.git
cd Naildesigner

# 2. Instalar dependências (raiz + server + client)
npm run setup

# 3. Configurar variáveis de ambiente
#    copie server/.env.example para server/.env e preencha
cp server/.env.example server/.env

# 4. Criar o banco e popular com dados iniciais
npm run db:setup

# 5. Subir em modo desenvolvimento (API + site)
npm run dev
```

| Recurso | URL |
|---|---|
| Site | http://localhost:5173 |
| Painel | http://localhost:5173/login |
| API | http://localhost:3001/api |

> O Vite sobe com `--host`, então dá para abrir pelo celular na mesma Wi-Fi
> usando o IP da máquina (ex.: `http://192.168.1.9:5173`).

### Variáveis de ambiente (server)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Caminho do banco (local: `file:./dev.db`) |
| `JWT_SECRET` | Chave de assinatura dos tokens (≥ 32 caracteres) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin inicial (usado pelo seed) |
| `UPLOADS_DIR` | Pasta das fotos enviadas |
| `CLIENT_URL` | Origem(ns) liberada(s) no CORS — opcional |
| `PORT` / `HOST` | Porta/host do servidor |

---

## ☁️ Deploy

O projeto inclui um [`render.yaml`](render.yaml) para deploy via **Blueprint no
Render** (gratuito) e um guia completo em **[DEPLOY.md](DEPLOY.md)** com o passo
a passo para Railway com volume persistente. Em ambos, basta build (`npm run build`)
e start (`npm start`) — o processo de start aplica o schema, roda o seed e sobe o servidor.

---

## 🎨 Personalização (white-label)

1. **Marca e contatos** — [`client/src/config/brand.js`](client/src/config/brand.js)
   (nome, profissional, WhatsApp, Instagram, endereço, Maps)
2. **Cores** — paleta *dark glam* em `client/tailwind.config.js`
3. **Serviços e preços** — pelo painel, ou no seed em `server/prisma/seed.js`
4. **Portfólio** — upload pela aba **Galeria** do painel

---

## 🗺️ Roadmap

- [x] Site público + painel de gestão funcionais
- [x] Deploy em produção (Render)
- [ ] Lembrete automático de retorno ("cliente sem agendar há 30 dias")
- [ ] Exportação do fechamento mensal
- [ ] Portfólio de sobrancelhas

---

## 👤 Autor

**Davi** — Desenvolvedor Full-Stack

[![GitHub](https://img.shields.io/badge/GitHub-DaviSoftEng-181717?style=flat&logo=github)](https://github.com/DaviSoftEng)

---

<p align="center">Feito com 💅 para nail designers que valorizam o próprio tempo.</p>