# Auth UI (HTML + CSS + JS)

A minimal login / signup UI that talks to JSON endpoints:

- `POST /api/auth/login` → `{ email, password }`
- `POST /api/auth/register` → `{ name, [age], email, password }`

The API is expected to return:
```json
{
  "token": "JWT_TOKEN",
  "user": { "email": "…", "name": "…", "role": "user" }
}
```

The token is stored in `localStorage.authToken` and user in `localStorage.user`.
The dashboard reads and displays both, and guards access (redirects if missing).

## Structure
```
auth-ui/
  public/
    assets/
      Main.png
    dashboard.html
    login.html
  css/
    dashboard.css
    style.css
  js/
    app.js
```
Open `public/login.html` in a browser (or serve `public/` via any static server).