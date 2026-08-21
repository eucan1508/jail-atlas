export interface EvidenceStampProps {
  label: string;
  value: string;
}

export function EvidenceStamp({ label, value }: EvidenceStampProps) {
  return (
    <div className="ui-evidence-stamp">
      <span className="ui-evidence-stamp__label">{label}</span>
      <strong className="ui-evidence-stamp__value">{value}</strong>
    </div>
  );
}
