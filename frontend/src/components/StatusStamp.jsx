import { STATUS_LABELS, STATUS_STAMP_CLASS } from '../lib/formatters';

export default function StatusStamp({ status }) {
  return (
    <span className={`stamp ${STATUS_STAMP_CLASS[status] || 'stamp-amber'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}