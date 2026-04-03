const YahooFinance = require('yahoo-finance2').default

const yahooFinance = new YahooFinance()

module.exports = async (req, res) => {
  try {
    const stocks = req.body.stocks

    const results = await Promise.all(
      stocks.map(async (item) => {
        try {
          const history = await yahooFinance.historical(item.ticker + '.JK', {
            period1: item.entryDate,
            period2: item.endDate,
            interval: '1d'
          })

          if (!history || history.length === 0) {
            return {
              ticker: item.ticker,
              error: 'Tidak ada data historical'
            }
          }

          const highestPrice = Math.max(...history.map(h => h.high))
          const lowestPrice = Math.min(...history.map(h => h.low))
          const lastClose = history[history.length - 1].close

          let status = 'Floating'
          let exitPrice = lastClose
          let exitDate = item.endDate

          for (const day of history) {
            if (day.low <= item.stopLoss) {
              status = 'Stop Loss Hit'
              exitPrice = item.stopLoss
              exitDate = day.date
              break
            }

            if (day.high >= item.targetPrice) {
              status = 'Target Hit'
              exitPrice = item.targetPrice
              exitDate = day.date
              break
            }
          }

          const returnPercent =
            ((exitPrice - item.buyPrice) / item.buyPrice) * 100

          const floatingPnL = lastClose - item.buyPrice
          const floatingPnLPercent =
            ((lastClose - item.buyPrice) / item.buyPrice) * 100

          const reward = item.targetPrice - item.buyPrice
          const risk = item.buyPrice - item.stopLoss
          const rrRatio = risk > 0 ? reward / risk : 0

          const maxDrawdown =
            ((item.buyPrice - lowestPrice) / item.buyPrice) * 100

          const plannedHoldingDays = Math.ceil(
            (new Date(item.endDate) - new Date(item.entryDate)) /
              (1000 * 60 * 60 * 24)
          )

          const actualHoldingDays = Math.ceil(
            (new Date(exitDate) - new Date(item.entryDate)) /
              (1000 * 60 * 60 * 24)
          )

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
          }
        } catch (error) {
          return {
            ticker: item.ticker,
            error: error.message
          }
        }
      })
    )

    const validResults = results.filter(item => !item.error)

    const totalReturn = validResults.reduce((sum, item) => {
      return sum + item.returnPercent
    }, 0)

    const averageReturn =
      validResults.length > 0
        ? totalReturn / validResults.length
        : 0

    const winningTrades = validResults.filter(
      item => item.returnPercent > 0
    ).length

    const losingTrades = validResults.filter(
      item => item.returnPercent <= 0
    ).length

    const averageHoldingDays =
      validResults.length > 0
        ? validResults.reduce((sum, item) => sum + item.actualHoldingDays, 0) /
          validResults.length
        : 0

    const winRate =
      validResults.length > 0
        ? (winningTrades / validResults.length) * 100
        : 0

    res.status(200).json({
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
    })
  } catch (error) {
    console.error('Error backtest:', error)

    res.status(500).json({
      error: error.message
    })
  }
}