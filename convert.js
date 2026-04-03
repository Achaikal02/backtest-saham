const fs = require('fs');
const csv = require('csv-parser');

const results = [];

fs.createReadStream('all.csv')
  .pipe(csv())
  .on('data', (data) => {
    results.push({
      symbol: data.code + '.JK',
      code: data.code,
      name: data.name,
      listingDate: data.listingDate,
      listingBoard: data.listingBoard,
      shares: data.shares
    });
  })
  .on('end', () => {
    fs.writeFileSync('stocks.json', JSON.stringify(results, null, 2));
    console.log('stocks.json berhasil dibuat');
  });