# Deploy Guide — 100% free, NO credit card

Lagbe 3 ta free account: **GitHub** + **Turso** (database) + **Koyeb** (server).
Frontend er jonno: **Netlify**. Kono card lagbe na.

## 0. GitHub e code push

1. github.com e free account banan (card lagbe na)
2. New repository → naam `nexustalk` (private rakhlei hobe)
3. Ei 3 ta folder push korun: `server/`, `nexustalk/`, (agent apnar PC te thakbe, push korte hobe na)

## 1. Turso — database (free, card na)

1. **[turso.tech](https://turso.tech)** → "Sign up with GitHub"
2. Terminal/cmd e (database banate):
   ```
   turso db create nexustalk
   turso db show nexustalk --url
   turso db tokens create nexustalk
   ```
3. Duita jinish copy korun: **URL** (`libsql://nexustalk-...turso.io`) ar **token**

(Or dashboard thekeo kora jay)

## 2. Koyeb — backend server (free, card na, WebSocket support)

1. **[koyeb.com](https://koyeb.com)** → "Sign in with GitHub"
2. **Create Web Service → GitHub** → `nexustalk` repo select
3. Settings:
   - **Builder**: Buildpack / Dockerfile chara — "Buildpack", **Root directory**: `server`
   - **Run command**: `node src/index.js`
   - **Port**: `4000` (App port e 4000 likhun, listening port o 4000)
4. **Environment variables** add korun:
   | Name | Value |
   |---|---|
   | `TURSO_URL` | Turso URL (step 1) |
   | `TURSO_TOKEN` | Turso token |
   | `HOST` | `0.0.0.0` |
   | `PORT` | `4000` |
   | `ALLOWED_ORIGINS` | `https://APNAR-NETLIFY-URL.netlify.app` (step 3 er por abar ashe edit korun) |
   | `GOOGLE_CLIENT_ID` | apnar Google client ID |
   | `GOOGLE_CLIENT_SECRET` | apnar Google client secret |
   | `PUBLIC_BASE` | `https://APNAR-KOYEB-URL.koyeb.app` |
   | `FRONTEND_URL` | `https://APNAR-NETLIFY-URL.netlify.app` |
   | `JWT_SECRET` jodi thake | default ase — production e change korun (src/jwt.js) |
5. Deploy → 2-3 minute por URL paben: `https://something.koyeb.app`
6. Test: `https://APNAR-KOYEB-URL.koyeb.app/api/health` → `{"ok":true}` asha uchit

## 3. Netlify — frontend (free, card na)

1. **[netlify.com](https://netlify.com)** → "Sign up with GitHub"
2. **Add new site → Import an existing project** → `nexustalk` repo
3. Settings:
   - **Base directory**: `nexustalk`
   - Build command: `npm run build`
   - Publish directory: `nexustalk/dist`
4. **Environment variables** (Site settings → Environment):
   | Name | Value |
   |---|---|
   | `VITE_API_URL` | `https://APNAR-KOYEB-URL.koyeb.app` |
5. Deploy → URL: `https://apnar-name.netlify.app`
6. Koyeb er `ALLOWED_ORIGINS` e ekhon ei Netlify URL boshhe **Redeploy** din

## 4. Google login — ekbari, sesh bar!

Google Console → Credentials → apnar client e:
- **Authorized JavaScript origins**: `https://apnar-name.netlify.app`
- **Authorized redirect URIs**: `https://APNAR-KOYEB-URL.koyeb.app/api/auth/google/callback`

Save — **ar kokhono change hobe na** (link fixed thakbe)!

## 5. Agent (remote control) — cloud er sathe

`agent/agent_config.json` e:
```json
{
  "server_url": "https://APNAR-KOYEB-URL.koyeb.app",
  "token": "notun token — login kore niten (nichhe)",
  "max_width": 1600,
  "fps": 24
}
```
Token: app e login thakle browser console e `(localStorage.getItem('nexustalk_token'))` copy koren,
ba `POST /api/auth/login` theke token nen.

## Cost: 0 taka. Kono card na. Link fixed. Server idle thakle ~30s cold-start (free tier er niyom).
