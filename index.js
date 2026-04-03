require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const express = require('express');
const YahooFinance = require('yahoo-finance2').default;
const cors = require('cors');
const fs = require('fs');

const yahooFinance = new YahooFinance();

const app = express();
app.use(cors());
app.use(express.json());

// Load data saham Indonesia dari stocks.json
const stocks = JSON.parse(fs.readFileSync('./stocks.json', 'utf8'));

// Endpoint home
app.get('/', (req, res) => {
  res.send(`
    <h1>Yahoo Finance Indonesia API</h1>
    <p>Contoh endpoint:</p>
    <ul>
      <li>/stock/BBCA</li>
      <li>/history/BBCA</li>
      <li>/search/bank</li>
      <li>/company/BBCA</li>
      <li>/full/BBCA</li>
    </ul>
  `);
});

// Endpoint data real-time saham
app.get('/stock/:ticker', async (req, res) => {
  try {
    const inputTicker = req.params.ticker.toUpperCase();
    const ticker = inputTicker.includes('.') ? inputTicker : inputTicker + '.JK';

    const quote = await yahooFinance.quote(ticker);

    res.json({
      symbol: quote.symbol,
      shortName: quote.shortName,
      currentPrice: quote.regularMarketPrice,
      previousClose: quote.regularMarketPreviousClose,
      open: quote.regularMarketOpen,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      averageVolume: quote.averageDailyVolume3Month,
      marketCap: quote.marketCap,
      currency: quote.currency,
      exchange: quote.fullExchangeName,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      trailingPE: quote.trailingPE,
      dividendYield: quote.dividendYield,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent
    });
  } catch (error) {
    console.error('Error stock:', error);

    res.status(500).json({
      error: error.message
    });
  }
});

// Endpoint historical price
app.get('/history/:ticker', async (req, res) => {
  try {
    const inputTicker = req.params.ticker.toUpperCase();
    const ticker = inputTicker.includes('.') ? inputTicker : inputTicker + '.JK';

    const period1 = req.query.period1 || '2025-01-01';
    const period2 = req.query.period2 || '2025-04-01';
    const interval = req.query.interval || '1d';

    const history = await yahooFinance.historical(ticker, {
      period1,
      period2,
      interval
    });

    const formattedHistory = history.map(item => ({
      date: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume
    }));

    res.json(formattedHistory);
  } catch (error) {
    console.error('Error history:', error);

    res.status(500).json({
      error: error.message
    });
  }
});

// Endpoint search saham Indonesia
app.get('/search/:keyword', async (req, res) => {
  try {
    const keyword = req.params.keyword.toLowerCase();

    const filtered = stocks
      .filter(stock =>
        stock.code.toLowerCase().includes(keyword) ||
        stock.name.toLowerCase().includes(keyword)
      )
      .sort((a, b) => {
        const aStarts =
          a.code.toLowerCase().startsWith(keyword) ||
          a.name.toLowerCase().startsWith(keyword);

        const bStarts =
          b.code.toLowerCase().startsWith(keyword) ||
          b.name.toLowerCase().startsWith(keyword);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return a.name.localeCompare(b.name);
      });

    res.json(filtered.slice(0, 20));
  } catch (error) {
    console.error('Error search:', error);

    res.status(500).json({
      error: error.message
    });
  }
});

// Endpoint detail perusahaan dari CSV
app.get('/company/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();

    const company = stocks.find(stock => stock.code === ticker);

    if (!company) {
      return res.status(404).json({
        error: 'Saham tidak ditemukan'
      });
    }

    res.json(company);
  } catch (error) {
    console.error('Error company:', error);

    res.status(500).json({
      error: error.message
    });
  }
});

// Endpoint gabungan CSV + Yahoo Finance
app.get('/full/:ticker', async (req, res) => {
  try {
    const inputTicker = req.params.ticker.toUpperCase();

    const company = stocks.find(stock => stock.code === inputTicker);

    if (!company) {
      return res.status(404).json({
        error: 'Saham tidak ditemukan'
      });
    }

    const quote = await yahooFinance.quote(inputTicker + '.JK');

    res.json({
      symbol: company.symbol,
      code: company.code,
      name: company.name,
      listingDate: company.listingDate,
      listingBoard: company.listingBoard,
      shares: company.shares,

      currentPrice: quote.regularMarketPrice,
      previousClose: quote.regularMarketPreviousClose,
      open: quote.regularMarketOpen,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      averageVolume: quote.averageDailyVolume3Month,
      marketCap: quote.marketCap,
      currency: quote.currency,
      exchange: quote.fullExchangeName,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      trailingPE: quote.trailingPE,
      dividendYield: quote.dividendYield,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent
    });
  } catch (error) {
    console.error('Error full:', error);

    res.status(500).json({
      error: error.message
    });
  }
});

