import { useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

const MODEL_NAME = "EfficientNet-B0";
const MODEL_VALIDATION = "97.09%";
const MODEL_INPUT = "224 × 224";
const MODEL_CLASSES = "2";
const MODEL_DEVICE = "CUDA";

const initialDetections = [
  {
    time: "04:08:21",
    source: "DRONE",
    device: "UAV-01",
    image: "rockface_0408.jpg",
    risk: "LOW RISK",
    confidence: "96.8%",
    status: "Reviewed",
  },
  {
    time: "03:54:12",
    source: "DRONE",
    device: "UAV-01",
    image: "rockface_0354.jpg",
    risk: "HIGH RISK",
    confidence: "94.2%",
    status: "Requires Review",
  },
  {
    time: "03:41:08",
    source: "CAMERA",
    device: "CAM-02",
    image: "wall_cam02.jpg",
    risk: "LOW RISK",
    confidence: "97.1%",
    status: "Reviewed",
  },
  {
    time: "03:27:45",
    source: "CAMERA",
    device: "CAM-01",
    image: "slope_cam01.jpg",
    risk: "HIGH RISK",
    confidence: "91.7%",
    status: "Alert Active",
  },
  {
    time: "03:11:19",
    source: "DRONE",
    device: "UAV-01",
    image: "wall_0311.jpg",
    risk: "LOW RISK",
    confidence: "98.1%",
    status: "Reviewed",
  },
];

const droneStatus = {
  id: "UAV-01",
  connection: "ONLINE",
  battery: "87%",
  signal: "Strong",
  lastImage: "04:08:21",
  transmission: "04:08:24",
  backend: "ONLINE",
  ai: "READY",
  monitoring: "ACTIVE",
};

const cameras = [
  {
    id: "CAM-01",
    location: "North Highwall",
    status: "ONLINE",
    image: "04:07:14",
    transmission: "04:07:17",
    backend: "ONLINE",
    ai: "READY",
    monitoring: "ACTIVE",
  },
  {
    id: "CAM-02",
    location: "East Pit Wall",
    status: "ONLINE",
    image: "04:05:41",
    transmission: "04:05:44",
    backend: "ONLINE",
    ai: "READY",
    monitoring: "ACTIVE",
  },
  {
    id: "CAM-03",
    location: "South Ramp",
    status: "WARNING",
    image: "03:59:20",
    transmission: "04:00:02",
    backend: "ONLINE",
    ai: "PROCESSING",
    monitoring: "ACTIVE",
  },
  {
    id: "CAM-04",
    location: "West Bench",
    status: "OFFLINE",
    image: "02:41:08",
    transmission: "02:41:12",
    backend: "OFFLINE",
    ai: "OFFLINE",
    monitoring: "INACTIVE",
  },
];

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState("administrator");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [activePage, setActivePage] = useState("Dashboard");
  const [mobileNav, setMobileNav] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [sourceId, setSourceId] = useState(
    role === "administrator" ? "UAV-01" : "CAM-01"
  );

  const [processing, setProcessing] = useState(false);
  const [analysis, setAnalysis] = useState({
    risk: "LOW RISK",
    confidence: 96.8,
    high: 3.2,
    low: 96.8,
    status: "READY",
  });

  const [detections, setDetections] = useState(initialDetections);
  const [search, setSearch] = useState("");

  const isAdmin = role === "administrator";

  const navigation = isAdmin
    ? [
        ["Dashboard", "grid"],
        ["Drone Live Feed", "drone"],
        ["Drone Image Upload", "upload"],
        ["AI Risk Analysis", "brain"],
        ["Detection History", "history"],
        ["Drone Status", "activity"],
        ["Reports", "report"],
        ["Settings", "settings"],
        ["Help", "help"],
      ]
    : [
        ["Dashboard", "grid"],
        ["Mine Camera Feed", "camera"],
        ["Camera Image Upload", "upload"],
        ["AI Risk Analysis", "brain"],
        ["Detection History", "history"],
        ["Camera Status", "activity"],
        ["Alerts", "alert"],
        ["Reports", "report"],
        ["Settings", "settings"],
        ["Help", "help"],
      ];

  const filteredDetections = useMemo(() => {
    const value = search.toLowerCase();

    return detections.filter((item) =>
      `${item.time} ${item.source} ${item.device} ${item.image} ${item.risk} ${item.status}`
        .toLowerCase()
        .includes(value)
    );
  }, [detections, search]);

  function handleLogin(e) {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setLoginError("Enter your username and password.");
      return;
    }

    setLoginError("");
    setLoginLoading(true);

    setTimeout(() => {
      setLoginLoading(false);
      setAuthenticated(true);
      setActivePage("Dashboard");
      setSourceId(role === "administrator" ? "UAV-01" : "CAM-01");
    }, 900);
  }

  function logout() {
    setAuthenticated(false);
    setUsername("");
    setPassword("");
    setLoginError("");
    setActivePage("Dashboard");
  }

  function handleImage(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedImage(file);

    const reader = new FileReader();

    reader.onload = () => {
      setImagePreview(reader.result);
    };

    reader.readAsDataURL(file);

    setAnalysis({
      risk: "PROCESSING",
      confidence: 0,
      high: 0,
      low: 0,
      status: "PROCESSING",
    });
  }

  function analyzeImage() {
    if (!selectedImage) return;

    setProcessing(true);

    setAnalysis({
      risk: "PROCESSING",
      confidence: 0,
      high: 0,
      low: 0,
      status: "PROCESSING",
    });

    setTimeout(() => {
      const highRisk = Math.random() > 0.7;
      const confidence = highRisk
        ? 91 + Math.random() * 7
        : 94 + Math.random() * 5;

      const rounded = Number(confidence.toFixed(1));

      setAnalysis({
        risk: highRisk ? "HIGH RISK" : "LOW RISK",
        confidence: rounded,
        high: highRisk ? rounded : Number((100 - rounded).toFixed(1)),
        low: highRisk ? Number((100 - rounded).toFixed(1)) : rounded,
        status: "COMPLETE",
      });

      setProcessing(false);

      setDetections((previous) => [
        {
          time: new Date().toLocaleTimeString("en-IN", {
            hour12: false,
          }),
          source: isAdmin ? "DRONE" : "CAMERA",
          device: sourceId,
          image: selectedImage.name,
          risk: highRisk ? "HIGH RISK" : "LOW RISK",
          confidence: `${rounded}%`,
          status: highRisk ? "Alert Active" : "Reviewed",
        },
        ...previous,
      ]);
    }, 1800);
  }

  if (!authenticated) {
    return (
      <LoginScreen
        role={role}
        setRole={setRole}
        username={username}
        password={password}
        setUsername={setUsername}
        setPassword={setPassword}
        loginLoading={loginLoading}
        loginError={loginError}
        handleLogin={handleLogin}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        navigation={navigation}
        activePage={activePage}
        setActivePage={(page) => {
          setActivePage(page);
          setMobileNav(false);
        }}
        role={role}
        logout={logout}
        mobileNav={mobileNav}
      />

      <main className="main-area">
        <Topbar
          role={role}
          activePage={activePage}
          setMobileNav={setMobileNav}
          mobileNav={mobileNav}
        />

        <div className="page-container">
          {activePage === "Dashboard" && (
            <Dashboard
              role={role}
              analysis={analysis}
              imagePreview={imagePreview}
              detections={detections}
              setActivePage={setActivePage}
            />
          )}

          {activePage === "Drone Live Feed" && (
            <LiveFeed
              title="UAV LIVE MONITORING"
              subtitle="Real-time aerial mine wall surveillance"
              type="drone"
            />
          )}

          {activePage === "Mine Camera Feed" && (
            <LiveFeed
              title="MINE CAMERA MONITORING"
              subtitle="Fixed highwall surveillance network"
              type="camera"
            />
          )}

          {(activePage === "Drone Image Upload" ||
            activePage === "Camera Image Upload") && (
            <UploadPage
              role={role}
              sourceId={sourceId}
              setSourceId={setSourceId}
              imagePreview={imagePreview}
              selectedImage={selectedImage}
              handleImage={handleImage}
              analyzeImage={analyzeImage}
              processing={processing}
            />
          )}

          {activePage === "AI Risk Analysis" && (
            <AnalysisPage
              analysis={analysis}
              imagePreview={imagePreview}
              processing={processing}
            />
          )}

          {activePage === "Detection History" && (
            <HistoryPage
              detections={filteredDetections}
              search={search}
              setSearch={setSearch}
            />
          )}

          {activePage === "Drone Status" && <DroneStatusPage />}

          {activePage === "Camera Status" && <CameraStatusPage />}

          {activePage === "Alerts" && <AlertsPage />}

          {activePage === "Reports" && <ReportsPage />}

          {activePage === "Settings" && <SettingsPage />}

          {activePage === "Help" && <HelpPage />}
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   LOGIN
========================================================= */

function LoginScreen({
  role,
  setRole,
  username,
  password,
  setUsername,
  setPassword,
  loginLoading,
  loginError,
  handleLogin,
}) {
  return (
    <div className="login-page">
      <div className="login-grid" />

      <div className="login-content">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Icon name="mountain" />
          </div>

          <div>
            <div className="brand-name">ROCKFALL AI</div>
            <div className="brand-subtitle">
              INTELLIGENT MINE SAFETY MONITORING
            </div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-header">
            <div className="eyebrow">SECURE ACCESS</div>
            <h1>Mine Safety Command Center</h1>
            <p>
              Authenticate to access AI-powered rockfall monitoring systems.
            </p>
          </div>

          <div className="role-selector">
            <button
              className={role === "administrator" ? "active" : ""}
              onClick={() => setRole("administrator")}
              type="button"
            >
              <Icon name="shield" />
              <span>
                <strong>ADMINISTRATOR</strong>
                <small>UAV monitoring & system control</small>
              </span>
            </button>

            <button
              className={role === "worker" ? "active" : ""}
              onClick={() => setRole("worker")}
              type="button"
            >
              <Icon name="hardhat" />
              <span>
                <strong>MINE WORKER</strong>
                <small>Camera monitoring & alerts</small>
              </span>
            </button>
          </div>

          <form onSubmit={handleLogin}>
            <label>USERNAME</label>
            <div className="input-wrap">
              <Icon name="user" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
              />
            </div>

            <label>PASSWORD</label>
            <div className="input-wrap">
              <Icon name="lock" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                type="password"
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <div className="login-error">
                <Icon name="alert" />
                {loginError}
              </div>
            )}

            <button className="login-button" disabled={loginLoading}>
              {loginLoading ? (
                <>
                  <span className="spinner" />
                  AUTHENTICATING...
                </>
              ) : (
                <>
                  ACCESS COMMAND CENTER
                  <Icon name="arrow" />
                </>
              )}
            </button>
          </form>

          <div className="login-security">
            <span className="status-dot green" />
            SYSTEM READY
            <span>•</span>
            ENCRYPTED ACCESS
          </div>
        </div>

        <div className="login-footer">
          ROCKFALL AI • AI-POWERED OPEN-PIT MINE SAFETY PLATFORM
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({
  navigation,
  activePage,
  setActivePage,
  role,
  logout,
  mobileNav,
}) {
  return (
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-mark small">
          <Icon name="mountain" />
        </div>
        <div>
          <strong>ROCKFALL AI</strong>
          <small>MINE SAFETY SYSTEM</small>
        </div>
      </div>

      <div className="role-badge">
        <span className="status-dot orange" />
        {role === "administrator" ? "ADMINISTRATOR" : "MINE WORKER"}
      </div>

      <nav>
        <div className="nav-label">MONITORING</div>

        {navigation.slice(0, 7).map(([name, icon]) => (
          <button
            key={name}
            className={activePage === name ? "nav-item active" : "nav-item"}
            onClick={() => setActivePage(name)}
          >
            <Icon name={icon} />
            <span>{name}</span>

            {name === "Alerts" && (
              <span className="nav-alert-count">2</span>
            )}
          </button>
        ))}

        <div className="nav-label system-label">SYSTEM</div>

        {navigation.slice(7).map(([name, icon]) => (
          <button
            key={name}
            className={activePage === name ? "nav-item active" : "nav-item"}
            onClick={() => setActivePage(name)}
          >
            <Icon name={icon} />
            <span>{name}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="system-status-card">
          <div className="system-status-title">
            <span className="status-dot green" />
            ALL SYSTEMS OPERATIONAL
          </div>

          <div className="mini-status">
            <span>AI ENGINE</span>
            <b>READY</b>
          </div>

          <div className="mini-status">
            <span>BACKEND</span>
            <b>ONLINE</b>
          </div>
        </div>

        <button className="logout-button" onClick={logout}>
          <Icon name="logout" />
          Logout
        </button>
      </div>
    </aside>
  );
}

/* =========================================================
   TOPBAR
========================================================= */

function Topbar({ role, activePage, setMobileNav }) {
  return (
    <header className="topbar">
      <button
        className="mobile-menu"
        onClick={() => setMobileNav((value) => !value)}
      >
        <Icon name="menu" />
      </button>

      <div>
        <div className="breadcrumb">
          ROCKFALL AI <span>/</span>{" "}
          {role === "administrator" ? "UAV" : "CAMERA"}
        </div>
        <h2>{activePage}</h2>
      </div>

      <div className="topbar-actions">
        <div className="live-indicator">
          <span className="status-dot green" />
          MONITORING ACTIVE
        </div>

        <button className="icon-button">
          <Icon name="bell" />
          <span className="notification-dot" />
        </button>

        <div className="user-chip">
          <div className="avatar">
            <Icon name={role === "administrator" ? "shield" : "hardhat"} />
          </div>
          <div>
            <strong>{role === "administrator" ? "Administrator" : "Mine Worker"}</strong>
            <small>Authorized User</small>
          </div>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  role,
  analysis,
  imagePreview,
  detections,
  setActivePage,
}) {
  const isAdmin = role === "administrator";

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? "UAV MONITORING" : "MINE CAMERA MONITORING"}
        title={
          isAdmin
            ? "UAV Rockfall Monitoring Dashboard"
            : "Mine Camera Rockfall Monitoring"
        }
        subtitle={
          isAdmin
            ? "Aerial intelligence for highwall and pit-slope safety."
            : "Continuous fixed-camera surveillance for mine safety."
        }
      />

      <div className="status-strip">
        <StatusPill label="AI ENGINE" value="READY" />
        <StatusPill label={isAdmin ? "UAV-01" : "CAMERAS"} value="ONLINE" />
        <StatusPill label="BACKEND" value="ONLINE" />
        <StatusPill label="MONITORING" value="ACTIVE" />
        <div className="last-sync">
          <Icon name="refresh" />
          Last sync 04:08:24
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="CURRENT RISK"
          value={analysis.risk}
          icon="shield"
          state={analysis.risk === "HIGH RISK" ? "danger" : "safe"}
          footer="Latest AI assessment"
        />

        <StatCard
          title="CONFIDENCE"
          value={`${analysis.confidence || 0}%`}
          icon="target"
          footer="Model confidence"
        />

        <StatCard
          title="HIGH-RISK PROBABILITY"
          value={`${analysis.high || 0}%`}
          icon="alert"
          state={analysis.high > 50 ? "danger" : ""}
          footer="Predicted probability"
        />

        <StatCard
          title="LOW-RISK PROBABILITY"
          value={`${analysis.low || 0}%`}
          icon="check"
          state="safe"
          footer="Predicted probability"
        />
      </div>

      <div className="dashboard-grid main-grid">
        <section className="panel image-panel">
          <PanelHeader
            title={isAdmin ? "LATEST DRONE IMAGE" : "LATEST CAMERA IMAGE"}
            subtitle={isAdmin ? "UAV-01 • Highwall Sector" : "CAM-01 • North Highwall"}
            action="VIEW FEED"
            onAction={() =>
              setActivePage(isAdmin ? "Drone Live Feed" : "Mine Camera Feed")
            }
          />

          <div className="mine-image">
            {imagePreview ? (
              <img src={imagePreview} alt="Latest rock face" />
            ) : (
              <>
                <div className="placeholder-mine">
                  <Icon name="mountain" />
                  <span>ROCK-FACE VISUAL FEED</span>
                  <small>
                    {isAdmin ? "UAV-01" : "CAM-01"} • LIVE MONITORING
                  </small>
                </div>
              </>
            )}

            <div className="image-overlay-top">
              <span className="live-tag">
                <span className="status-dot red" />
                LIVE
              </span>
              <span>224 × 224 AI INPUT</span>
            </div>

            <div className="image-overlay-bottom">
              <span>{isAdmin ? "UAV-01" : "CAM-01"}</span>
              <span>04:08:21</span>
            </div>
          </div>
        </section>

        <RiskAssessment analysis={analysis} />
      </div>

      <div className="dashboard-grid">
        <Explainability imagePreview={imagePreview} />

        <section className="panel">
          <PanelHeader
            title="RECENT DETECTIONS"
            subtitle="Latest AI assessments"
            action="VIEW ALL"
            onAction={() => setActivePage("Detection History")}
          />

          <DetectionList detections={detections.slice(0, 5)} />
        </section>
      </div>

      <Workflow role={role} />
    </>
  );
}

/* =========================================================
   RISK ASSESSMENT
========================================================= */

function RiskAssessment({ analysis }) {
  const high = analysis.risk === "HIGH RISK";

  return (
    <section className={`panel risk-panel ${high ? "high-risk" : ""}`}>
      <PanelHeader
        title="AI RISK ASSESSMENT"
        subtitle="EfficientNet-B0 prediction"
      />

      <div className="risk-content">
        <div className={`risk-ring ${high ? "danger" : "safe"}`}>
          <div className="risk-ring-inner">
            <Icon name={high ? "alert" : "check"} />
            <strong>{analysis.confidence || 0}%</strong>
            <small>CONFIDENCE</small>
          </div>
        </div>

        <div className="risk-result">
          <span className={`risk-label ${high ? "danger-text" : "safe-text"}`}>
            {high ? "⚠" : "✓"} {analysis.risk}
          </span>

          <p>
            {high
              ? "AI detected visual patterns associated with potential rockfall instability. Review the affected area."
              : "AI detected a visually stable rock-face pattern with low predicted rockfall risk."}
          </p>

          <div className="probability">
            <div>
              <span>HIGH RISK</span>
              <strong>{analysis.high || 0}%</strong>
            </div>
            <div className="probability-track">
              <span
                style={{
                  width: `${analysis.high || 0}%`,
                }}
              />
            </div>
          </div>

          <div className="probability">
            <div>
              <span>LOW RISK</span>
              <strong>{analysis.low || 0}%</strong>
            </div>
            <div className="probability-track low">
              <span
                style={{
                  width: `${analysis.low || 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="model-meta">
        <span>
          <small>MODEL</small>
          {MODEL_NAME}
        </span>

        <span>
          <small>INPUT</small>
          {MODEL_INPUT}
        </span>

        <span>
          <small>DEVICE</small>
          {MODEL_DEVICE}
        </span>

        <span>
          <small>STATUS</small>
          <b className="safe-text">{analysis.status}</b>
        </span>
      </div>
    </section>
  );
}

/* =========================================================
   EXPLAINABILITY
========================================================= */

function Explainability({ imagePreview }) {
  return (
    <section className="panel explainability-panel">
      <PanelHeader
        title="VISUAL EVIDENCE & ATTENTION MAP"
        subtitle="Grad-CAM explainability"
      />

      <div className="explain-grid">
        <div>
          <div className="visual-label">ORIGINAL IMAGE</div>

          <div className="explain-image">
            {imagePreview ? (
              <img src={imagePreview} alt="Original rock face" />
            ) : (
              <div className="visual-placeholder">
                <Icon name="image" />
                ORIGINAL ROCK-FACE
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="visual-label">GRAD-CAM HEATMAP</div>

          <div className="explain-image heatmap">
            <div className="heatmap-grid" />
            <div className="attention-zone zone-one" />
            <div className="attention-zone zone-two" />
            <div className="attention-zone zone-three" />
            <div className="heatmap-center">
              <Icon name="focus" />
              AI ATTENTION
            </div>
          </div>
        </div>
      </div>

      <div className="attention-scale">
        <span>LOW ATTENTION</span>
        <div className="scale-bar">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <span>HIGH ATTENTION</span>
      </div>

      <div className="ai-explanation">
        <div className="explanation-icon">
          <Icon name="brain" />
        </div>

        <div>
          <strong>AI VISUAL EXPLANATION</strong>
          <p>
            The model focuses on regions of the rock face showing changes in
            texture, discontinuity-like structures and fragmented surface
            patterns. These visual signals contribute to the risk assessment.
          </p>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   UPLOAD
========================================================= */

function UploadPage({
  role,
  sourceId,
  setSourceId,
  imagePreview,
  selectedImage,
  handleImage,
  analyzeImage,
  processing,
}) {
  const isAdmin = role === "administrator";

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? "UAV IMAGE INGESTION" : "MINE CAMERA INPUT"}
        title={isAdmin ? "Drone Image Upload" : "Camera Image Upload"}
        subtitle={
          isAdmin
            ? "Submit aerial rock-face imagery for AI risk assessment."
            : "Submit mine-camera imagery for automated rockfall analysis."
        }
      />

      <div className="upload-layout">
        <section className="panel upload-panel">
          <PanelHeader
            title={isAdmin ? "DRONE IMAGE INPUT" : "MINE CAMERA INPUT"}
            subtitle="Image acquisition and AI processing"
          />

          <div className="source-row">
            <div className="field">
              <label>{isAdmin ? "UAV ID" : "CAMERA ID"}</label>

              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                {isAdmin ? (
                  <option>UAV-01</option>
                ) : (
                  <>
                    <option>CAM-01</option>
                    <option>CAM-02</option>
                    <option>CAM-03</option>
                    <option>CAM-04</option>
                  </>
                )}
              </select>
            </div>

            {!isAdmin && (
              <div className="field">
                <label>LOCATION</label>
                <select>
                  <option>North Highwall</option>
                  <option>East Pit Wall</option>
                  <option>South Ramp</option>
                  <option>West Bench</option>
                </select>
              </div>
            )}
          </div>

          <label className="drop-zone">
            <input
              type="file"
              accept="image/*"
              onChange={handleImage}
            />

            {imagePreview ? (
              <img src={imagePreview} alt="Selected rock face" />
            ) : (
              <div className="drop-content">
                <div className="upload-icon">
                  <Icon name="upload" />
                </div>

                <strong>DRAG & DROP IMAGE</strong>
                <span>or click to browse and select</span>
                <small>JPG, PNG, WEBP • Maximum 20 MB</small>
              </div>
            )}
          </label>

          {selectedImage && (
            <div className="file-information">
              <div className="file-icon">
                <Icon name="image" />
              </div>

              <div>
                <strong>{selectedImage.name}</strong>
                <small>
                  {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                </small>
              </div>

              <span className="file-ready">
                <span className="status-dot green" />
                READY
              </span>
            </div>
          )}

          <div className="metadata-grid">
            <Metadata label={isAdmin ? "UAV ID" : "CAMERA ID"} value={sourceId} />
            <Metadata label="TIMESTAMP" value="Automatic" />
            <Metadata label="AI MODEL" value={MODEL_NAME} />
            <Metadata label="PROCESSING" value={MODEL_DEVICE} />
          </div>

          <button
            className="analyze-button"
            disabled={!selectedImage || processing}
            onClick={analyzeImage}
          >
            {processing ? (
              <>
                <span className="spinner" />
                PROCESSING IMAGE...
              </>
            ) : (
              <>
                <Icon name="brain" />
                ANALYZE IMAGE
                <Icon name="arrow" />
              </>
            )}
          </button>
        </section>

        <section className="panel process-panel">
          <PanelHeader
            title="PROCESSING PIPELINE"
            subtitle="Capture → Analyze → Predict → Explain"
          />

          <PipelineStep
            number="01"
            icon="image"
            title="IMAGE RECEIVED"
            description="Rock-face image enters the AI pipeline."
            active={Boolean(selectedImage)}
            complete={Boolean(selectedImage)}
          />

          <PipelineStep
            number="02"
            icon="brain"
            title="AI ANALYSIS"
            description="EfficientNet-B0 processes the image."
            active={processing}
            complete={!processing && Boolean(selectedImage)}
          />

          <PipelineStep
            number="03"
            icon="target"
            title="RISK PREDICTION"
            description="Low Risk or High Risk classification."
            active={false}
            complete={false}
          />

          <PipelineStep
            number="04"
            icon="focus"
            title="GRAD-CAM"
            description="Visual evidence and attention mapping."
            active={false}
            complete={false}
          />
        </section>
      </div>
    </>
  );
}

/* =========================================================
   ANALYSIS PAGE
========================================================= */

function AnalysisPage({ analysis, imagePreview, processing }) {
  return (
    <>
      <PageHeader
        eyebrow="ARTIFICIAL INTELLIGENCE"
        title="AI Risk Assessment"
        subtitle="Explainable rockfall prediction powered by EfficientNet-B0."
      />

      {processing && (
        <div className="processing-banner">
          <span className="spinner" />
          AI ENGINE PROCESSING ROCK-FACE IMAGE...
        </div>
      )}

      <div className="analysis-layout">
        <RiskAssessment analysis={analysis} />
        <Explainability imagePreview={imagePreview} />
      </div>
    </>
  );
}

/* =========================================================
   HISTORY
========================================================= */

function HistoryPage({ detections, search, setSearch }) {
  return (
    <>
      <PageHeader
        eyebrow="MONITORING RECORD"
        title="Detection History"
        subtitle="Search and review previous AI rockfall assessments."
      />

      <section className="panel history-panel">
        <div className="history-toolbar">
          <div className="search-box">
            <Icon name="search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search detections..."
            />
          </div>

          <button className="secondary-button">
            <Icon name="filter" />
            FILTER
          </button>

          <button className="secondary-button">
            <Icon name="download" />
            EXPORT
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>TIME</th>
                <th>SOURCE</th>
                <th>DEVICE</th>
                <th>IMAGE</th>
                <th>RISK</th>
                <th>CONFIDENCE</th>
                <th>STATUS</th>
              </tr>
            </thead>

            <tbody>
              {detections.map((item, index) => (
                <tr key={`${item.time}-${index}`}>
                  <td>{item.time}</td>

                  <td>
                    <span className="source-badge">
                      <Icon name={item.source === "DRONE" ? "drone" : "camera"} />
                      {item.source}
                    </span>
                  </td>

                  <td>
                    <strong>{item.device}</strong>
                  </td>

                  <td className="image-name">{item.image}</td>

                  <td>
                    <RiskBadge risk={item.risk} />
                  </td>

                  <td>
                    <strong>{item.confidence}</strong>
                  </td>

                  <td>
                    <span
                      className={`table-status ${
                        item.status === "Reviewed"
                          ? "reviewed"
                          : item.status === "Alert Active"
                          ? "alert"
                          : "review"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* =========================================================
   DEVICE STATUS
========================================================= */

function DroneStatusPage() {
  return (
    <>
      <PageHeader
        eyebrow="UAV FLEET"
        title="Drone Status"
        subtitle="Monitor UAV connectivity, transmission and AI processing."
      />

      <div className="device-detail-grid">
        <section className="panel drone-device">
          <div className="device-heading">
            <div className="device-icon">
              <Icon name="drone" />
            </div>

            <div>
              <div className="eyebrow">AERIAL UNIT</div>
              <h3>UAV-01</h3>
            </div>

            <span className="online-badge">ONLINE</span>
          </div>

          <div className="battery">
            <div>
              <span>BATTERY</span>
              <strong>{droneStatus.battery}</strong>
            </div>

            <div className="battery-bar">
              <span style={{ width: droneStatus.battery }} />
            </div>
          </div>

          <DeviceRows
            rows={[
              ["Connection", droneStatus.connection],
              ["Signal", droneStatus.signal],
              ["Last image", droneStatus.lastImage],
              ["Last transmission", droneStatus.transmission],
              ["Backend", droneStatus.backend],
              ["AI processing", droneStatus.ai],
              ["Monitoring", droneStatus.monitoring],
            ]}
          />
        </section>
      </div>
    </>
  );
}

function CameraStatusPage() {
  return (
    <>
      <PageHeader
        eyebrow="FIXED SURVEILLANCE NETWORK"
        title="Camera Status"
        subtitle="Live health monitoring for mine safety cameras."
      />

      <div className="camera-grid">
        {cameras.map((camera) => (
          <section className="panel camera-card" key={camera.id}>
            <div className="camera-card-header">
              <div className="camera-device-icon">
                <Icon name="camera" />
              </div>

              <div>
                <h3>{camera.id}</h3>
                <span>{camera.location}</span>
              </div>

              <span className={`status-badge ${camera.status.toLowerCase()}`}>
                {camera.status}
              </span>
            </div>

            <DeviceRows
              rows={[
                ["Last image", camera.image],
                ["Transmission", camera.transmission],
                ["Backend", camera.backend],
                ["AI processing", camera.ai],
                ["Monitoring", camera.monitoring],
              ]}
            />
          </section>
        ))}
      </div>
    </>
  );
}

/* =========================================================
   ALERTS
========================================================= */

function AlertsPage() {
  return (
    <>
      <PageHeader
        eyebrow="SAFETY NOTIFICATIONS"
        title="Rockfall Alerts"
        subtitle="High-priority AI detections requiring attention."
      />

      <div className="alert-stack">
        <AlertCard
          device="CAM-01"
          location="North Highwall"
          time="03:27:45"
          confidence="91.7%"
          probability="91.7%"
        />

        <AlertCard
          device="UAV-01"
          location="East Pit Wall"
          time="03:54:12"
          confidence="94.2%"
          probability="94.2%"
        />

        <div className="safe-alert">
          <div>
            <Icon name="check" />
          </div>
          <section>
            <strong>✓ LOW ROCKFALL RISK</strong>
            <p>
              No active high-risk alert currently detected by CAM-02.
            </p>
          </section>
          <span>03:41:08</span>
        </div>
      </div>
    </>
  );
}

function AlertCard({ device, location, time, confidence, probability }) {
  return (
    <section className="high-alert">
      <div className="alert-icon">
        <Icon name="alert" />
      </div>

      <div className="alert-main">
        <div className="alert-title">⚠ HIGH ROCKFALL RISK DETECTED</div>

        <div className="alert-location">
          {device} • {location}
        </div>

        <div className="alert-details">
          <span>
            <small>DETECTION TIME</small>
            {time}
          </span>

          <span>
            <small>CONFIDENCE</small>
            {confidence}
          </span>

          <span>
            <small>RISK PROBABILITY</small>
            {probability}
          </span>

          <span>
            <small>REVIEW STATUS</small>
            <b>REQUIRES REVIEW</b>
          </span>
        </div>
      </div>

      <button className="review-button">REVIEW</button>
    </section>
  );
}

/* =========================================================
   REPORTS
========================================================= */

function ReportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="SYSTEM INTELLIGENCE"
        title="Reports & Model Information"
        subtitle="AI model performance and monitoring statistics."
      />

      <div className="report-hero">
        <div>
          <div className="eyebrow">PRODUCTION AI ENGINE</div>
          <h2>{MODEL_NAME}</h2>
          <p>
            Computer vision model configured for two-class rockfall risk
            classification.
          </p>
        </div>

        <div className="report-accuracy">
          <small>VALIDATION ACCURACY</small>
          <strong>{MODEL_VALIDATION}</strong>
        </div>
      </div>

      <div className="report-grid">
        <ReportMetric title="DATASET SIZE" value="2,764" subtitle="Images" />
        <ReportMetric title="RISK CLASSES" value="2" subtitle="Low / High" />
        <ReportMetric title="INPUT RESOLUTION" value="224 × 224" subtitle="RGB" />
        <ReportMetric title="PROCESSING DEVICE" value="CUDA" subtitle="GPU acceleration" />
        <ReportMetric title="EXPLAINABILITY" value="Grad-CAM" subtitle="Visual attention" />
        <ReportMetric title="MODEL STATUS" value="READY" subtitle="Production engine" />
      </div>

      <section className="panel">
        <PanelHeader
          title="MONITORING PIPELINE"
          subtitle="System architecture"
        />

        <Workflow role="administrator" />
      </section>
    </>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="SYSTEM CONFIGURATION"
        title="Settings"
        subtitle="Configure monitoring and notification preferences."
      />

      <div className="settings-grid">
        <SettingsCard
          title="AI ENGINE"
          icon="brain"
          rows={[
            ["Model", "EfficientNet-B0"],
            ["Input", "224 × 224"],
            ["Device", "CUDA"],
            ["Explainability", "Grad-CAM"],
          ]}
        />

        <SettingsCard
          title="MONITORING"
          icon="activity"
          rows={[
            ["Monitoring", "ACTIVE"],
            ["Auto analysis", "ENABLED"],
            ["Alert notifications", "ENABLED"],
            ["Image retention", "30 days"],
          ]}
        />

        <SettingsCard
          title="BACKEND"
          icon="server"
          rows={[
            ["API", API_URL],
            ["Status", "ONLINE"],
            ["Processing", "READY"],
            ["Connection", "Secure"],
          ]}
        />
      </div>
    </>
  );
}

/* =========================================================
   HELP
========================================================= */

function HelpPage() {
  return (
    <>
      <PageHeader
        eyebrow="SUPPORT CENTER"
        title="Help & System Guide"
        subtitle="Quick reference for ROCKFALL AI operators."
      />

      <div className="help-grid">
        <HelpCard
          icon="upload"
          title="IMAGE ANALYSIS"
          text="Upload a rock-face image, select the monitoring source and press Analyze Image to run the AI model."
        />

        <HelpCard
          icon="alert"
          title="HIGH RISK"
          text="High Risk indicates that the AI identified visual patterns associated with potential rockfall instability. Review the image and attention map."
        />

        <HelpCard
          icon="focus"
          title="GRAD-CAM"
          text="Grad-CAM highlights image regions that contributed strongly to the model's prediction."
        />

        <HelpCard
          icon="activity"
          title="DEVICE STATUS"
          text="Use device status pages to monitor UAV and fixed-camera connectivity, backend availability and processing state."
        />
      </div>
    </>
  );
}

/* =========================================================
   LIVE FEED
========================================================= */

function LiveFeed({ title, subtitle, type }) {
  const isDrone = type === "drone";

  return (
    <>
      <PageHeader
        eyebrow={isDrone ? "UAV SURVEILLANCE" : "FIXED CAMERA NETWORK"}
        title={title}
        subtitle={subtitle}
      />

      <section className="panel live-feed-panel">
        <div className="feed-heading">
          <div>
            <div className="eyebrow">
              {isDrone ? "UAV-01" : "CAM-01"} • LIVE STREAM
            </div>
            <h3>{isDrone ? "Aerial Highwall View" : "North Highwall View"}</h3>
          </div>

          <span className="live-tag">
            <span className="status-dot red" />
            LIVE
          </span>
        </div>

        <div className="live-screen">
          <div className="scan-lines" />
          <div className="feed-center">
            <Icon name={isDrone ? "drone" : "camera"} />
            <strong>LIVE MONITORING FEED</strong>
            <span>
              {isDrone ? "UAV-01 / HIGHWALL SECTOR" : "CAM-01 / NORTH HIGHWALL"}
            </span>
          </div>

          <div className="feed-corner top-left">REC • 04:08:24</div>
          <div className="feed-corner top-right">AI MONITORING ACTIVE</div>
          <div className="feed-corner bottom-left">1920 × 1080</div>
          <div className="feed-corner bottom-right">SIGNAL STRONG</div>
        </div>
      </section>
    </>
  );
}

/* =========================================================
   WORKFLOW
========================================================= */

function Workflow({ role }) {
  const isAdmin = role === "administrator";

  const steps = isAdmin
    ? [
        ["UAV", "drone"],
        ["IMAGE CAPTURE", "image"],
        ["AI ANALYSIS", "brain"],
        ["RISK PREDICTION", "target"],
        ["GRAD-CAM", "focus"],
        ["DASHBOARD", "monitor"],
      ]
    : [
        ["MINE CAMERA", "camera"],
        ["IMAGE CAPTURE", "image"],
        ["AI ANALYSIS", "brain"],
        ["RISK PREDICTION", "target"],
        ["GRAD-CAM", "focus"],
        ["ALERT", "alert"],
      ];

  return (
    <section className="panel workflow-panel">
      <PanelHeader
        title="SYSTEM WORKFLOW"
        subtitle={
          isAdmin
            ? "UAV → Image → AI → Prediction → Explain → Dashboard"
            : "Camera → Image → AI → Prediction → Explain → Alert"
        }
      />

      <div className="workflow">
        {steps.map(([title, icon], index) => (
          <div className="workflow-step-wrapper" key={title}>
            <div className="workflow-step">
              <div className="workflow-icon">
                <Icon name={icon} />
              </div>
              <span>{title}</span>
            </div>

            {index < steps.length - 1 && (
              <div className="workflow-arrow">
                <Icon name="arrow" />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="header-time">
        <span className="status-dot green" />
        SYSTEM TIME
        <strong>
          {new Date().toLocaleTimeString("en-IN", {
            hour12: false,
          })}
        </strong>
      </div>
    </div>
  );
}

function PanelHeader({ title, subtitle, action, onAction }) {
  return (
    <div className="panel-header">
      <div>
        <h3>{title}</h3>
        {subtitle && <span>{subtitle}</span>}
      </div>

      {action && (
        <button className="panel-action" onClick={onAction}>
          {action}
          <Icon name="arrow" />
        </button>
      )}
    </div>
  );
}

function StatusPill({ label, value }) {
  return (
    <div className="status-pill">
      <span className="status-dot green" />
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function StatCard({ title, value, icon, state = "", footer }) {
  return (
    <div className={`stat-card ${state}`}>
      <div className="stat-top">
        <span>{title}</span>
        <div className="stat-icon">
          <Icon name={icon} />
        </div>
      </div>

      <strong className="stat-value">{value}</strong>
      <small>{footer}</small>
    </div>
  );
}

function DetectionList({ detections }) {
  return (
    <div className="detection-list">
      {detections.map((item, index) => (
        <div className="detection-row" key={`${item.time}-${index}`}>
          <div className="detection-time">{item.time}</div>

          <div className="detection-source">
            <div className="small-source-icon">
              <Icon name={item.source === "DRONE" ? "drone" : "camera"} />
            </div>

            <div>
              <strong>{item.device}</strong>
              <small>{item.source}</small>
            </div>
          </div>

          <RiskBadge risk={item.risk} />

          <strong>{item.confidence}</strong>
        </div>
      ))}
    </div>
  );
}

function RiskBadge({ risk }) {
  const high = risk === "HIGH RISK";

  return (
    <span className={`risk-badge ${high ? "danger" : "safe"}`}>
      <span className="status-dot" />
      {risk}
    </span>
  );
}

function Metadata({ label, value }) {
  return (
    <div className="metadata">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function PipelineStep({ number, icon, title, description, active, complete }) {
  return (
    <div className={`pipeline-step ${active ? "active" : ""}`}>
      <div className={`pipeline-number ${complete ? "complete" : ""}`}>
        {complete ? <Icon name="check" /> : number}
      </div>

      <div className="pipeline-icon">
        <Icon name={icon} />
      </div>

      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

function DeviceRows({ rows }) {
  return (
    <div className="device-rows">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong
            className={
              ["ONLINE", "READY", "ACTIVE", "Strong"].includes(value)
                ? "safe-text"
                : value === "OFFLINE"
                ? "danger-text"
                : ""
            }
          >
            {value}
          </strong>
        </div>
      ))}
    </div>
  );
}

function ReportMetric({ title, value, subtitle }) {
  return (
    <div className="report-metric panel">
      <small>{title}</small>
      <strong>{value}</strong>
      <span>{subtitle}</span>
    </div>
  );
}

function SettingsCard({ title, icon, rows }) {
  return (
    <section className="panel settings-card">
      <div className="settings-heading">
        <div className="settings-icon">
          <Icon name={icon} />
        </div>
        <h3>{title}</h3>
      </div>

      <DeviceRows rows={rows} />
    </section>
  );
}

function HelpCard({ icon, title, text }) {
  return (
    <section className="panel help-card">
      <div className="help-icon">
        <Icon name={icon} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  );
}

/* =========================================================
   ICON SYSTEM
========================================================= */

function Icon({ name }) {
  const icons = {
    mountain: "⌁",
    shield: "◈",
    hardhat: "⌂",
    user: "●",
    lock: "◆",
    arrow: "→",
    menu: "☰",
    grid: "▦",
    drone: "◇",
    camera: "▣",
    upload: "↑",
    brain: "◉",
    history: "◴",
    activity: "⌁",
    report: "▤",
    settings: "⚙",
    help: "?",
    logout: "↪",
    bell: "♢",
    refresh: "↻",
    alert: "!",
    check: "✓",
    target: "◎",
    image: "▧",
    focus: "⊙",
    search: "⌕",
    filter: "☷",
    download: "↓",
    server: "▥",
    monitor: "▤",
  };

  return <span className={`icon icon-${name}`}>{icons[name] || "•"}</span>;
}

export default App;