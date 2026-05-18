# Frontend Plan: EpiNexus React Dashboard

The frontend is a decoupled Next.js application designed for real-time interaction with the FastAPI backend. It leverages WebGL for smooth visualization of large-scale spatio-temporal data.

## 1. UI Components (Next.js / Tailwind)

### Control Sidebar
- **Pathogen Selector:** Configuration fetch from Backend.
- **Environmental Sliders:** Dynamic input for ACH, volume, and mitigation coefficients.
- **Monte Carlo Controls:** Precision sliders for ensemble size and noise thresholds.
- **Triage Priority:** Toggle for sorting by Risk vs. Value of Information (VoI).

### Main Workspace (Tabs)
1. **Interactive Topology (`react-force-graph`):**
    - 2D/3D force-directed graph.
    - **Risk Halos:** SVG-based translucent circles around nodes, sized by 95% Confidence Interval width.
    - **VoI Pulse:** Animated glow for high-entropy nodes recommended for testing.
2. **Spatio-Temporal View (`deck.gl`):**
    - Mapbox-based geospatial layer.
    - **Heatmap Layer:** Visualizing viral load $V_{loc}(t)$ in physical space.
    - **TripLayer:** Animating agent trajectories with time-scrubbing.
3. **Analytics Dashboard (`Recharts`):**
    - Node-specific histograms showing the Monte Carlo probability distribution.
    - Cumulative infection curves across different intervention scenarios.

## 2. Interaction & State Management
- **Asynchronous Fetching:** Using `SWR` or `React Query` to handle long-running backend Monte Carlo tasks without blocking the UI.
- **Zustand Store:** Global state for current time-tick, selected individuals, and environmental overrides.

## 3. High-Performance Visualization Logic
- **Risk Halos:** Implemented as custom node renderers in WebGL to ensure 60fps even with 500+ agents.
- **Time Scrubbing:** The frontend maintains a local cache of the trajectory matrix, allowing for zero-latency slider interaction.

## 4. Implementation Milestones
- **H+12:** Next.js scaffolding with Tailwind and API client setup.
- **H+24:** Basic `react-force-graph` implementation with static JSON data.
- **H+48:** Integrated `deck.gl` heatmap layer with real-time temporal scrubbing.
- **H+60:** Final integration with FastAPI for dynamic Monte Carlo updates and VoI highlights.

