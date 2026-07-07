import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function SubmitExpenseForm({ onSubmitted }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleFileChange(e) {
    setFile(e.target.files[0] || null);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError('Please choose a receipt file first.');
      return;
    }

    setSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('receipt', file);
    formData.append('employee_id', user.id);

    try {
      const res = await fetch(`${API_URL}/api/expenses/submit`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const inserted = await res.json();
      setFile(null);
      e.target.reset();
      if (onSubmitted) onSubmitted(inserted);
    } catch (err) {
      setError(err.message || 'Something went wrong while submitting the receipt.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="receipt-card p-6 max-w-md">
      <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg text-ink mb-1">
        Submit a claim
      </h2>
      <p className="text-sm text-ink/60 mb-4">
        Upload a receipt image or PDF. Amount, GST, merchant, and category are extracted automatically.
      </p>

      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        disabled={submitting}
        className="block w-full text-sm text-ink mb-4"
      />

      {error && <p className="text-sm text-rust mb-3">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !file}
        className="w-full bg-ledger text-paper py-2 disabled:opacity-50"
      >
        {submitting ? 'Processing receipt…' : 'Submit claim'}
      </button>

      {submitting && (
        <p className="text-xs text-ink/50 mt-2">
          Running OCR and AI classification — this can take a few seconds.
        </p>
      )}
    </form>
  );
}