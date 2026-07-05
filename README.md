# MAST 26 DB - Mini Tools Web App

Una web app con mini strumenti utili.

## Funzionalità

- **Testa o Croce** - Lancia una moneta virtuale
- **Generatore di Numeri** - Genera un numero casuale (default 1-67)
- **Brawler Casuale** - Estrai un brawler a caso da Brawl Stars
- **Note** - Salva e gestisci le tue note

## Setup Locale

1. Clona il repo
2. `npm install`
3. Crea `.env` con `DATABASE_URL` e `PORT`
4. `npm run dev`

## Deploy su Render

1. Crea un nuovo Web Service su Render
2. Collega il repo GitHub
3. Aggiungi un database PostgreSQL
4. Setta `DATABASE_URL` dalle variabili d'ambiente del DB
5. Deploy!
