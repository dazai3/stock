import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import YahooFinance from "yahoo-finance2";

// Lazy instantiation to avoid module-level issues
let yahooFinance: InstanceType<typeof YahooFinance> | null = null;

function getYahooFinance() {
    if (!yahooFinance) {
        yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
    }
    return yahooFinance;
}

// Field ID to display label mapping
const FIELD_LABELS: Record<string, string> = {
    floatShares: "Float",
    sharesOutstanding: "Shares Outstanding",
    impliedSharesOutstanding: "Implied Shares Outstanding",
    sharesShort: "Shares Short",
    sharesShortPriorMonth: "Shares Short (Prior Month)",
    shortRatio: "Short Ratio",
    shortPercentOfFloat: "Short % of Float",
    sharesPercentSharesOut: "Shares % of Shares Out",
    heldPercentInsiders: "Held % by Insiders",
    heldPercentInstitutions: "Held % by Institutions",
    bookValue: "Book Value",
    priceToBook: "Price to Book",
    earningsQuarterlyGrowth: "Earnings Quarterly Growth",
    trailingEps: "Trailing EPS",
    forwardEps: "Forward EPS",
    pegRatio: "PEG Ratio",
    enterpriseValue: "Enterprise Value",
    enterpriseToRevenue: "Enterprise to Revenue",
    enterpriseToEbitda: "Enterprise to EBITDA",
    "52WeekChange": "52 Week Change",
    beta: "Beta",
};

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Process a single ticker with retry logic
async function fetchTickerData(
    yf: InstanceType<typeof YahooFinance>,
    ticker: string,
    selectedFields: string[],
    retries = 2
): Promise<Record<string, any>> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const results: any = await yf.quoteSummary(ticker.trim(), {
                modules: ['defaultKeyStatistics', 'summaryDetail']
            });

            const stats = results.defaultKeyStatistics || {};
            const summary = results.summaryDetail || {};
            const combined = { ...stats, ...summary };

            const fetchedFields: Record<string, any> = {};
            selectedFields.forEach(field => {
                const label = FIELD_LABELS[field] || field;
                fetchedFields[label] = combined[field] ?? "N/A";
            });

            return fetchedFields;
        } catch (error: any) {
            if (attempt < retries) {
                await delay((attempt + 1) * 500);
                continue;
            }
            console.error(`Error fetching for ${ticker}:`, error.message);

            const errorFields: Record<string, string> = {};
            selectedFields.forEach(field => {
                errorFields[FIELD_LABELS[field] || field] = "Error";
            });
            return errorFields;
        }
    }
    return {};
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tickers, fields } = body;

        if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
            return NextResponse.json({ error: "No tickers provided" }, { status: 400 });
        }

        // Parse selected fields
        let selectedFields = fields || ["floatShares", "sharesOutstanding", "impliedSharesOutstanding"];

        console.log(`Processing ${tickers.length} tickers`);

        const yf = getYahooFinance();

        // Process tickers sequentially with small delays
        const results = [];
        for (let i = 0; i < tickers.length; i++) {
            const ticker = tickers[i];

            if (!ticker || typeof ticker !== 'string' || ticker.trim() === '') {
                const errorFields: Record<string, string> = {};
                selectedFields.forEach((field: string) => {
                    errorFields[FIELD_LABELS[field] || field] = "N/A";
                });
                results.push({ ticker, data: errorFields, error: "Invalid Ticker" });
            } else {
                const data = await fetchTickerData(yf, ticker, selectedFields);
                results.push({ ticker, data });
            }

            // Small delay between requests
            if (i < tickers.length - 1) {
                await delay(150);
            }
        }

        return NextResponse.json({ results });

    } catch (error) {
        console.error("Processing error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