app.get('/top-gainers', async (req, res) => {
  try {
    const sampleStocks = stocks.slice(0, 50);

    const results = await Promise.all(
      sampleStocks.map(async (stock) => {
        try {
          const quote = await yahooFinance.quote(stock.symbol);

          return {
            code: stock.code,
            name: stock.name,
            currentPrice: quote.regularMarketPrice,
            changePercent: quote.regularMarketChangePercent
          };
        } catch {
          return null;
        }
      })
    );

    const filtered = results
      .filter(item => item !== null)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 10);

    res.json(filtered);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.get('/top-losers', async (req, res) => {
  try {
    const sampleStocks = stocks.slice(0, 50);

    const results = await Promise.all(
      sampleStocks.map(async (stock) => {
        try {
          const quote = await yahooFinance.quote(stock.symbol);

          return {
            code: stock.code,
            name: stock.name,
            currentPrice: quote.regularMarketPrice,
            changePercent: quote.regularMarketChangePercent
          };
        } catch {
          return null;
        }
      })
    );

    const filtered = results
      .filter(item => item !== null)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 10);

    res.json(filtered);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.post('/watchlist', async (req, res) => {
  try {
    const tickers = req.body.tickers;

    const results = await Promise.all(
      tickers.map(async (ticker) => {
        const quote = await yahooFinance.quote(ticker + '.JK');

        return {
          code: ticker,
          currentPrice: quote.regularMarketPrice,
          changePercent: quote.regularMarketChangePercent
        };
      })
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.post('/backtest', async (req, res) => {
  try {
    const stocks = req.body.stocks;

    const results = await Promise.all(
      stocks.map(async (item) => {
        try {
          const history = await yahooFinance.historical(item.ticker + '.JK', {
            period1: item.entryDate,
            period2: item.endDate,
            interval: '1d'
          });

          if (!history || history.length === 0) {
            return {
              ticker: item.ticker,
              error: 'Tidak ada data historical'
            };
          }

          const highestPrice = Math.max(...history.map(h => h.high));
          const lowestPrice = Math.min(...history.map(h => h.low));
          const lastClose = history[history.length - 1].close;

          let status = 'Floating';
          let exitPrice = lastClose;
          let exitDate = item.endDate;

          for (const day of history) {
            if (day.low <= item.stopLoss) {
              status = 'Stop Loss Hit';
              exitPrice = item.stopLoss;
              exitDate = day.date;
              break;
            }

            if (day.high >= item.targetPrice) {
              status = 'Target Hit';
              exitPrice = item.targetPrice;
              exitDate = day.date;
              break;
            }
          }

          const returnPercent =
            ((exitPrice - item.buyPrice) / item.buyPrice) * 100;

          const floatingPnL = lastClose - item.buyPrice;
          const floatingPnLPercent =
            ((lastClose - item.buyPrice) / item.buyPrice) * 100;

          const reward = item.targetPrice - item.buyPrice;
          const risk = item.buyPrice - item.stopLoss;
          const rrRatio = risk > 0 ? reward / risk : 0;

          const maxDrawdown =
            ((item.buyPrice - lowestPrice) / item.buyPrice) * 100;

          const plannedHoldingDays = Math.ceil(
            (new Date(item.endDate) - new Date(item.entryDate)) /
              (1000 * 60 * 60 * 24)
          );

          const actualHoldingDays = Math.ceil(
            (new Date(exitDate) - new Date(item.entryDate)) /
              (1000 * 60 * 60 * 24)
          );

          return {
            ticker: item.ticker,
            entryDate: item.entryDate,
            endDate: item.endDate,
            exitDate,
            buyPrice: item.buyPrice,
            targetPrice: item.targetPrice,
            stopLoss: item.stopLoss,
            highestPrice,
            lowestPrice,
            currentPrice: lastClose,
            exitPrice,
            status,
            returnPercent: Number(returnPercent.toFixed(2)),
            floatingPnL: Number(floatingPnL.toFixed(2)),
            floatingPnLPercent: Number(floatingPnLPercent.toFixed(2)),
            reward: Number(reward.toFixed(2)),
            risk: Number(risk.toFixed(2)),
            rrRatio: Number(rrRatio.toFixed(2)),
            maxDrawdown: Number(maxDrawdown.toFixed(2)),
            plannedHoldingDays,
            actualHoldingDays
          };
        } catch (error) {
          return {
            ticker: item.ticker,
            error: error.message
          };
        }
      })
    );

    const validResults = results.filter(item => !item.error);

    const totalReturn = validResults.reduce((sum, item) => {
      return sum + item.returnPercent;
    }, 0);

    const averageReturn =
      validResults.length > 0
        ? totalReturn / validResults.length
        : 0;

    const winningTrades = validResults.filter(
      item => item.returnPercent > 0
    ).length;

    const losingTrades = validResults.filter(
      item => item.returnPercent <= 0
    ).length;

    const averageHoldingDays =
      validResults.length > 0
        ? validResults.reduce((sum, item) => sum + item.actualHoldingDays, 0) /
          validResults.length
        : 0;

    const winRate =
      validResults.length > 0
        ? (winningTrades / validResults.length) * 100
        : 0;

    if (validResults.length > 0) {
    const supabaseData = validResults.map(item => ({
        ticker: item.ticker,
        entry_date: item.entryDate,
        end_date: item.endDate,
        buy_price: item.buyPrice,
        target_price: item.targetPrice,
        stop_loss: item.stopLoss,
        highest_price: item.highestPrice,
        lowest_price: item.lowestPrice,
        current_price: item.currentPrice,
        exit_price: item.exitPrice,
        status: item.status,
        return_percent: item.returnPercent,
        rr_ratio: item.rrRatio,
        max_drawdown: item.maxDrawdown,
        holding_days: item.actualHoldingDays
    }))

    const { error } = await supabase
        .from('backtest_history')
        .insert(supabaseData)

    if (error) {
        console.error('Supabase insert error:', error)
    } else {
        console.log('Data berhasil disimpan ke Supabase')
    }
    }

    res.json({
      summary: {
        totalTrades: validResults.length,
        winningTrades,
        losingTrades,
        winRate: Number(winRate.toFixed(2)),
        totalReturn: Number(totalReturn.toFixed(2)),
        averageReturn: Number(averageReturn.toFixed(2)),
        averageHoldingDays: Number(averageHoldingDays.toFixed(2))
      },
      results
    });
  } catch (error) {
    console.error('Error backtest:', error);

    res.status(500).json({
      error: error.message
    });
  }
});

// Jalankan server
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})