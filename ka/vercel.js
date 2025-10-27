{
  "version": 2,
  "builds": [
    {
      "src": "*.html",
      "use": "@vercel/static"
    },
    {
      "src": "*.js",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "SUPABASE_URL": "https://xliutvspwodhoaxvysks.supabase.co",
    "SUPABASE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXV0dnNwd29kaG9heHZ5c2tzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1ODI5OSwiZXhwIjoyMDcyOTM0Mjk5fQ.WQ8gtJD1hRUGL0L7uQ9ApfKFEyhDUZjQ8Vs0A7g6udo"
  }
}
