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

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const fieldsJson = formData.get("fields") as string;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Parse selected fields (default to the original 3 if not provided)
        let selectedFields = ["floatShares", "sharesOutstanding", "impliedSharesOutstanding"];
        try {
            if (fieldsJson) {
                selectedFields = JSON.parse(fieldsJson);
            }
        } catch (e) {
            console.warn("Could not parse fields, using defaults");
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = xlsx.read(buffer, { type: "buffer" });

        if (workbook.SheetNames.length === 0) {
            return NextResponse.json({ error: "Excel file is empty" }, { status: 400 });
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        let data: any[] = xlsx.utils.sheet_to_json(sheet);

        if (data.length === 0) {
            return NextResponse.json({ error: "Sheet contains no data" }, { status: 400 });
        }

        const keys = Object.keys(data[0]);
        let tickerKey = keys.find(k => /symbol|ticker|stock|code/i.test(k));

        if (!tickerKey) {
            tickerKey = keys[0];
        }

        console.log(`Using column '${tickerKey}' as ticker source.`);
        console.log(`Fetching fields: ${selectedFields.join(", ")}`);

        const yf = getYahooFinance();

        const updatedData = await Promise.all(
            data.map(async (row) => {
                const ticker = row[tickerKey!];
                if (!ticker || typeof ticker !== 'string') {
                    const errorFields: Record<string, string> = {};
                    selectedFields.forEach(field => {
                        errorFields[FIELD_LABELS[field] || field] = "N/A";
                    });
                    return {
                        ...row,
                        ...errorFields,
                        "Error": "Invalid Ticker"
                    };
                }

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

                    return {
                        ...row,
                        ...fetchedFields
                    };
                } catch (error) {
                    console.error(`Error fetching for ${ticker}:`, error);
                    const errorFields: Record<string, string> = {};
                    selectedFields.forEach(field => {
                        errorFields[FIELD_LABELS[field] || field] = "Error";
                    });
                    return {
                        ...row,
                        ...errorFields
                    };
                }
            })
        );

        const newSheet = xlsx.utils.json_to_sheet(updatedData);
        const newWorkbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(newWorkbook, newSheet, sheetName);

        const outBuffer = xlsx.write(newWorkbook, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(outBuffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="updated_${file.name}"`,
            },
        });

    } catch (error) {
        console.error("Processing error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
