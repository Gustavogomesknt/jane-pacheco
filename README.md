# Jane Pacheco Estética: site + agenda

Site da clínica com agendamento online e área da equipe.

| Camada | Stack |
|---|---|
| API | ASP.NET Core 8 (Minimal APIs), EF Core 8, JWT |
| Banco | SQLite em dev, Postgres (Neon) em produção |
| Front | React 18 + Vite + TypeScript + React Router |

## Como rodar

Pré-requisitos: **.NET 8 SDK** e **Node 20+**.

```bash
# 1) API  →  http://localhost:5080/swagger
cd backend/JanePacheco.Api
dotnet user-secrets set "Admin:Password" "uma-senha-forte"
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)"
dotnet watch run --urls http://localhost:5080

# 2) Front  →  http://localhost:5173
cd frontend
npm install
npm run dev
```

No VS Code: `Ctrl+Shift+P` → **Tasks: Run Task** → **dev: tudo** sobe os dois juntos.
Para depurar a API com breakpoints, use **Run and Debug** → "API (.NET) com debug".

O banco `janepacheco.db` é criado sozinho na primeira execução, com os tratamentos e a profissional de exemplo.
Se você já tinha um `janepacheco.db` de versões anteriores, apague-o para recriar com a tabela nova de fotos.

- Site: `http://localhost:5173/`
- Área da equipe: `http://localhost:5173/equipe` (e-mail/senha de `Admin:*`)

## Estrutura

```
backend/JanePacheco.Api
  Domain/Entities.cs            entidades (Appointment, ServiceItem, Professional, ClinicSettings, Photo)
  Data/AppDbContext.cs, Seed.cs
  Services/AvailabilityService  cálculo de horários livres e conflitos
  Endpoints/PublicEndpoints     /api/public/*  (site, sem login)
  Endpoints/AdminEndpoints      /api/admin/*   (equipe, JWT)
  Endpoints/AuthEndpoints       /api/auth/login
frontend/src
  api.ts                        cliente HTTP tipado
  pages/SitePage.tsx            site público
  components/Booking.tsx        fluxo de agendamento (4 passos)
  pages/admin/AgendaPage.tsx    agenda do dia por profissional
  pages/admin/SettingsPage.tsx  textos, horários, fotos, tratamentos, equipe
```

## Regras de negócio já implementadas

- Horários livres consideram abertura/fechamento, dias fechados, intervalo da agenda, duração do tratamento e agenda de cada profissional.
- Pelo site, só aceita horários com 1h de antecedência.
- Reserva pública roda em transação serializável: duas clientes não pegam o mesmo horário (a segunda recebe 409).
- Com mais de uma profissional, o site atribui automaticamente a primeira livre.
- Agendamento guarda cópia do nome/preço do tratamento, então editar o catálogo não altera o histórico.
- Tratamentos são ocultados, nunca apagados.

## Colocar no ar (custo zero)

| Parte | Serviço gratuito |
|---|---|
| Banco + fotos | **Neon** (Postgres, 0,5 GB) |
| API (.NET) | **Render** Free (Docker) |
| Site (React) | **Cloudflare Pages** |

Localmente continua usando SQLite. A API troca para Postgres sozinha quando a connection string for do Neon.
As fotos ficam dentro do banco (o disco do Render gratuito é apagado a cada reinício) e o site comprime cada foto antes de enviar.

### 1. Banco no Neon
1. neon.tech → crie um projeto (região mais próxima: **São Paulo**, se disponível; senão, US East).
2. Em **Connect**, copie a connection string (`postgresql://...`).

### 2. API no Render
1. render.com → **New → Blueprint** → escolha o repositório (lê o `render.yaml`).
2. Preencha as variáveis:
   - `ConnectionStrings__Default`: a string do Neon
   - `Admin__Email` e `Admin__Password`: login da área da equipe
   - `Cors__Origins__0`: deixe `http://localhost:5173` por enquanto; no passo 3 troque pela URL do site
3. Quando terminar, abra `https://SUA-API.onrender.com/health` e confira `{"status":"ok"}`.
   As tabelas e os tratamentos de exemplo são criados sozinhos no primeiro start.

### 3. Site no Cloudflare Pages
1. dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git** → escolha o repositório.
2. Configuração do build:
   - Framework preset: **Vite** (ou React)
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Variável de ambiente: `VITE_API_URL` = `https://SUA-API.onrender.com`
3. Depois do deploy, copie a URL (`https://xxxx.pages.dev`) e volte no Render: coloque essa URL em `Cors__Origins__0`.

### Limitações do plano gratuito
- O Render desliga a API após 15 min sem acesso; o primeiro acesso depois disso demora ~1 min.
  Um monitor gratuito (ex.: UptimeRobot) chamando `/health` a cada 10 min mantém ela acordada.
- Neon: 0,5 GB. Com fotos comprimidas, sobra para anos de agendamentos.
- Confira os termos de uso de cada serviço antes de publicar; eles mudam com o tempo.

## Próximos passos sugeridos

1. **Clientes**: tabela própria (hoje o nome/telefone fica no agendamento) + tela com histórico e faltas.
2. **Migrations**: trocar `EnsureCreated` por migrations (`dotnet ef migrations add Inicial`) antes de mudar o esquema com dados reais.
3. **Login**: ASP.NET Identity com usuários por profissional.
4. **Lembretes automáticos**: `BackgroundService` que envia o lembrete do dia seguinte pela API oficial do WhatsApp (Meta Cloud API) ou um provedor como Twilio/Z-API.
5. **Anti-spam** na reserva pública: rate limiting (`AddRateLimiter`) e captcha (Cloudflare Turnstile).
6. **Deploy**: API em Azure App Service / Railway / Render; front em Vercel/Netlify, ou servir o `dist` do React pelo próprio `wwwroot` da API. Fotos em Azure Blob / S3.
