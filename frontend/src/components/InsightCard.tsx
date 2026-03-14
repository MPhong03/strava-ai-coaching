import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Insight {
  praise: string;
  improvement: string;
  warning: string;
}

const InsightCard: React.FC<{ insight: Insight }> = ({ insight }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-green-50 border border-green-200 p-6 rounded-xl shadow-sm">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-green-100 rounded-lg mr-3">
            <span className="text-xl">👏</span>
          </div>
          <h3 className="text-lg font-bold text-green-800">Praise</h3>
        </div>
        <div className="prose prose-sm text-green-700 max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{insight.praise}</ReactMarkdown>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl shadow-sm">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-blue-100 rounded-lg mr-3">
            <span className="text-xl">🚀</span>
          </div>
          <h3 className="text-lg font-bold text-blue-800">Improvement</h3>
        </div>
        <div className="prose prose-sm text-blue-700 max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{insight.improvement}</ReactMarkdown>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl shadow-sm">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-yellow-100 rounded-lg mr-3">
            <span className="text-xl">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-yellow-800">Warning</h3>
        </div>
        <div className="prose prose-sm text-yellow-700 max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{insight.warning}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default InsightCard;
