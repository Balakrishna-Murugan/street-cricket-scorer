# SMTP / Email configuration for Street Cricket server

This file explains how to configure SMTP settings for the server so the `sendSummary` endpoint can send emails.

Important security note
-----------------------
- Do NOT commit secrets (like `SMTP_PASS`) into the repository.
- Use a local `server/.env` file or your deployment's secret manager to provide credentials.

Quick steps (recommended)
-------------------------
1. Create a local `.env` file in the `server/` folder by copying the example:

   Copy `server/.env.example` to `server/.env`.

2. Edit `server/.env` and fill the real values. Example (DO NOT commit):

   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=ScoreMateKey
   SMTP_PASS=<your-sendgrid-smtp-password>
   SMTP_SECURE=false
   EMAIL_FROM=you@yourdomain.com

3. Restart the server so Node picks up the new env vars (example commands):

   # from project root (PowerShell)
   cd server
   # If you run with npm script (check server/package.json for script name):
   npm run dev  # or `npm start` depending on your setup

   If you use a process manager (pm2/docker/etc), restart that process instead.

Alternative: set env vars in the current PowerShell session (temporary)
------------------------------------------------------------------
You can set environment variables for the current PowerShell session (they'll be lost when you close the shell):

  $env:SMTP_HOST = "smtp.sendgrid.net"
  $env:SMTP_PORT = "587"
  $env:SMTP_USER = "ScoreMateKey"
  $env:SMTP_PASS = "<your-sendgrid-smtp-password>"
  $env:SMTP_SECURE = "false"
  $env:EMAIL_FROM = "you@yourdomain.com"

Then start the server in that same session so the process inherits the variables.

Deployments / production
------------------------
Use your hosting platform's secrets/vars feature (Heroku config vars, Docker secrets, systemd env files, Azure Key Vault, AWS Parameter Store, etc.) rather than committing credentials to code.

If you want, I can generate an `.env` file locally on your machine (I will not commit it) or provide the exact PowerShell commands to set them if you confirm.
