# 💅 Studio Bella — Nail Designer

Sistema de **agendamento online** para nail designers (unhas e sobrancelhas).
As clientes escolhem o serviço, a data e o horário pelo site; a profissional
gerencia tudo por um painel administrativo — agenda, clientes, serviços,
portfólio de fotos e configurações.

> Site público + painel da profissional, em uma aplicação React + Node, pronta
> para produção (deploy de serviço único no Railway).
>
> 💡 **Modelo personalizável**: nome, contatos e endereço ficam centralizados em
> `client/src/config/brand.js` — troque ali e o site inteiro se adapta.

---

## ✨ Funcionalidades

### Cliente (público)
- Catálogo de serviços por categoria (**Unhas** / **Sobrancelhas**) com preços e duração
- **Portfólio de trabalhos** com filtro por categoria e lightbox (gerenciado pelo painel)
- Agendamento em 4 passos (serviço → data/horário → dados → confirmação)
- Horários gerados de **30 em 30 minutos**, respeitando:
  - horário de funcionamento por dia da semana
  - **pausa configurável por dia** (ex.: almoço 12h–13h)
  - duração real dos serviços e conflitos com outros agendamentos
  - **janela de agendamento** configurável (ex.: só os próximos 14 dias)
- **Política de sinal** exibida no agendamento (percentual + chave Pix + prazo de cancelamento)
- Confirmação direto no WhatsApp do studio com mensagem pronta
- Consulta e cancelamento da própria reserva pelo telefone

### Painel da profissional (autenticado)
- **Dashboard** com faturamento (dia/semana/mês), ticket médio e serviços mais pedidos
- **Agenda** em linha do tempo: resumo do dia, cliente, serviços, duração, valor,
  botão de WhatsApp, espaços livres e ações rápidas (concluir / faltou / cancelar / editar)
- **Clientes**: histórico, total gasto e visitas
- **Serviços**: criar/editar/ativar por categoria, com **upload de foto pelo celular**
- **Galeria**: gerencia o portfólio do site (upload, legenda, categoria, ocultar/excluir)
- **Configurações**: sinal (% e chave Pix), prazo de cancelamento, janela de agendamento,
  WhatsApp, horário de funcionamento com pausa por dia, bloqueios de data e clientes fixas
  (reserva recorrente com duração real)

### Segurança
- Autenticação JWT, senhas com bcrypt
- Rate limiting (login e rotas públicas), Helmet (cabeçalhos HTTP + CSP)
- Validação de entrada, limite de payload, log de auditoria das ações administrativas

---

## 🧱 Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 18, React Router, Vite, Tailwind CSS, Axios |
| Backend | Node.js, Express, Prisma ORM |
| Banco | SQLite (arquivo, em volume persistente) |
| Auth | JWT + bcryptjs |
| Deploy | Railway (serviço único: API serve a API **e** o site buildado) |

---

## 🚀 Rodando localmente

Pré-requisitos: **Node.js 18+**.

```bash
# 1. Instalar dependências (server + client)
npm run setup

# 2. Configurar variáveis de ambiente
#    copie server/.env.example para server/.env e preencha
#    (JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, etc.)

# 3. Criar o banco e popular com dados iniciais
npm run db:setup

# 4. Subir em modo desenvolvimento (API + site juntos)
npm run dev
```

- Site: http://localhost:5173
- API:  http://localhost:3001/api
- Painel: http://localhost:5173/login

> Para acessar pelo celular na mesma Wi-Fi, o Vite já sobe com `--host`; use o IP
> da sua máquina (ex.: `http://192.168.1.9:5173`).

---

## 🎨 Personalizando para uma cliente

1. **Marca e contatos**: edite `client/src/config/brand.js` (nome, profissional,
   WhatsApp, Instagram, endereço e link do Maps).
2. **Cores**: a paleta rosé/nude fica em `client/tailwind.config.js` (`cream`,
   `petal`, `blush`, `linen`, `rose`, `cocoa`, `gold`).
3. **Serviços e preços**: edite pelo painel (ou ajuste o seed em
   `server/prisma/seed.js` antes do primeiro deploy).
4. **Fotos**: suba as fotos reais do portfólio pela aba **Galeria** do painel
   (as imagens iniciais são placeholders).
5. **Foto da profissional**: coloque `profissional.jpg` em `client/public/`.

---

## 🔑 Variáveis de ambiente (server)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Caminho do banco. Local: `file:./dev.db` · Prod: `file:/data/dev.db` |
| `JWT_SECRET` | Chave de assinatura dos tokens (≥ 32 caracteres) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin inicial (usado pelo seed) |
| `UPLOADS_DIR` | Pasta das fotos enviadas (prod: `/data/uploads`) |
| `CLIENT_URL` | Origem(ns) liberada(s) no CORS (separadas por vírgula) — opcional |
| `PORT` / `HOST` | Porta/host do servidor (definidos automaticamente no Railway) |

Gerar um `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 📜 Scripts principais

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe API + site em desenvolvimento |
| `npm run build` | Instala tudo, gera o Prisma e builda o site (usado no deploy) |
| `npm start` | Modo produção: aplica o schema, roda o seed e sobe o servidor |
| `npm run db:setup` | Cria as tabelas e popula os dados iniciais |
| `npm run db:reset-admin --prefix server` | Recria/atualiza a senha do admin a partir do `.env` |

---

## 📁 Estrutura

```
.
├── client/            # Frontend React (Vite + Tailwind)
│   ├── public/        # logo.svg e placeholders da galeria
│   └── src/
│       ├── config/    # brand.js (dados da marca — personalize aqui)
│       ├── pages/     # Home, Booking, Admin, Login, MinhaReserva
│       ├── components/ # Navbar, ProtectedRoute
│       └── services/  # api.js (cliente axios)
├── server/            # Backend Express + Prisma
│   ├── prisma/        # schema, seed e scripts de banco
│   └── src/
│       ├── controllers/  # regras de cada recurso (inclui galeria)
│       ├── routes/       # rotas da API
│       ├── middleware/   # auth, rate limit, upload, validação
│       └── utils/        # auditoria, agenda compartilhada, settings
├── railway.json       # configuração de build/deploy do Railway
└── DEPLOY.md          # passo a passo do deploy em produção
```

---

## ☁️ Deploy

Roda como **um único serviço** no Railway (o Express serve a API e o site buildado),
com banco e fotos em um **volume persistente**. O passo a passo completo está em
**[DEPLOY.md](DEPLOY.md)**.

---

<p align="center">Feito com 💅 para nail designers que valorizam o próprio tempo.</p>
