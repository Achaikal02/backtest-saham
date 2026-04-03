import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import stockData from './stocks.json'

function App() {
  const [ticker, setTicker] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [stocks, setStocks] = useState(() => {
  const savedStocks = localStorage.getItem('stocks')
    return savedStocks ? JSON.parse(savedStocks) : []
  })

  const [result, setResult] = useState(() => {
    const savedResult = localStorage.getItem('result')
    return savedResult ? JSON.parse(savedResult) : null
  })
  const [loading, setLoading] = useState(false)
  const [historyData, setHistoryData] = useState([])
  useEffect(() => {
    localStorage.setItem('stocks', JSON.stringify(stocks))
  }, [stocks])

  useEffect(() => {
    localStorage.setItem('result', JSON.stringify(result))
  }, [result])
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get('/api/history')
        setHistoryData(response.data)
      } catch (error) {
        console.error('Gagal mengambil history:', error)
      }
    }

    fetchHistory()
  }, [])

  const stockOptions = stockData.map((item) => item.code)

  const handleAddStock = () => {
      if (!ticker || !entryDate || !endDate || !buyPrice || !targetPrice || !stopLoss) {
        alert('Semua field harus diisi')
        return
      }

      if (Number(targetPrice) <= Number(buyPrice)) {
        alert('Target Price harus lebih besar dari Buy Price')
        return
      }

      if (Number(stopLoss) >= Number(buyPrice)) {
        alert('Stop Loss harus lebih kecil dari Buy Price')
        return
      }

      if (new Date(endDate) < new Date(entryDate)) {
        alert('End Date tidak boleh sebelum Entry Date')
        return
      }

    const newStock = {
      ticker: ticker.toUpperCase(),
      entryDate,
      endDate,
      buyPrice: Number(buyPrice),
      targetPrice: Number(targetPrice),
      stopLoss: Number(stopLoss)
    }

    setStocks([...stocks, newStock])

    setTicker('')
    setEntryDate('')
    setEndDate('')
    setBuyPrice('')
    setTargetPrice('')
    setStopLoss('')
  }

  const handleDeleteStock = (index) => {
    const updatedStocks = stocks.filter((_, i) => i !== index)
    setStocks(updatedStocks)
  }

  const handleClearStocks = () => {
    setStocks([])
    setResult(null)
  }

  const handleRunBacktest = async () => {
    try {
      setLoading(true)

        const response = await axios.post('/api/backtest', {
          stocks
        })

      setResult(response.data)
    } catch (error) {
      console.error(error)
      alert('Gagal menjalankan backtest')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1 className="title">Backtest Saham Indonesia</h1>

      <div className="form-container">
        <input
          className="input"
          type="text"
          placeholder="Ticker"
          list="ticker-options"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
        />

        <datalist id="ticker-options">
          {stockOptions.map((code, index) => {
            const stock = stockData.find((item) => item.code === code)

            return (
              <option
                key={index}
                value={code}
                label={stock?.name}
              />
            )
          })}
        </datalist>

        <input
          className="input"
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
        />

        <input
          className="input"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <input
          className="input"
          type="number"
          placeholder="Buy Price"
          value={buyPrice}
          onChange={(e) => setBuyPrice(e.target.value)}
        />

        <input
          className="input"
          type="number"
          placeholder="Target Price"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
        />

        <input
          className="input"
          type="number"
          placeholder="Stop Loss"
          value={stopLoss}
          onChange={(e) => setStopLoss(e.target.value)}
        />

        <button className="button add-button" onClick={handleAddStock}>
          Tambah Saham
        </button>
      </div>

      <h2>Daftar Saham</h2>

      {stocks.length === 0 ? (
        <p>Belum ada saham ditambahkan</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Entry Date</th>
                <th>End Date</th>
                <th>Buy Price</th>
                <th>Target Price</th>
                <th>Stop Loss</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock, index) => (
                <tr key={index}>
                  <td>{stock.ticker}</td>
                  <td>{stock.entryDate}</td>
                  <td>{stock.endDate}</td>
                  <td>{stock.buyPrice}</td>
                  <td>{stock.targetPrice}</td>
                  <td>{stock.stopLoss}</td>
                  <td>
                    <button
                      className="button delete-button"
                      onClick={() => handleDeleteStock(index)}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stocks.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <button className="button run-button" onClick={handleRunBacktest}>
            {loading ? 'Loading...' : 'Run Backtest'}
          </button>

          <button className="button clear-button" onClick={handleClearStocks}>
            Clear All
          </button>
        </div>
      )}

      {result && (
        <div className="summary-card">
          <h2>Ringkasan</h2>

          <p><strong>Total Trades:</strong> {result.summary.totalTrades}</p>
          <p><strong>Winning Trades:</strong> {result.summary.winningTrades}</p>
          <p><strong>Losing Trades:</strong> {result.summary.losingTrades}</p>
          <p><strong>Win Rate:</strong> {result.summary.winRate}%</p>
          <p><strong>Total Return:</strong> {result.summary.totalReturn}%</p>
          <p><strong>Average Return:</strong> {result.summary.averageReturn}%</p>
          <p><strong>Average Holding Days:</strong> {result.summary.averageHoldingDays}</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '30px' }}>
          <h2>Hasil Backtest</h2>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Entry Date</th>
                  <th>End Date</th>
                  <th>Buy Price</th>
                  <th>Target Price</th>
                  <th>Stop Loss</th>
                  <th>Highest Price</th>
                  <th>Lowest Price</th>
                  <th>Current Price</th>
                  <th>Exit Price</th>
                  <th>Status</th>
                  <th>Return %</th>
                  <th>RR Ratio</th>
                  <th>Max Drawdown</th>
                  <th>Holding Days</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((item, index) => (
                  <tr key={index}>
                    <td>{item.ticker}</td>
                    <td>{item.entryDate}</td>
                    <td>{item.endDate}</td>
                    <td>{item.buyPrice}</td>
                    <td>{item.targetPrice}</td>
                    <td>{item.stopLoss}</td>
                    <td>{item.highestPrice}</td>
                    <td>{item.lowestPrice}</td>
                    <td>{item.currentPrice}</td>
                    <td>{item.exitPrice}</td>
                    <td
                      className={
                        item.status === 'Target Hit'
                          ? 'status-profit'
                          : item.status === 'Stop Loss Hit'
                          ? 'status-loss'
                          : 'status-floating'
                      }
                    >
                      {item.status}
                    </td>
                    <td className={item.returnPercent >= 0 ? 'positive' : 'negative'}>
                      {item.returnPercent.toFixed(2)}%
                    </td>
                    <td>{item.rrRatio}</td>
                    <td>{item.maxDrawdown}%</td>
                    <td>{item.actualHoldingDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {historyData.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2>History Backtest dari Supabase</h2>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Entry Date</th>
                  <th>End Date</th>
                  <th>Buy Price</th>
                  <th>Target Price</th>
                  <th>Stop Loss</th>
                  <th>Current Price</th>
                  <th>Exit Price</th>
                  <th>Status</th>
                  <th>Return %</th>
                  <th>RR Ratio</th>
                  <th>Max Drawdown</th>
                  <th>Holding Days</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {historyData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.ticker}</td>
                    <td>{item.entry_date}</td>
                    <td>{item.end_date}</td>
                    <td>{item.buy_price}</td>
                    <td>{item.target_price}</td>
                    <td>{item.stop_loss}</td>
                    <td>{item.current_price}</td>
                    <td>{item.exit_price}</td>
                    <td
                      className={
                        item.status === 'Target Hit'
                          ? 'status-profit'
                          : item.status === 'Stop Loss Hit'
                          ? 'status-loss'
                          : 'status-floating'
                      }
                    >
                      {item.status}
                    </td>
                    <td className={item.return_percent >= 0 ? 'positive' : 'negative'}>
                      {item.return_percent}%
                    </td>
                    <td>{item.rr_ratio}</td>
                    <td>{item.max_drawdown}%</td>
                    <td>{item.holding_days}</td>
                    <td>{new Date(item.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default App