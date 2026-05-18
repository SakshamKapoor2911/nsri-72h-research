# Technical Stack: EpiNexus (Decoupled Architecture)

To achieve high-performance spatio-temporal modeling and interactive visualization within a 72-hour window, the following decoupled stack has been selected for its scalability and UI responsiveness.

## 1. Backend & Modeling (FastAPI)
- **Primary Language:** Python 3.11+
- **API Framework:** `FastAPI` (Asynchronous, self-documenting Swagger UI).
- **Numerical Computing:** `NumPy` & `Pandas` (Vectorized matrix operations).
- **Spatial Indexing:** `scipy.spatial.cKDTree` (Solving the $O(N^2)$ distance bottleneck).
- **Network Analysis:** `NetworkX` (Time-aware DAG construction).
- **Statistical Modeling:** `SciPy` (Monte Carlo and Pathogen Decay functions).

## 2. Frontend & Visualization (Next.js/React)
- **Framework:** `Next.js` 14+ (App Router, TypeScript).
- **Styling:** `Tailwind CSS`.
- **Network Graphs:** `react-force-graph` (WebGL accelerated for massive datasets).
- **Geospatial Maps:** `react-map-gl` + `deck.gl` (Spatio-temporal heatmap overlays).
- **Charts:** `Recharts` (Confidence interval and risk distribution plots).
- **State Management:** `React Context` or `Zustand`.

## 3. Data & Communication
- **API:** RESTful JSON payloads.
- **Storage:** Local JSON/Parquet for persistence.
- **Validation:** `Pydantic` (Backend) & `Zod` (Frontend).

## 4. Rationale
- **Performance:** Decoupling ensures that heavy backend math (KD-Tree queries, Monte Carlo ensembles) does not block the UI main thread.
- **WebGL Visualization:** Using `react-force-graph` and `deck.gl` allows for smooth interaction with thousands of spatial data points, which Streamlit cannot natively handle at scale.
- **Parallel Development:** Backend math can be developed and tested in isolation via Swagger while the Frontend UI is polished.
