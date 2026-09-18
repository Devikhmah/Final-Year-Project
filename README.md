# Cadence — Empirical Workforce Productivity & Task Management System

> **Measure output, not activity.**  
> Cadence gives small and medium businesses empirical productivity insight — task completion velocity, revenue vs. admin time mix, and honest capacity signals — built entirely on voluntary, self-reported task time. **No screen recording, no keystrokes, no tracking.**

---

## 🌟 Key Features

### 👥 Dual User Experiences (Role-Based Access)
- **Manager Interface**:
  - **Overview & Task Delegation**: Create and assign tasks with priority levels, deadlines, and category tags.
  - **Review & Approval Queue**: Review completed tasks, review attached evidence, and approve or return tasks with feedback notes for rework.
  - **Team Scoping & Invitations**: Multi-manager team isolation where managers only access their direct team members and delegated tasks.
- **Employee Interface**:
  - **Task Workflows**: Focused view of assigned tasks with clear lifecycle transitions (`pending` &rarr; `in_progress` &rarr; `submitted`).
  - **Proof Attachments**: Upload document or image proof before submitting work for manager review.
  - **Voluntary Time Logging**: Self-report task minutes without background monitoring.
  - **Feedback Visibility**: Instantly view manager feedback notes when tasks require revision.

### 📊 Productivity Analytics & Velocity Metrics
- **Task Velocity Comparison**: Compare assigned vs. approved task throughput across **Weekly (7-day)** and **Monthly (30-day)** time windows.
- **Delivery Deadlines**: Accurate detection of on-time deliveries vs. overdue task completions against real deadlines.
- **Resource Utilization & Capacity**: Dynamic roster indicators highlighting balanced team members, underutilized capacity (<50%), and workload overload signals (>100%).
- **Category Mix Distribution**: Visual breakdown of logged work time across project categories.

### 🤖 Executive AI Insights
- Generates high-level executive summaries analyzing period velocity, review queue bottlenecks, and actionable next steps powered by Google Gemini AI.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 6, Tailwind CSS 4, Recharts, Lucide React
- **Backend / APIs**: Node.js, Vercel Serverless Functions (`/api/*`)
- **Database & Auth**: Supabase PostgreSQL with strict Row Level Security (RLS) policies and triggers
- **Storage**: Supabase Storage Buckets (`task-proofs`, `avatars`)
- **Testing**: Native Node.js Test Runner (`node --test`), 47 Automated Test Cases
- **Linter**: Oxlint

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v20+ (v24 recommended)
- [Supabase](https://supabase.com) project

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Devikhmah/Final-Year-Project.git
cd Final-Year-Project
npm install
```

### 3. Database & Storage Setup
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open the **SQL Editor**.
3. Copy the contents of [`supabase_setup.sql`](./supabase_setup.sql) and execute the script.
   - This sets up tables (`users`, `tasks`, `time_logs`, `task_attachments`, `invitations`), activates Row Level Security, configures storage buckets, and sets up permanent role immutability triggers.

### 4. Environment Configuration
Create a `.env.local` file in the project root based on `.env.example`:
```env
# Supabase Credentials (from Supabase Project Settings -> API)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key

# Manager Registration Passcode (Default: SME2026SECRET)
MANAGER_SIGNUP_CODE=SME2026SECRET

# Optional: Google Gemini API Key for AI Executive Insights
GEMINI_API_KEY=your-gemini-api-key
```

### 5. Running the Application
Start the local development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Code Quality

The project includes an automated test suite with **100% pass rate across 47 tests**:

```bash
# Run all 47 unit, integration, and E2E tests
npm test

# Run linter
npm run lint

# Compile production build
npm run build
```

### Specification Acceptance Tests (`tests/specifiedTestCases.test.js`)
| Test ID | Domain | Verified Behavior |
| :--- | :--- | :--- |
| **TC-01** | **Auth** | Manager registration with incorrect access code is rejected with zero account creation |
| **TC-02** | **Auth** | Direct API update to user role is strictly blocked by database triggers |
| **TC-03** | **Team Scoping** | Manager A cannot view Manager B's tasks or analytics data |
| **TC-04** | **Invitations** | Declining invitation sets status to `declined` without account creation |
| **TC-05** | **Task Workflow** | Employees cannot bypass review or set tasks directly to `done` |
| **TC-06** | **Task Workflow** | Self-approval by employee accounts is strictly denied |
| **TC-07** | **Analytics** | Zero approved tasks render a clean no-data state without divide-by-zero errors |
| **TC-08** | **Proof Workflow** | Rejection notes remain visible to employees during rework and resubmission |
| **TC-09** | **AI Insight** | Empty periods return clean diagnostic messages rather than broken API calls |
| **TC-10** | **Roster** | Roster status prioritizes submitted review queues (yellow indicator) |

---

## ☁️ Deployment (Vercel)

This repository is pre-configured for zero-configuration deployment to [Vercel](https://vercel.com):

1. Connect your repository (`Devikhmah/Final-Year-Project`) in the Vercel Dashboard.
2. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `MANAGER_SIGNUP_CODE`
   - `GEMINI_API_KEY` *(optional)*
3. Click **Deploy**. Vercel will automatically build the client-side SPA and deploy the `/api` serverless functions.

---

## 📄 License
This project is licensed under the MIT License.
