import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Insight {
  praise: string;
  improvement: string;
  warning: string;
}

const InsightCard: React.FC<{ insight: Insight }> = ({ insight }) => {
  const cards = [
    { title: 'Praise', content: insight.praise, icon: '👏', color: 'green' },
    { title: 'Focus', content: insight.improvement, icon: '🚀', color: 'blue' },
    { title: 'Warning', content: insight.warning, icon: '⚠️', color: 'orange' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, i) => (
        <div 
          key={i} 
          className={`
            p-6 sm:p-8 rounded-3xl shadow-sm border transition-all
            ${card.color === 'green' ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20' : ''}
            ${card.color === 'blue' ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20' : ''}
            ${card.color === 'orange' ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20' : ''}
          `}
        >
          <div className="flex items-center gap-4 mb-6">
            <span className="text-2xl">{card.icon}</span>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] 
              ${card.color === 'green' ? 'text-green-700 dark:text-green-400' : ''}
              ${card.color === 'blue' ? 'text-blue-700 dark:text-blue-400' : ''}
              ${card.color === 'orange' ? 'text-orange-700 dark:text-orange-400' : ''}
            `}>
              {card.title}
            </h3>
          </div>
          <div className={`prose prose-sm max-w-none dark:prose-invert leading-relaxed
            ${card.color === 'green' ? 'text-green-900 dark:text-green-100' : ''}
            ${card.color === 'blue' ? 'text-blue-900 dark:text-blue-100' : ''}
            ${card.color === 'orange' ? 'text-orange-900 dark:text-orange-100' : ''}
          `}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{card.content}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InsightCard;
