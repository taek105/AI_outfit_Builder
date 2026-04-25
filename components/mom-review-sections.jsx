const SECTION_LABELS = {
  momSummary: "엄마의 총평",
  momDetails: "엄마의 상세 평가",
  momNagging: "엄마의 잔소리",
  score: "점수"
};

function extractSection(text, startPattern, endPattern) {
  const start = text.search(startPattern);

  if (start < 0) {
    return "";
  }

  const sliced = text.slice(start);
  const contentStart = sliced.indexOf(":");
  const body = contentStart >= 0 ? sliced.slice(contentStart + 1) : sliced;
  const end = endPattern ? body.search(endPattern) : -1;

  return (end >= 0 ? body.slice(0, end) : body)
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function parseMomReview(review) {
  const normalized = review.replace(/\r\n/g, "\n");

  return {
    momSummary: extractSection(normalized, /1\.\s*(?:엄마의\s*총평|전체\s*총평)\s*:/, /\n\s*2\.\s*(?:엄마의\s*상세\s*평가|상세\s*평가)\s*:/),
    momDetails: extractSection(normalized, /2\.\s*(?:엄마의\s*상세\s*평가|상세\s*평가)\s*:/, /\n\s*3\.\s*(?:엄마의\s*잔소리|잔소리)\s*:/),
    momNagging: extractSection(normalized, /3\.\s*(?:엄마의\s*잔소리|잔소리)\s*:/, /\n\s*4\.\s*점수\s*:/),
    score: extractSection(normalized, /4\.\s*점수\s*:/)
  };
}

export function MomReviewSections({ review, compact = false }) {
  const sections = parseMomReview(review);
  const entries = Object.entries(sections).filter(([, value]) => value);

  if (entries.length === 0) {
    return <pre className="review-box">{review}</pre>;
  }

  return (
    <div className={`mom-review-sections ${compact ? "compact" : ""}`}>
      {entries.map(([key, value]) => (
        <section key={key} className={`mom-review-card ${key}`}>
          <h3>{SECTION_LABELS[key]}</h3>
          <pre>{value}</pre>
        </section>
      ))}
    </div>
  );
}
