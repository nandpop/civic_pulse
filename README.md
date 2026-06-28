# Civic Pulse

Civic Pulse is a hyperlocal civic issue reporting platform designed for citizens to report, track, and verify local issues like potholes, faulty streetlights, waste overflow, and water pipeline leaks. It features AI-powered image/video analysis for automated issue categorization and a smart point-and-badge-based community validation system.

## 📁 Repository Structure

The project is structured as a monorepo containing a React frontend (client) and a Node.js Express backend (server):

```text
Civic Pulse/
├── client/                 # React + Vite frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── CitizenApp.jsx             # Main Citizen App view, swiper, and wizard controller
│   │   │   ├── Dashboard.jsx              # Admin / Municipal review dashboard
│   │   │   └── GoogleMapsContainer.jsx    # GIS Map container (Google Maps + Leaflet fallback)
│   │   ├── App.jsx                        # Entry App component
│   │   └── main.jsx                       # React DOM initialization
│   └── test_detail.js      # Integration test runner using JSDOM
├── server/                 # Express API backend service
│   ├── index.js            # Express server configuration and API endpoints
│   ├── db.js               # Google Cloud Firestore connection and seeding script
│   └── migrate_images.js   # Image migration script to upload local images to GCS
├── package.json            # Monorepo setup scripts
└── .env.template           # Template for environment variables configuration
```

---

## 🛠️ Technology Stack

### Frontend (Client)
*   **React 19** & **Vite**
*   **Vanilla CSS** (custom modular styles)
*   **Phosphor Icons** (`@phosphor-icons/react`)
*   **Maps Integration**: Google Maps API via `@react-google-maps/api` with **Leaflet / OpenStreetMap** as an automatic fallback if the Google Maps key is missing or invalid.

### Backend (Server)
*   **Node.js** & **Express**
*   **Google Cloud Firestore** (NoSQL Database)
*   **Google Cloud Storage (GCS)** (Image/video uploads storage)
*   **Google Gen AI (Gemini 2.5 Flash)** (Vision/Video analysis engine via `@google/genai`)
*   **Multer** (in-memory file upload handling)

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 2. Environment Setup
Create configurations for both the client and server.

#### Root Configuration
Copy the template at the root to create your environments:
```bash
cp .env.template .env
```

#### Client Configuration (`client/.env`)
Ensure `VITE_GOOGLE_MAPS_API_KEY` is configured (or leave it blank to automatically fallback to OpenStreetMap/Leaflet):
```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

#### Server Configuration (`server/.env`)
Provide the Gemini API Key to enable vision and video scanning:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Installation
To install dependencies for the root monorepo, client, and server in one go:
```bash
npm run install-all
```

### 4. Running the App Locally
Start the frontend and backend servers concurrently:
```bash
npm run dev
```
*   **Frontend client** runs on `http://localhost:5173`
*   **Backend server** runs on `http://localhost:5000`

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/users/me` | Fetches details of the currently logged-in user |
| `GET` | `/api/users/leaderboard` | Fetches neighbor leaderboard sorted by points descending |
| `GET` | `/api/issues` | Fetches issues list (supports category/status filter query parameters) |
| `GET` | `/api/issues/:id` | Fetches timeline details and metadata of an individual issue |
| `POST` | `/api/issues` | Files a new issue (supports file attachment, uploads to GCS, checks duplicates, seeds points) |
| `POST` | `/api/issues/:id/confirm` | Confirm/Upvote an issue. (Auto-verifies if confirms reach $\ge 4$) |
| `POST` | `/api/issues/:id/reject` | Reject/Flag an issue. (Auto-flags and hides from feeds if rejects reach $\ge 3$) |
| `PATCH` | `/api/issues/:id/status` | Admin-level status update (adjusts timeline, awards resolution points) |
| `POST` | `/api/analyze-image` | Uses Gemini 2.5 Flash Vision/Multimodal API to analyze civic issue images/videos |

---

## 🌟 Key Features

### 1. Smart AI Image & Video Scanner
When reporting an issue, citizens can upload a photo or video. The server passes this media to **Gemini 2.5 Flash**, analyzing frames and text context to suggest automated category classification, title suggestions, and severity estimation.

### 2. Smart Deduplication (Clustering)
Prevents duplicate tickets from overwhelming the municipal desk. When a report is filed within `100 meters` of an unresolved issue of the same category, Gemini compares description and image similarity. If verified as a duplicate, the report is merged into a high-priority **"Mega-Ticket"**, consolidating confirmations and list contributors.

### 3. Gamified Verification (Swipe to Moderate)
A dedicated **Verify** swipe interface prompts citizens with unverified local reports within a `1.0 km` radius. Users swipe Right to confirm/verify or Left to reject (fake/fixed). Each action awards **+10 Pulse Points**. If rejects reach `3`, the report is flagged and routed to the authority's Flagged queue.

### 4. Auto Geolocation & Reverse Geocoding
Automatically captures the reporter's GPS coordinates and reverse-geocodes them into real, street-level addresses (using Nominatim/OpenStreetMap API) rather than random numbers or coordinates.

### 5. Enhanced Department Routing
Automated keyword-based municipal department assignment:
*   *Potholes & Footpaths* ➡️ `MCD Road Works Dept`
*   *Garbage & Waste* ➡️ `PWD Sanitation Dept`
*   *Trees & Parks* ➡️ `MCD Horticulture Dept`

### 6. Interactive Map (Dual GIS Rendering)
Uses `GoogleMapsContainer` which loads Google Maps, but actively hooks into `window.gm_authFailure` and `loadError`. If API loading fails, it shifts the layout to **Leaflet (OpenStreetMap Circle Markers)** dynamically, ensuring full functionality with zero map key friction.

### 7. Gamified Impact Progress
Citizens gain **Pulse Points** for contributions (+50 points for filing, +10 points for verifying/upvoting, +100 points when reported issue gets resolved). Badges (e.g., *Eagle Eye*, *Streak Builder*) and neighborhood leaderboard rankings incentivize community involvement.
