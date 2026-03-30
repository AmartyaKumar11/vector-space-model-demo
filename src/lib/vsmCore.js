export function tokenize(text) {
  if (typeof text !== "string") {
    return [];
  }

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function buildVocabulary(documents, query) {
  const uniqueTerms = new Set();

  for (const doc of documents) {
    const tokens = tokenize(doc);
    for (const token of tokens) {
      uniqueTerms.add(token);
    }
  }

  for (const token of tokenize(query)) {
    uniqueTerms.add(token);
  }

  return Array.from(uniqueTerms);
}

function buildTFVector(vocabulary, tokens) {
  const tokenCounts = new Map();

  for (const token of tokens) {
    tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
  }

  return vocabulary.map((term) => tokenCounts.get(term) || 0);
}

export function computeTF(vocabulary, documents, query) {
  const docVectors = documents.map((doc) => buildTFVector(vocabulary, tokenize(doc)));
  const queryVector = buildTFVector(vocabulary, tokenize(query));

  return { docVectors, queryVector };
}

export function computeIDF(vocabulary, documents) {
  const N = documents.length;
  const tokenizedDocs = documents.map((doc) => new Set(tokenize(doc)));

  return vocabulary.map((term) => {
    let df = 0;

    for (const docTerms of tokenizedDocs) {
      if (docTerms.has(term)) {
        df += 1;
      }
    }

    return Math.log((N + 1) / (df + 1)) + 1;
  });
}

export function computeTFIDF(tfVectors, idf) {
  return tfVectors.map((vector) => vector.map((value, index) => value * idf[index]));
}

export function dotProduct(vecA, vecB) {
  const length = Math.min(vecA.length, vecB.length);
  let sum = 0;

  for (let i = 0; i < length; i += 1) {
    sum += vecA[i] * vecB[i];
  }

  return sum;
}

export function magnitude(vec) {
  return Math.sqrt(dotProduct(vec, vec));
}

export function cosineSimilarity(vecA, vecB) {
  const magA = magnitude(vecA);
  const magB = magnitude(vecB);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  const score = dotProduct(vecA, vecB) / (magA * magB);
  return Number.isFinite(score) ? score : 0;
}

export function computeSimilarities(docVectors, queryVector) {
  return docVectors.map((docVector) => cosineSimilarity(docVector, queryVector));
}

export function rankDocuments(documents, similarityScores) {
  return documents
    .map((document, index) => ({
      document,
      score: similarityScores[index] || 0,
      index,
    }))
    .sort((a, b) => b.score - a.score);
}

export function runVSM(documents, query, mode = "tf") {
  const safeDocuments = Array.isArray(documents) ? documents.filter(Boolean) : [];
  const safeQuery = typeof query === "string" ? query : "";
  const normalizedMode = mode === "tfidf" ? "tfidf" : "tf";

  const vocabulary = buildVocabulary(safeDocuments, safeQuery);
  const tf = computeTF(vocabulary, safeDocuments, safeQuery);

  const tfVectors = tf.docVectors;
  const tfQueryVector = tf.queryVector;
  let tfidfVectors = null;

  let similarityDocVectors = tfVectors;
  let queryVector = tfQueryVector;

  if (normalizedMode === "tfidf") {
    const idf = computeIDF(vocabulary, safeDocuments);
    const transformedDocVectors = computeTFIDF(tfVectors, idf);
    const transformedQueryVector = computeTFIDF([tfQueryVector], idf)[0];

    tfidfVectors = {
      docVectors: transformedDocVectors,
      queryVector: transformedQueryVector,
    };

    similarityDocVectors = transformedDocVectors;
    queryVector = transformedQueryVector;
  }

  const similarityScores = computeSimilarities(similarityDocVectors, queryVector);
  const rankings = rankDocuments(safeDocuments, similarityScores);

  return {
    vocabulary,
    tfVectors,
    tfidfVectors,
    queryVector,
    similarityScores,
    rankings,
  };
}
