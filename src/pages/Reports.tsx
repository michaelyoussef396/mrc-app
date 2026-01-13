import { FileBarChart } from "lucide-react";

const Reports = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-blue-50 rounded-full p-6 mb-6">
        <FileBarChart className="w-16 h-16 text-blue-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports</h1>
      <p className="text-gray-500 text-center max-w-md">
        Coming Soon
      </p>
      <p className="text-gray-400 text-sm text-center mt-2">
        Detailed reports and analytics will be available after Stage 1 is complete.
      </p>
    </div>
  );
};

export default Reports;
