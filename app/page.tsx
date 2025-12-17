"use client";

import { useState } from "react";
import { Upload, Download, FileSpreadsheet, Heart, Loader2, RefreshCw, Sparkles, ChevronDown, Check } from "lucide-react";

interface StockRow {
  [key: string]: string | number;
}

// Available data points from Yahoo Finance defaultKeyStatistics
const AVAILABLE_FIELDS = [
  { id: "floatShares", label: "Float", default: true },
  { id: "sharesOutstanding", label: "Shares Outstanding", default: true },
  { id: "impliedSharesOutstanding", label: "Implied Shares Outstanding", default: true },
  { id: "sharesShort", label: "Shares Short", default: false },
  { id: "sharesShortPriorMonth", label: "Shares Short (Prior Month)", default: false },
  { id: "shortRatio", label: "Short Ratio", default: false },
  { id: "shortPercentOfFloat", label: "Short % of Float", default: false },
  { id: "sharesPercentSharesOut", label: "Shares % of Shares Out", default: false },
  { id: "heldPercentInsiders", label: "Held % by Insiders", default: false },
  { id: "heldPercentInstitutions", label: "Held % by Institutions", default: false },
  { id: "bookValue", label: "Book Value", default: false },
  { id: "priceToBook", label: "Price to Book", default: false },
  { id: "earningsQuarterlyGrowth", label: "Earnings Quarterly Growth", default: false },
  { id: "trailingEps", label: "Trailing EPS", default: false },
  { id: "forwardEps", label: "Forward EPS", default: false },
  { id: "pegRatio", label: "PEG Ratio", default: false },
  { id: "enterpriseValue", label: "Enterprise Value", default: false },
  { id: "enterpriseToRevenue", label: "Enterprise to Revenue", default: false },
  { id: "enterpriseToEbitda", label: "Enterprise to EBITDA", default: false },
  { id: "52WeekChange", label: "52 Week Change", default: false },
  { id: "beta", label: "Beta", default: false },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StockRow[] | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>(
    AVAILABLE_FIELDS.filter(f => f.default).map(f => f.id)
  );
  const [showFieldSelector, setShowFieldSelector] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResults(null);
      setDownloadUrl(null);
    }
  };

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleProcess = async () => {
    if (!file || selectedFields.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fields", JSON.stringify(selectedFields));

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);

      const arrayBuffer = await blob.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data: StockRow[] = XLSX.utils.sheet_to_json(sheet);
      setResults(data);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl || !file) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `updated_${file.name}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const formatValue = (val: any): string => {
    if (val === null || val === undefined || val === "N/A") return "—";
    if (typeof val === "number") {
      if (val >= 1e9) return (val / 1e9).toFixed(2) + "B";
      if (val >= 1e6) return (val / 1e6).toFixed(2) + "M";
      if (val >= 1e3) return (val / 1e3).toFixed(2) + "K";
      return val.toLocaleString();
    }
    return String(val);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center p-4 md:p-8">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full border border-purple-500/30 mb-4">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">Yahoo Finance Data Fetcher</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-3">
            Stock Data Fetcher
          </h1>
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-pink-500 fill-pink-500 animate-pulse" />
            <span>for Dad</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">
          {/* Upload Section */}
          <div className="p-6 md:p-8">
            <p className="text-slate-400 text-center mb-6">
              Upload your Excel file and select the data points you want to fetch from Yahoo Finance.
            </p>

            {/* Upload Area */}
            <div className={`
              relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300
              ${file
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-slate-600 hover:border-purple-500/50 bg-slate-800/50 hover:bg-slate-800'
              }
            `}>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                id="file-upload"
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                {file ? (
                  <div className="bg-green-500/20 p-4 rounded-full ring-4 ring-green-500/10">
                    <FileSpreadsheet className="w-8 h-8 text-green-400" />
                  </div>
                ) : (
                  <div className="bg-purple-500/20 p-4 rounded-full ring-4 ring-purple-500/10">
                    <Upload className="w-8 h-8 text-purple-400" />
                  </div>
                )}

                <div>
                  <span className="text-lg font-medium text-white block">
                    {file ? file.name : "Click to select Excel file"}
                  </span>
                  {!file && <span className="text-sm text-slate-500">Supports .xlsx and .xls</span>}
                </div>
              </label>
            </div>

            {/* Field Selector */}
            <div className="mt-6">
              <button
                onClick={() => setShowFieldSelector(!showFieldSelector)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <span className="text-white font-medium block">Data Points</span>
                    <span className="text-slate-400 text-sm">{selectedFields.length} selected</span>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${showFieldSelector ? 'rotate-180' : ''}`} />
              </button>

              {showFieldSelector && (
                <div className="mt-2 p-4 bg-slate-800/80 border border-slate-700 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {AVAILABLE_FIELDS.map((field) => (
                    <button
                      key={field.id}
                      onClick={() => toggleField(field.id)}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200
                        ${selectedFields.includes(field.id)
                          ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                          : 'bg-slate-700/50 border border-transparent text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                        }
                      `}
                    >
                      <div className={`
                        w-5 h-5 rounded flex items-center justify-center transition-all
                        ${selectedFields.includes(field.id)
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-600'
                        }
                      `}>
                        {selectedFields.includes(field.id) && <Check className="w-3 h-3" />}
                      </div>
                      <span className="text-sm">{field.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleProcess}
                disabled={!file || isProcessing || selectedFields.length === 0}
                className={`
                  flex-1 py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 transition-all duration-200
                  ${!file || isProcessing || selectedFields.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:shadow-xl active:scale-[0.98] hover:from-purple-500 hover:to-blue-500'
                  }
                `}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Fetch Data
                  </>
                )}
              </button>

              {downloadUrl && (
                <button
                  onClick={handleDownload}
                  className="py-4 px-6 rounded-xl text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:shadow-xl active:scale-[0.98] hover:from-green-500 hover:to-emerald-500 transition-all duration-200 flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
              )}
            </div>
          </div>

          {/* Results Table */}
          {results && results.length > 0 && (
            <div className="border-t border-slate-700/50">
              <div className="p-4 bg-slate-800/50">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Fetched Data ({results.length} stocks)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/80">
                      {Object.keys(results[0]).map((key) => (
                        <th key={key} className="px-4 py-3 text-left text-slate-300 font-medium whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, i) => (
                      <tr
                        key={i}
                        className={`
                          border-t border-slate-700/30 transition-colors
                          ${i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}
                          hover:bg-purple-500/10
                        `}
                      >
                        {Object.entries(row).map(([key, val], j) => (
                          <td
                            key={j}
                            className={`
                              px-4 py-3 whitespace-nowrap
                              ${key.includes('Float') || key.includes('Shares') || key.includes('Short') || key.includes('Held')
                                ? 'text-cyan-400 font-mono'
                                : 'text-slate-300'
                              }
                              ${val === 'Error' ? 'text-red-400' : ''}
                            `}
                          >
                            {formatValue(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Data sourced from Yahoo Finance • Updates in real-time
        </p>
      </div>
    </main>
  );
}
