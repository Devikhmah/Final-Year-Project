import https from 'https';
import fs from 'fs';
import path from 'path';

function getApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY;

  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      const match = envContent.match(/(?:(?:GEMINI_API_KEY|VITE_GEMINI_API_KEY))=(.*)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

export async function handleGenerateInsight(reqData) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      success: false,
      error: 'GEMINI_API_KEY is not set in environment variables. Please add GEMINI_API_KEY=your_key to your .env.local file.',
    };
  }

  const { timeWindow = 'This Week', metrics = {}, employeeSummaries = [] } = reqData;

  const promptText = `You are an executive workforce productivity analyst for Small and Medium Enterprises (SMEs).
Analyze the following anonymized workforce metrics for ${timeWindow}:

- Period: ${timeWindow}
- Total Tasks Assigned: ${metrics.assignedCount || 0}
- Manager Approved Completed Tasks: ${metrics.approvedCount || 0}
- Finished On-Time: ${metrics.onTimeCount || 0}
- Finished Overdue: ${metrics.overdueCount || 0}
- Tasks Awaiting Review (Bottleneck): ${metrics.submittedBottleneckCount || 0}
- Total Logged Work Hours: ${metrics.totalHoursLogged || 0}

Anonymized Employee Capacity & Workload Summaries:
${JSON.stringify(employeeSummaries, null, 2)}

Provide a high-level ${timeWindow.toLowerCase()} executive summary with the following sections:
1. Overall Velocity & Delivery Performance (2-3 sentences evaluating throughput vs deadlines).
2. Workload & Bottleneck Analysis (highlighting any pending reviews or employee overload/idle signals).
3. 2 Concrete, Actionable Next Steps for Management for the upcoming period.`;

  const requestBody = JSON.stringify({
    contents: [
      {
        parts: [{ text: promptText }],
      },
    ],
  });

  const modelsToTry = ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const model of modelsToTry) {
    const result = await makeGeminiRequest(model, apiKey, requestBody);
    if (result.success) {
      return result;
    }
    if (!result.is404) {
      return result;
    }
  }

  return { success: false, error: 'None of the attempted Gemini models were available.' };
}

function makeGeminiRequest(model, apiKey, requestBody) {
  return new Promise((resolve) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                resolve({ success: true, insightText: text });
              } else {
                resolve({ success: false, error: 'GEMINI_API_RETURNED_EMPTY' });
              }
            } else {
              const apiErrMsg = parsed.error?.message || 'HTTP Status ' + res.statusCode;
              const is404 = res.statusCode === 404 || apiErrMsg.includes('not found') || apiErrMsg.includes('no longer available');
              resolve({ success: false, error: 'Gemini API Error: ' + apiErrMsg, is404 });
            }
          } catch (parseErr) {
            resolve({ success: false, error: 'Failed to parse Gemini models response: ' + parseErr.message });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({ success: false, error: 'Network error calling Gemini API: ' + err.message });
    });

    req.write(requestBody);
    req.end();
  });
}
