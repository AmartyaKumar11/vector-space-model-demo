import { motion } from "framer-motion";

export default function SimilarityPanel({ scores, docLabels }) {
  return (
    <motion.section
      id="similarity"
      className="panel-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <h2 className="panel-title">4. Cosine Similarity</h2>
      <p className="panel-subtitle">Similarity between query vector and each document vector.</p>

      <div className="mt-4 space-y-4">
        {scores.map((score, index) => {
          const pct = Math.max(0, Math.min(100, score * 100));

          return (
            <div key={docLabels[index]} className="space-y-2">
              <motion.p
                className="text-sm text-slate-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                Similarity between Query and {docLabels[index]}
              </motion.p>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className="h-full rounded-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: index * 0.1 + 0.15, duration: 0.45, ease: "easeInOut" }}
                />
              </div>

              <motion.p
                className="text-right font-mono text-xs text-slate-300"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.35, duration: 0.25 }}
              >
                {score.toFixed(4)}
              </motion.p>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
