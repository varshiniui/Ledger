import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

const form = new FormData();
form.append('receipt', fs.createReadStream('./sample-receipt.png'));
form.append('employee_id', 'c59ce991-777c-4f73-9718-8629554fde9a');

const run = async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/expenses/submit', form, {
      headers: form.getHeaders(),
    });
    console.log('SUCCESS:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log('ERROR:');
    console.log(err.response?.data || err.message);
  }
};

run();