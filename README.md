# Jane Pacheco Estética: site + agenda

Site da clínica com agendamento online e área da equipe.

| Camada | Stack |
|---|---|
| API | ASP.NET Core 8 (Minimal APIs), EF Core 8, JWT |
| Banco | SQLite em dev (troca fácil para SQL Server ou PostgreSQL) |
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
  wwwroot/uploads               fotos enviadas
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

## Colocar no ar

A Vercel hospeda o **front** (React). Ela não roda .NET, então a **API** vai para outro serviço; aqui o exemplo usa o **Render** (Docker + disco persistente para o SQLite e as fotos).

O front chama `/api/...` no próprio domínio, e o `frontend/vercel.json` repassa essas chamadas para a API. Assim não há CORS nem URL da API espalhada pelo código.

### 1. API no Render
1. render.com → **New → Blueprint** → escolha este repositório (ele lê o `render.yaml`).
2. Preencha `Admin__Email` e `Admin__Password`. A `Jwt__Key` é gerada sozinha.
3. Ao terminar, copie a URL (ex.: `https://janepacheco-api.onrender.com`) e teste `/health`.

### 2. Front na Vercel
1. Em `frontend/vercel.json`, troque `SUA-API.onrender.com` pela URL do passo anterior e faça commit.
2. vercel.com → **Add New → Project** → importe o repositório.
3. **Root Directory:** `frontend` (o resto a Vercel detecta: Vite, `npm run build`, pasta `dist`).
4. Deploy. Depois, em **Settings → Domains**, dá para ligar um domínio próprio.

## Próximos passos sugeridos

1. **Clientes**: tabela própria (hoje o nome/telefone fica no agendamento) + tela com histórico e faltas.
2. **Banco de produção**: trocar `UseSqlite` por `UseNpgsql`/`UseSqlServer` e `EnsureCreated` por migrations (`dotnet ef migrations add Inicial`).
3. **Login**: ASP.NET Identity com usuários por profissional.
4. **Lembretes automáticos**: `BackgroundService` que envia o lembrete do dia seguinte pela API oficial do WhatsApp (Meta Cloud API) ou um provedor como Twilio/Z-API.
5. **Anti-spam** na reserva pública: rate limiting (`AddRateLimiter`) e captcha (Cloudflare Turnstile).
6. **Deploy**: API em Azure App Service / Railway / Render; front em Vercel/Netlify, ou servir o `dist` do React pelo próprio `wwwroot` da API. Fotos em Azure Blob / S3.
