import { motion } from "framer-motion";

function formatVector(values) {
  return values.map((value) => (Number.isInteger(value) ? value : Number(value).toFixed(3))).join(", ");
}

export default function VectorDisplay({ docVectors, queryVector, docLabels }) {
  const items = [
    ...docVectors.map((vector, index) => ({ label: docLabels[index], values: vector, accent: "text-slate-100" })),
    { label: "Query", values: queryVector, accent: "text-blue-300" },
  ];

  return (
    <motion.section
      id="vectors"
      className="panel-card"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <h2 className="panel-title">3. Vector View</h2>
      <p className="panel-subtitle">Dense vector representation used by cosine similarity.</p>

      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            className="rounded-xl bg-slate-800/70 p-3 ring-1 ring-slate-700"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.35, ease: "easeInOut" }}
          >
            <p className={`text-sm font-semibold ${item.accent}`}>{item.label}</p>
            <p className="mt-1 font-mono text-xs text-slate-300">[{formatVector(item.values)}]</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
