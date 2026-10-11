export function normalizeMatchValue(value) {
  return String(value ?? '').trim().toUpperCase();
}

export function genderForMaterialNumber(materialNo) {
  const articleSegment = normalizeMatchValue(materialNo).split('-')[0];
  const codeMatch = articleSegment.match(/(?:\d)(GG|G|L|B|K)$/);
  const genderCodes = {
    G: 'Gents',
    GG: 'Giants',
    L: 'Ladies',
    B: 'Boys',
    K: 'Kids',
  };

  return codeMatch ? genderCodes[codeMatch[1]] : '';
}

export function sizeForRequirement(requirement) {
  const materialNumber = String(requirement.materialNo ?? '').trim().toUpperCase();
  if (normalizeMatchValue(requirement.reqType) === 'PAIR MTO') {
    const lastTwoDigits = materialNumber.match(/(\d{2})(?!.*\d)/);
    return lastTwoDigits ? lastTwoDigits[1] : '';
  }

  return materialNumber.split('-')[2] || '';
}

export function requirementMatchesArticle(requirement, articles) {
  const articleName = normalizeMatchValue(requirement.article);
  const colourName = normalizeMatchValue(requirement.colour ?? requirement.color);
  const genderName = normalizeMatchValue(genderForMaterialNumber(requirement.materialNo));

  return articles.some((article) =>
    normalizeMatchValue(article.article) === articleName &&
    normalizeMatchValue(article.colour ?? article.color) === colourName &&
    normalizeMatchValue(article.gender) === genderName
  );
}

export function requirementMismatchReason(requirement, articles) {
  const articleName = normalizeMatchValue(requirement.article);
  const colourName = normalizeMatchValue(requirement.colour ?? requirement.color);
  const genderName = normalizeMatchValue(genderForMaterialNumber(requirement.materialNo));

  if (!articleName) return 'Article is missing from the requirement.';

  const matchingArticles = articles.filter(
    (article) => normalizeMatchValue(article.article) === articleName
  );
  if (matchingArticles.length === 0) return 'Article is not listed in Article Entry.';

  const matchingColours = matchingArticles.filter(
    (article) => normalizeMatchValue(article.colour ?? article.color) === colourName
  );
  if (matchingColours.length === 0) return 'Colour does not match Article Entry for this article.';
  if (!genderName) return 'Gender could not be derived from the Material No. suffix.';

  return 'Gender does not match Article Entry for this article and colour.';
}
