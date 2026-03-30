import { motion } from "framer-motion";

function formatValue(value) {
  return Number.isInteger(value) ? value : Number(value).toFixed(3);
}

export default function MatrixTable({ vocabulary, docVectors, queryVector, docLabels, mode }) {
  return (
    <motion.section
      id="matrix"
      className="panel-card overflow-x-auto"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <h2 className="panel-title">2. Term Matrix ({mode.toUpperCase()})</h2>
      <p className="panel-subtitle">Rows represent terms and columns represent vectors.</p>

      <table className="mt-4 w-full border-separate border-spacing-y-1 text-left text-sm">
        <thead>
          <tr className="text-slate-300">
            <th className="px-3 py-2">Term</th>
            {docLabels.map((label) => (
              <th key={label} className="px-3 py-2">
                {label}
              </th>
            ))}
            <th className="px-3 py-2">Query</th>
          </tr>
        </thead>
        <tbody>
          {vocabulary.map((term, termIndex) => (
            <motion.tr
              layout
              key={term}
              className="rounded-lg bg-slate-800/60 text-slate-100 transition hover:bg-slate-700/70"
            >
              <td className="rounded-l-lg px-3 py-2 font-medium text-slate-200">{term}</td>
              {docVectors.map((vector, docIndex) => (
                <motion.td key={`${term}-${docIndex}`} layout className="px-3 py-2 tabular-nums text-slate-100">
                  {formatValue(vector[termIndex] ?? 0)}
                </motion.td>
              ))}
              <motion.td layout className="rounded-r-lg px-3 py-2 tabular-nums text-blue-300">
                {formatValue(queryVector[termIndex] ?? 0)}
              </motion.td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.section>
  );
}
