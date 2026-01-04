# Design Guidelines: FIT File Analysis & AI Evaluation Application

## Design Approach

**Selected System**: Material Design with Linear-inspired refinement
**Rationale**: Data-heavy fitness application requiring clear hierarchy, strong data visualization, and efficient workflows. Material provides robust patterns for file handling and data display while Linear's refined typography approach ensures professional polish.

---

## Core Design Elements

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Monospace Font**: JetBrains Mono (for numerical data, metrics, timestamps)
- **Scale**:
  - Headers: text-4xl to text-6xl, font-bold
  - Subheadings: text-xl to text-2xl, font-semibold
  - Body: text-base, font-normal
  - Data metrics: text-lg to text-3xl, font-mono
  - Labels: text-sm, font-medium

### Layout System
**Spacing Primitives**: Tailwind units of 3, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section spacing: gap-8, gap-12
- Grid gaps: gap-4, gap-6
- Margins: m-3, m-6, m-8

**Container Strategy**:
- Max width: max-w-7xl for main content
- Sidebar width: w-64 to w-80
- Card constraints: max-w-sm to max-w-xl based on content density

---

## Application Layout

### Primary Structure
**Dashboard Layout** (post-upload):
- Left sidebar navigation (w-64): File list, analysis history, settings
- Main content area: Analysis results, charts, AI insights
- Right panel (optional toggle): Detailed metrics breakdown

**Upload State** (initial):
- Centered upload zone with drag-and-drop area
- Clean hero section with app title and capability description
- Quick feature highlights (3-column grid: md:grid-cols-3)

### Key Screens

**1. File Upload Interface**
- Large dropzone (min-h-96) with prominent border and upload icon
- Supported formats clearly listed
- Sample file link for demo purposes
- Recent uploads list below (if any exist)

**2. Analysis Dashboard**
- Top metrics bar: Distance, Duration, Avg Heart Rate, Elevation (grid-cols-2 md:grid-cols-4)
- Chart visualization area: Interactive graphs for pace, heart rate, elevation profile
- AI Insights panel: Generated analysis with expandable sections
- Lap/segment breakdown table

**3. Detailed Metrics View**
- Time-series data table with sortable columns
- Zone analysis (heart rate zones, pace zones) with visual bars
- Power metrics (if available from FIT file)
- Performance summary cards

---

## Component Library

### Navigation
- Horizontal top bar: App logo, file name display, action buttons (Export, Share)
- Vertical sidebar: Icon + label navigation items with active states

### Data Display
**Metric Cards**:
- Large numerical value (text-3xl, font-mono)
- Label below (text-sm, uppercase tracking)
- Compact layout (p-6, rounded-lg, border)

**Chart Containers**:
- Full-width sections with aspect-ratio-video or aspect-ratio-square
- Chart.js or similar library integration space
- Legend and axis labels clearly separated

**Tables**:
- Striped rows for readability
- Sticky headers for long data sets
- Hover states on rows
- Right-aligned numerical columns

### Forms & Inputs
**File Upload**:
- Dashed border dropzone with hover state
- Large "Choose File" button (px-8 py-4)
- File type icons for visual feedback

**Settings/Filters**:
- Toggle switches for preferences
- Dropdown selects for units (metric/imperial)
- Date range pickers for historical analysis

### Feedback Elements
**AI Analysis Section**:
- Distinct container with subtle elevation
- Icon indicating AI-generated content
- Expandable sections for different analysis categories (Performance, Recovery, Training Load)
- Loading skeleton during inference

**Upload Progress**:
- Linear progress bar with percentage
- File processing status messages
- Success confirmation with animation

---

## Responsive Behavior

**Desktop (lg+)**:
- Full sidebar + main content + optional right panel
- Multi-column metric grids (grid-cols-4)
- Side-by-side chart comparisons

**Tablet (md)**:
- Collapsible sidebar
- 2-column metric grids
- Stacked chart views

**Mobile (base)**:
- Bottom navigation bar
- Single column layouts
- Swipeable chart carousel
- Accordion-style metric sections

---

## Icons
**Library**: Heroicons (via CDN)
- Upload: arrow-up-tray
- Analysis: chart-bar
- Settings: cog-6-tooth
- Heart Rate: heart
- Location/Distance: map-pin
- Time: clock

---

## Images
**Hero Image**: None required - this is a utility application
**Placeholder Graphics**: Use simple illustrations or icons for empty states (no files uploaded yet)
**Brand**: Small logo in top-left navigation (max h-8 or h-10)

---

## Interaction Patterns
- Instant feedback on file drop
- Smooth transitions between upload and analysis states (300ms)
- Tooltips on metric cards explaining calculations
- Keyboard shortcuts for power users (listed in help modal)

**Animations**: Minimal - reserved for:
- Upload progress indication
- Chart data loading states
- Success confirmations (subtle check mark fade-in)