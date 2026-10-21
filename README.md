# Creative Deadline Dashboard

A creative workflow and deadline management dashboard built to help teams organize tasks, monitor project progress, manage deadlines, and evaluate creative performance in one place.

## Overview

Creative Deadline is a web-based dashboard designed to simplify creative team operations. It provides a centralized workspace for managing tasks, tracking workflow statuses, monitoring deadlines, and reviewing team performance.

Built with React, Vite, and Firebase, the application combines a responsive interface with real-time task data.

## Features

- **Dashboard Overview** — Monitor task statistics and overall workflow progress.
- **Task Management** — Create, view, edit, and manage creative tasks.
- **Task Status Tracking** — Follow tasks through different workflow stages, from Not Started to Done.
- **Calendar View** — Review task schedules and deadlines in a calendar interface.
- **Task Board** — Visualize tasks based on their current workflow status.
- **My Tasks** — Access tasks assigned to individual team members.
- **Brief Management** — View and manage creative briefs.
- **Team Management** — Organize team members and access relevant team information.
- **Deadline Monitoring** — Identify upcoming deadlines and overdue tasks.
- **Excel Export** — Export task records to Excel for reporting and archiving.
- **Firebase Integration** — Store and synchronize task data using Cloud Firestore.
- **Responsive UI** — A dark-themed interface designed for a clean and focused workflow.

> Feature availability may depend on the user's role and the application's current configuration.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| Vite | Development server and build tool |
| Firebase Authentication | User authentication |
| Cloud Firestore | Task data storage and synchronization |
| CSS | Layout, styling, and responsive design |
| Lucide React | Icons |
| SheetJS (`xlsx`) | Excel export |

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- npm
- A Firebase project configured for the application

### 1. Clone the repository

```bash
git clone https://github.com/aagoyyy/creative-deadline.git
cd creative-deadline
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

Create or configure a Firebase project and enable the services required by the application.

Add your Firebase web configuration to the project's existing Firebase configuration file. Use the configuration structure expected by the current source code.

**Security notes:**
- Never commit service account credentials or private keys.
- Keep local secrets out of version control.
- Configure Firebase Authentication and Cloud Firestore Security Rules before deploying.
- Enforce role-based permissions in Firebase Security Rules, not only in the user interface.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually:

`http://localhost:5173`

### 5. Build for production

```bash
npm run build
```

The production files will be generated in the `dist/` directory.

To preview the production build locally:

```bash
npm run preview
```

## Project Structure

```text
creative-deadline/
├── public/
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Login.jsx
│   │   ├── Sidebar.jsx
│   │   ├── StatCard.jsx
│   │   ├── TaskCard.jsx
│   │   └── TaskModal.jsx
│   ├── hooks/
│   │   └── useTasks.js
│   ├── pages/
│   │   ├── Board.jsx
│   │   ├── Calendar.jsx
│   │   ├── Dashboard.jsx
│   │   ├── MyBrief.jsx
│   │   ├── MyTasks.jsx
│   │   ├── Tasks.jsx
│   │   └── Team.jsx
│   ├── utils/
│   │   └── taskArchive.js
│   ├── App.jsx
│   ├── App.css
│   └── index.css
├── index.html
├── package.json
└── vite.config.js
```

*The structure above highlights the main application files. Additional configuration and component files may be present.*

## Workflow

The dashboard helps the team follow tasks through a structured workflow:

`Not Started → Start → Approval → Revision / Upload → Done`

The exact stages depend on the workflow configured in the application.

## Data & Archiving

Task records are stored in Cloud Firestore. The application also includes an Excel export utility to support reporting and offline archiving.

Long-term retention and automatic deletion should be handled through a verified archival process. Always confirm that an archive contains the expected task records before deleting source data.

## Development Status

The application is under active development. Features, workflows, and interface components may evolve as the project progresses.

## License

No license has been specified yet. All rights are reserved by the repository owner unless a license is added to this repository.

---

**Built for a more organized creative workflow.**