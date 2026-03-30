import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeInOut", staggerChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
};

export default function VocabularyPanel({ vocabulary }) {
  return (
    <motion.section id="vocabulary" className="panel-card" variants={container} initial="hidden" animate="visible">
      <h2 className="panel-title">1. Vocabulary</h2>
      <p className="panel-subtitle">Unique terms extracted from documents and query.</p>

      <motion.div className="mt-4 flex flex-wrap gap-2" variants={container}>
        {vocabulary.map((term) => (
          <motion.span key={term} variants={item} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-100 ring-1 ring-slate-700">
            {term}
          </motion.span>
        ))}
      </motion.div>
    </motion.section>
  );
}
