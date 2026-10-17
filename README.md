# 🔥 FIRElytics — Fire Analytics & Monitoring Platform

**FIRElytics** is a web-based fire analytics platform designed to organize, analyze, and visualize fire-related information. It aims to make fire incident data easier to understand and support data-driven analysis of fire patterns and potential risks.

## 📌 Overview

Fire-related incidents can involve complex information that is difficult to interpret without effective data organization and visualization. FIRElytics provides a web application foundation for presenting relevant information through an interactive interface and analytical visualizations.

The project combines modern web technologies with database integration and charting tools to build a foundation for fire data analysis and monitoring.

## ✨ Key Capabilities

- **Fire Data Management:** A foundation for organizing and accessing fire-related information.
- **Data Visualization:** Charting and visual presentation of analytical information.
- **Analytics Interface:** A web-based interface for exploring relevant data.
- **Database Integration:** Supabase integration for backend data services.
- **Interactive UI:** A responsive application experience built with React and Next.js.

*Note: The capabilities available in the running application depend on the implemented modules and configured backend services.*

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Web application framework |
| React | Component-based user interface |
| TypeScript | Type-safe development |
| Supabase | Backend and database integration |
| Chart.js | Data visualization |
| Recharts | Charting and analytical displays |
| Tailwind CSS | Styling and UI development |
| Framer Motion | UI animations |
| React Hook Form | Form state management |
| Zod | Schema validation |
| Lucide React | Interface icons |

## 🏗️ Project Structure

```text
FIRElytics/
├── app/                  # Application routes and pages
├── lib/                  # Shared utilities and services
├── public/               # Static assets
├── scripts/              # Project scripts
├── supabase/
│   └── migrations/       # Database migration files
├── types/                # TypeScript type definitions
├── package.json          # Dependencies and scripts
├── package-lock.json     # Dependency lockfile
├── next.config.ts        # Next.js configuration
├── tsconfig.json         # TypeScript configuration
├── eslint.config.mjs     # Linting configuration
└── README.md             # Project documentation
```

## 🚀 Getting Started

### Prerequisites

Ensure the following tools are installed:

- [Node.js](https://nodejs.org/) — compatible with the installed Next.js version
- npm — included with Node.js
- Git
- A Supabase project, if required by the application's configured backend

### 1. Clone the Repository

```bash
git clone https://github.com/SwayamprakashPatro/FIRElytics.git
```

### 2. Navigate to the Project

```bash
cd FIRElytics
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

If the application uses Supabase credentials through environment variables, create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

Replace the example values with the credentials required by your application's Supabase client. Verify the exact variable names in the source code before running the application.

**Security:** Never commit `.env.local`, database passwords, service-role keys, or other secrets to GitHub.

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build for Production

```bash
npm run build
npm run start
```

Run the production server after the build completes successfully.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the development server |
| `npm run build` | Creates a production build |
| `npm run start` | Starts the production server |
| `npm run lint` | Runs ESLint |

## 🗄️ Database Configuration

FIRElytics includes a `supabase/migrations/` directory for database migration files.

To configure the backend:

1. Create or select the appropriate Supabase project.
2. Review the migration files to understand the required database schema.
3. Apply the migrations using the appropriate Supabase workflow.
4. Configure the environment variables referenced by the application.
5. Verify database permissions and Row Level Security policies before using real data.

The required tables, policies, and seed data should be determined from the repository's migration files and application code.

## 🎯 Project Objectives

- Build a web-based platform for fire-related data analysis.
- Present information through clear and accessible visualizations.
- Explore the integration of frontend applications with backend database services.
- Support structured analysis of fire-related information.
- Establish a foundation for future monitoring and analytical capabilities.

## 🔮 Future Scope

Potential enhancements include:

- **Geospatial Analytics:** Map fire incidents and explore their geographic distribution.
- **Predictive Modeling:** Investigate machine learning models for fire-risk estimation.
- **Real-Time Monitoring:** Integrate reliable external data feeds where available.
- **Alerting System:** Generate notifications based on defined thresholds or validated risk indicators.
- **Advanced Dashboards:** Add temporal trends, geographic comparisons, and interactive filters.
- **Weather Integration:** Explore relationships between environmental conditions and fire incidents.
- **Reporting:** Export analytical summaries and visualizations for further investigation.

These are potential extensions, not claims that the features are currently implemented.

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement and test your changes.
4. Submit a pull request describing the changes.

## 👨‍💻 Author

**Swayamprakash Patro**

- GitHub: [@SwayamprakashPatro](https://github.com/SwayamprakashPatro)
- Repository: [FIRElytics](https://github.com/SwayamprakashPatro/FIRElytics)

## 📄 License

No license has been specified here. Add a `LICENSE` file and update this section if you intend to distribute the project under a particular open-source license.
