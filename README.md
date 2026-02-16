# KodNest Premium Build System

A premium design system for serious B2C product companies.

## Design Philosophy
- **Calm, Intentional, Coherent, Confident**
- No gradients, no glassmorphism, no neon colors.
- Strict spacing scale (8px, 16px, 24px, 40px, 64px).

## Deployment

### Vercel (Recommended)
This project is deployment-ready for Vercel.

1.  Push this repository to GitHub.
2.  Log in to [Vercel](https://vercel.com).
3.  Click **Add New...** > **Project**.
4.  Import this repository.
5.  Click **Deploy**.
    
    If asked for Build & Output Settings:
    *   **Build Command** (Input): `None` (Leave empty)
    *   **Output Directory** (Output): `.` (Just a dot, or leave empty)
    *   *No build settings required for this static site.*

### Local Development
To run locally:
```bash
python3 -m http.server 8080
```
Then visit `http://localhost:8080`.
