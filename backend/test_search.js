const mongoose = require('mongoose');
const Product = require('./models/Product');

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/campus-marketplace');
  
  console.log('--- Search: Cycle ---');
  const search1 = await Product.find({ status: 'active', $text: { $search: 'Cycle' } });
  console.log(search1.map(p => p.title));

  console.log('--- Search: Notebook ---');
  const search2 = await Product.find({ status: 'active', $text: { $search: 'Notebook' } });
  console.log(search2.map(p => p.title));

  console.log('--- Category: Stationery ---');
  const cat1 = await Product.find({ status: 'active', category: 'Stationery' });
  console.log(cat1.map(p => p.title));

  console.log('--- Category: Vehicles & Bicycles ---');
  const cat2 = await Product.find({ status: 'active', category: 'Vehicles & Bicycles' });
  console.log(cat2.map(p => p.title));

  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
