import axios from 'axios';

const sampleText = `Invoice #: 1304
Date 24/04/2024
DESCRIPTION QTY RATE AMOUNT
Paneer Butter Masala 1 180.00 180.00
Veg Biryani 1 150.00 150.00
Tandoori Roti 3 320.00 360.00
Gulab Jamun 2 100.00 100.00
CGST @ 2.5% 12.25
SGST @ 2.5% 12.25
TOTAL 3514.50`;

const run = async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/expenses/parse', {
      extracted_text: sampleText,
    });
    console.log('SUCCESS:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log('ERROR:');
    console.log(err.response?.data || err.message);
  }
};

run();