# Stock Data Fetcher 📊

A web application to fetch stock data from Yahoo Finance. Upload an Excel file with stock tickers and get back the file with additional data points like Float, Shares Outstanding, and more!

## Features

- 🌙 Beautiful dark-themed UI
- 📤 Upload Excel files (.xlsx, .xls)
- ✨ Select from 21+ data points from Yahoo Finance
- 📊 Preview fetched data in the browser
- 📥 Download updated Excel file

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## Deployment

This app is ready for Vercel deployment. Simply:
1. Push to GitHub
2. Import in Vercel
3. Deploy!

## Excel Format

Your Excel file should have a column named "Symbol", "Ticker", "Stock", or "Code" containing the stock tickers (e.g., AAPL, MSFT, ABB.NS).

---
Made with ❤️
