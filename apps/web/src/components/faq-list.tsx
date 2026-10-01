export type FaqItem = Readonly<{
  question: string;
  answer: string;
}>;

export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="faq-list">
      {items.map((item) => (
        <details className="faq-item" key={item.question}>
          <summary>{item.question}</summary>
          <div className="faq-item__answer">
            <p>{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
