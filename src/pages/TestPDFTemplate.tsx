import { useEffect, useState } from 'react';

/**
 * Test page for viewing the PDF template with all assets loaded.
 * Access at: /test-pdf
 *
 * This component loads the HTML template from public/test-report.html
 * and displays it in an iframe for visual verification.
 */
const TestPDFTemplate = () => {
  const [templateHtml, setTemplateHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const response = await fetch('/test-report.html');
        if (!response.ok) {
          throw new Error(`Failed to load template: ${response.status}`);
        }
        const html = await response.text();
        setTemplateHtml(html);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load template');
        setLoading(false);
      }
    };

    loadTemplate();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF template...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-700 font-semibold mb-2">Error Loading Template</h2>
          <p className="text-red-600">{error}</p>
          <p className="text-sm text-gray-500 mt-4">
            Make sure the template exists at <code className="bg-gray-100 px-1 rounded">/public/test-report.html</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200">
      {/* Header with controls */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">PDF Template Preview</h1>
          <p className="text-sm text-gray-500">MRC Inspection Report Template</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/test-report.html"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Open in New Tab
          </a>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Print / Export PDF
          </button>
        </div>
      </div>

      {/* Template Preview in iframe */}
      <div className="p-4 flex justify-center">
        <iframe
          srcDoc={templateHtml}
          title="PDF Template Preview"
          className="w-[850px] h-[calc(100vh-100px)] bg-white shadow-xl rounded-lg border"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
};

export default TestPDFTemplate;
