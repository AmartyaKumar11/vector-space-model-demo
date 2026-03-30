/**
 * Tokenize text into normalized word tokens.
 * - Lowercases text
 * - Removes punctuation
 * - Splits by whitespace
 */
function tokenize(text) {
  if (typeof text !== "string") {
    return [];
  }

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Build a unique vocabulary from all documents and the query.
 */
function buildVocabulary(documents, query) {
  const uniqueTerms = new Set();

  for (const doc of documents) {
    const tokens = tokenize(doc);
    for (const token of tokens) {
      uniqueTerms.add(token);
    }
  }

  const queryTokens = tokenize(query);
  for (const token of queryTokens) {
    uniqueTerms.add(token);
  }

  return Array.from(uniqueTerms);
}

/**
 * Convert one token array into a term-frequency vector aligned to vocabulary.
 */
function buildTFVector(vocabulary, tokens) {
  const tokenCounts = new Map();

  for (const token of tokens) {
    tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
  }

  return vocabulary.map((term) => tokenCounts.get(term) || 0);
}

/**
 * Compute term-frequency vectors for documents and query.
 */
function computeTF(vocabulary, documents, query) {
  const docVectors = documents.map((doc) => buildTFVector(vocabulary, tokenize(doc)));
  const queryVector = buildTFVector(vocabulary, tokenize(query));

  return { docVectors, queryVector };
}

/**
 * Compute inverse document frequency for each vocabulary term using:
 * idf = log((N + 1) / (df + 1)) + 1
 */
function computeIDF(vocabulary, documents) {
  const N = documents.length;

  const tokenizedDocs = documents.map((doc) => new Set(tokenize(doc)));

  return vocabulary.map((term) => {
    let df = 0;

    for (const docTerms of tokenizedDocs) {
      if (docTerms.has(term)) {
        df += 1;
      }
    }

    // Smoothed IDF avoids division by zero and keeps values finite.
    return Math.log((N + 1) / (df + 1)) + 1;
  });
}

/**
 * Multiply TF vectors by IDF values to produce TF-IDF vectors.
 */
function computeTFIDF(tfVectors, idf) {
  return tfVectors.map((vector) => vector.map((value, index) => value * idf[index]));
}

/**
 * Compute dot product between two vectors.
 */
function dotProduct(vecA, vecB) {
  const length = Math.min(vecA.length, vecB.length);
  let sum = 0;

  for (let i = 0; i < length; i += 1) {
    sum += vecA[i] * vecB[i];
  }

  return sum;
}

/**
 * Compute Euclidean magnitude of a vector.
 */
function magnitude(vec) {
  return Math.sqrt(dotProduct(vec, vec));
}

/**
 * Compute cosine similarity between two vectors.
 * Returns 0 safely when one or both vectors are zero vectors.
 */
function cosineSimilarity(vecA, vecB) {
  const magA = magnitude(vecA);
  const magB = magnitude(vecB);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dotProduct(vecA, vecB) / (magA * magB);
}

/**
 * Compute cosine similarity scores between each document vector and query vector.
 */
function computeSimilarities(docVectors, queryVector) {
  return docVectors.map((docVector) => cosineSimilarity(docVector, queryVector));
}

/**
 * Rank documents by similarity score in descending order.
 */
function rankDocuments(documents, similarityScores) {
  return documents
    .map((document, index) => ({
      document,
      score: similarityScores[index] || 0,
      index,
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Run the complete VSM pipeline.
 * mode:
 * - "tf"    : uses raw term-frequency vectors
 * - "tfidf" : uses TF-IDF weighted vectors
 */
function runVSM(documents, query, mode = "tf") {
  const safeDocuments = Array.isArray(documents) ? documents : [];
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

module.exports = {
  tokenize,
  buildVocabulary,
  computeTF,
  computeIDF,
  computeTFIDF,
  dotProduct,
  magnitude,
  cosineSimilarity,
  computeSimilarities,
  rankDocuments,
  runVSM,
};
