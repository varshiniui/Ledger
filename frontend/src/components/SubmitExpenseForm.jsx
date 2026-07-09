import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Upload, FileText, X } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SubmitExpenseForm({ onSubmitted }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [result, setResult] = useState(null);

  function handleFileChange(e) {
    setFile(e.target.files[0] || null);
    setError('');
    setResult(null);
  }

  function handleDragOver(e) {
    e.preventDefault();
    if (!submitting) setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    if (submitting) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError('');
      setResult(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError('Please choose a receipt file first.');
      return;
    }

    setSubmitting(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('receipt', file);
    formData.append('employee_id', user.id);

    try {
      const res = await fetch(`${API_URL}/api/expenses/submit`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.details ? `${data.error}: ${data.details}` : (data.error || `Request failed (${res.status})`));
      }

      if (data.error) {
        // Backend returned 200 but couldn't fully process the receipt
        setError(data.error);
        return;
      }

      setResult(data.expense);
      setFile(null);
      e.target.reset();
      if (onSubmitted) onSubmitted(data);
    } catch (err) {
      setError(err.message || 'Something went wrong while submitting the receipt.');
    } finally {
      setSubmitting(false);
    }
  }

  const fraudScore = result?.fraud_score ?? 0;
  const fraudLevel = fraudScore >= 0.75 ? 'high' : fraudScore >= 0.3 ? 'medium' : 'low';
  const fraudColor =
    fraudLevel === 'high' ? 'var(--color-rust)' : fraudLevel === 'medium' ? 'var(--color-amber)' : 'var(--color-ledger)';

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="receipt-card p-6 max-w-md claim-row row-ledger">
        <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg text-ink mb-1 font-semibold">
          Submit a claim
        </h2>
        <p className="text-sm text-ink/60 mb-5 leading-relaxed">
          Upload a receipt image or PDF. AI reads it, categorizes it, and checks it for fraud automatically.
        </p>

        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !submitting && document.getElementById('receipt-upload').click()}
            className={`drop-zone mb-5 flex flex-col items-center justify-center ${isDragOver ? 'drag-over' : ''}`}
          >
            <Upload className="text-ink/40 mb-2 transition-transform group-hover:scale-110" size={24} />
            <p className="text-sm font-medium text-ink/80">Drag & drop receipt here</p>
            <p className="text-xs text-ink/50 mt-1">or click to browse (Image or PDF)</p>
            <input
              id="receipt-upload"
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              disabled={submitting}
              className="hidden"
            />
          </div>
        ) : (
          <div className="drop-zone has-file mb-5 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-slate/10 rounded flex-shrink-0">
                <FileText className="text-ledger" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{file.name}</p>
                <p className="text-[10px] text-ink/40 font-mono mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="p-1.5 text-ink/40 hover:text-rust rounded-full hover:bg-slate/10 transition-colors flex-shrink-0"
              disabled={submitting}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="fraud-warning mb-4 py-2 px-3">
            <p className="text-xs text-rust font-medium leading-relaxed">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !file}
          className="btn-primary btn-press w-full py-2.5 disabled:opacity-50"
        >
          {submitting ? 'Processing receipt…' : 'Submit claim'}
        </button>

        {submitting && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-ink/50 ai-step">Reading receipt with OCR…</p>
            <p className="text-xs text-ink/50 ai-step" style={{ animationDelay: '0.9s' }}>
              Classifying expense category…
            </p>
            <p className="text-xs text-ink/50 ai-step" style={{ animationDelay: '1.8s' }}>
              Checking for fraud and duplicates…
            </p>
          </div>
        )}
      </form>

      {result && (
        <div className="receipt-card p-6 max-w-md enter-fade">
          <p className="font-mono text-xs uppercase tracking-widest text-clay mb-3">
            AI analysis complete
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-ink/50 uppercase tracking-wide">Merchant</p>
              <p className="text-ink">{result.merchant_name || 'Not detected'}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50 uppercase tracking-wide">Amount</p>
              <p className="font-mono text-ink">{formatCurrency(result.amount)}</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-ink/50 uppercase tracking-wide">AI category</p>
              <p className="text-xs font-mono text-ink/50">
                {Math.round((result.ai_category_confidence || 0) * 100)}% confidence
              </p>
            </div>
            <p className="stamp text-ink">{result.category || 'Uncategorized'}</p>
          </div>

          <div>
            <p className="text-xs text-ink/50 uppercase tracking-wide mb-1">Fraud check</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="fraud-bar-track">
                <div
                  className="fraud-bar-fill"
                  style={{ width: `${fraudScore * 100}%`, background: fraudColor }}
                ></div>
              </div>
              <span className="font-mono text-xs" style={{ color: fraudColor }}>
                {Math.round(fraudScore * 100)}%
              </span>
            </div>
            <p className="text-xs text-ink/60">{result.fraud_reason || 'No concerns detected.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}