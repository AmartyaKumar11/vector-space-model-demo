import { motion } from "framer-motion";

export default function RankingPanel({ rankings }) {
  return (
    <motion.section
      id="ranking"
      className="panel-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <h2 className="panel-title">5. Ranking</h2>
      <p className="panel-subtitle">Documents sorted by descending similarity score.</p>

      <div className="mt-4 space-y-3">
        {rankings.map((item, index) => {
          const isTop = index === 0;

          return (
            <motion.div
              key={`${item.index}-${item.document}`}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, scale: isTop ? 1.01 : 1 }}
              transition={{ duration: 0.35, delay: index * 0.08, ease: "easeInOut" }}
              className={`rounded-xl p-3 ring-1 ${
                isTop ? "bg-blue-500/15 ring-blue-400/50" : "bg-slate-800/70 ring-slate-700"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Doc {item.index + 1}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-300">{item.document}</p>
                </div>
                <p className="font-mono text-sm text-blue-300">{item.score.toFixed(4)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
