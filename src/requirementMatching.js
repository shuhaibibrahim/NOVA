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
