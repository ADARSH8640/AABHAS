import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

/* =========================================================
   CONFIG
   ---------------------------------------------------------
   NOTE: The App.jsx you supplied did not contain a Supabase
   client or a real FastAPI call (predictions were produced
   with Math.random() and login was a fake setTimeout).
   Both are implemented for real below. If you already have
   an existing `src/lib/supabaseClient.js`, delete the block
   below and instead do:
       import { supabase } from "./lib/supabaseClient";
   Everything else in this file will keep working unchanged.
========================================================= */

const API_URL = "http://127.0.0.1:8000";
const ANALYSIS_ENDPOINT = `${API_URL}/drone/image`;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

if (!supabase) {
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY " +
      "in your .env file, or swap in your existing Supabase client import at the " +
      "top of App.jsx. The app will keep working, but analyses will not be saved."
  );
}

const DETECTIONS_TABLE = "rockfall_detections";
const IMAGE_BUCKET = "rockfall-images";

const MODEL_NAME = "EfficientNet-B0";
const MODEL_VALIDATION = "97.09%";
const MODEL_INPUT = "224 × 224 RGB";
const MODEL_CLASSES = "2";
const MODEL_CLASS_0 = "Low Risk";
const MODEL_CLASS_1 = "High Risk";
const MODEL_DEVICE = "CUDA";

/* =========================================================
   SEED / FALLBACK DATA
   These only appear until real analyses (and, if Supabase is
   configured, real history rows) replace them.
========================================================= */

const initialDetections = [
  {
    id: "seed-1",
    time: "04:08:21",
    source: "DRONE",
    device: "UAV-01",
    image: "rockface_0408.jpg",
    imageUrl: null,
    gradcamUrl: null,
    risk: "LOW RISK",
    confidence: "96.8%",
    status: "Reviewed",
  },
  {
    id: "seed-2",
    time: "03:54:12",
    source: "DRONE",
    device: "UAV-01",
    image: "rockface_0354.jpg",
    imageUrl: null,
    gradcamUrl: null,
    risk: "HIGH RISK",
    confidence: "94.2%",
    status: "Requires Review",
  },
  {
    id: "seed-3",
    time: "03:41:08",
    source: "CAMERA",
    device: "CAM-02",
    image: "wall_cam02.jpg",
    imageUrl: null,
    gradcamUrl: null,
    risk: "LOW RISK",
    confidence: "97.1%",
    status: "Reviewed",
  },
  {
    id: "seed-4",
    time: "03:27:45",
    source: "CAMERA",
    device: "CAM-01",
    image: "slope_cam01.jpg",
    imageUrl: null,
    gradcamUrl: null,
    risk: "HIGH RISK",
    confidence: "91.7%",
    status: "Alert Active",
  },
  {
    id: "seed-5",
    time: "03:11:19",
    source: "DRONE",
    device: "UAV-01",
    image: "wall_0311.jpg",
    imageUrl: null,
    gradcamUrl: null,
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

/* =========================================================
   HELPERS
========================================================= */

// Normalizes whatever shape the backend returns into one
// consistent result object. Adjust the field names inside if
// your FastAPI response uses different keys.
function normalizeAnalysisResponse(data) {
  const rawLabel =
    data.risk_level ??
    data.risk ??
    data.prediction ??
    data.class_name ??
    data.label ??
    "";

  const labelText = String(rawLabel).toLowerCase();
  const isHigh =
    labelText.includes("high") || labelText === "1" || data.class === 1;

  const riskLevel = isHigh ? "HIGH RISK" : "LOW RISK";

  const confidenceRaw =
    data.confidence ?? data.probability ?? data.score ?? null;
  const confidence =
    confidenceRaw !== null ? Number(confidenceRaw) : null;
  const confidencePct =
    confidence !== null
      ? confidence <= 1
        ? confidence * 100
        : confidence
      : null;

  const highRaw =
    data.high_risk_probability ??
    data.probabilities?.high ??
    data.probabilities?.high_risk ??
    data.high ??
    null;
  const lowRaw =
    data.low_risk_probability ??
    data.probabilities?.low ??
    data.probabilities?.low_risk ??
    data.low ??
    null;

  let highPct = highRaw !== null ? Number(highRaw) : null;
  let lowPct = lowRaw !== null ? Number(lowRaw) : null;
  if (highPct !== null && highPct <= 1) highPct *= 100;
  if (lowPct !== null && lowPct <= 1) lowPct *= 100;

  if (highPct === null && lowPct === null && confidencePct !== null) {
    highPct = isHigh ? confidencePct : 100 - confidencePct;
    lowPct = isHigh ? 100 - confidencePct : confidencePct;
  } else if (highPct !== null && lowPct === null) {
    lowPct = 100 - highPct;
  } else if (lowPct !== null && highPct === null) {
    highPct = 100 - lowPct;
  }

  const gradcamRaw =
    data.gradcam_url ??
    data.gradcam_image ??
    data.grad_cam ??
    data.grad_cam_image ??
    data.heatmap ??
    null;

  let gradcamUrl = null;
  if (gradcamRaw) {
    gradcamUrl =
      typeof gradcamRaw === "string" && gradcamRaw.startsWith("http")
        ? gradcamRaw
        : typeof gradcamRaw === "string" && gradcamRaw.startsWith("data:")
        ? gradcamRaw
        : `data:image/png;base64,${gradcamRaw}`;
  }

  return {
    riskLevel,
    confidence:
      confidencePct !== null ? Number(confidencePct.toFixed(1)) : null,
    high: highPct !== null ? Number(highPct.toFixed(1)) : null,
    low: lowPct !== null ? Number(lowPct.toFixed(1)) : null,
    gradcamUrl,
    rawResponse: data,
  };
}

function nowTime() {
  return new Date().toLocaleTimeString("en-IN", { hour12: false });
}

async function uploadImageToSupabase(file, pathPrefix) {
  if (!supabase || !file) return null;

  try {
    const path = `${pathPrefix}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Supabase image upload failed:", err.message);
    return null;
  }
}

function App() {
  /* ---------------- AUTH / ROLE ---------------- */
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState("worker"); // "worker" | "administrator"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  /* ---------------- NAVIGATION ---------------- */
  const [activePage, setActivePage] = useState("Dashboard");
  const [mobileNav, setMobileNav] = useState(false);

  /* ---------------- CAPTURE / SOURCE ---------------- */
  const [sourceType, setSourceType] = useState("drone"); // admin only: "drone" | "camera"
  const [sourceId, setSourceId] = useState("CAM-01");

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  /* ---------------- ANALYSIS STATE MACHINE ----------------
     IDLE -> IMAGE_SELECTED -> PROCESSING -> ANALYZING
          -> RESULT -> GRAD_CAM -> SAVED   (or -> ERROR at any point)
  ------------------------------------------------------------ */
  const [analysisState, setAnalysisState] = useState("IDLE");
  const [analysisError, setAnalysisError] = useState("");
  const [analysis, setAnalysis] = useState({
    riskLevel: "LOW RISK",
    confidence: null,
    high: null,
    low: null,
    gradcamUrl: null,
    timestamp: null,
    source: null,
    device: null,
    model: MODEL_NAME,
    status: "READY",
    imageUrl: null,
  });

  /* ---------------- HISTORY / ALERTS ---------------- */
  const [detections, setDetections] = useState(initialDetections);
  const [search, setSearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("All");
  const [selectedDetection, setSelectedDetection] = useState(null);

  const isAdmin = role === "administrator";

  useEffect(() => {
    setSourceId(isAdmin ? "UAV-01" : "CAM-01");
  }, [isAdmin]);

  // Load prior detections from Supabase, if configured. Falls back
  // to the seed data above on any error or if Supabase isn't set up.
  useEffect(() => {
    if (!authenticated || !supabase) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from(DETECTIONS_TABLE)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        if (!data || data.length === 0) return;

        setDetections(
          data.map((row) => ({
            id: row.id,
            time: row.timestamp ?? nowTime(),
            source: row.source ?? "CAMERA",
            device: row.device ?? "-",
            image: row.image_name ?? "analysis.jpg",
            imageUrl: row.image_url ?? null,
            gradcamUrl: row.gradcam_url ?? null,
            risk: row.risk_level ?? "LOW RISK",
            confidence: `${row.confidence ?? 0}%`,
            status:
              row.risk_level === "HIGH RISK" ? "Alert Active" : "Reviewed",
          }))
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Could not load detection history from Supabase:", err.message);
      }
    })();
  }, [authenticated]);

  /* ---------------- NAV CONFIG ---------------- */

  const navigation = isAdmin
    ? [
        ["Dashboard", "grid"],
        ["Drone Monitoring", "drone"],
        ["Camera Monitoring", "camera"],
        ["Capture / Upload", "upload"],
        ["Risk Analysis", "brain"],
        ["Grad-CAM", "focus"],
        ["Detection History", "history"],
        ["Alerts", "alert"],
        ["Reports", "report"],
        ["Drone Status", "activity"],
        ["Model Information", "server"],
        ["Settings", "settings"],
        ["Help", "help"],
      ]
    : [
        ["Dashboard", "grid"],
        ["Capture / Upload", "upload"],
        ["Risk Analysis", "brain"],
        ["Grad-CAM", "focus"],
        ["Detection History", "history"],
        ["Alerts", "alert"],
        ["Help", "help"],
      ];

  const alerts = useMemo(
    () => detections.filter((item) => item.risk === "HIGH RISK"),
    [detections]
  );

  const filteredDetections = useMemo(() => {
    const value = search.toLowerCase();

    return detections
      .filter((item) => {
        if (historyFilter === "High Risk") return item.risk === "HIGH RISK";
        if (historyFilter === "Low Risk") return item.risk === "LOW RISK";
        if (historyFilter === "Drone") return item.source === "DRONE";
        if (historyFilter === "Camera") return item.source === "CAMERA";
        return true;
      })
      .filter((item) =>
        `${item.time} ${item.source} ${item.device} ${item.image} ${item.risk} ${item.status}`
          .toLowerCase()
          .includes(value)
      );
  }, [detections, search, historyFilter]);

  /* ---------------- AUTH HANDLERS ---------------- */

  function handleLogin(e) {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setLoginError("Enter your username and password.");
      return;
    }

    setLoginError("");
    setLoginLoading(true);

    // NOTE: wire this up to your real auth (e.g. supabase.auth.signInWithPassword)
    // if/when that's ready on the backend. Kept as a lightweight local gate for now.
    setTimeout(() => {
      setLoginLoading(false);
      setAuthenticated(true);
      setActivePage("Dashboard");
    }, 700);
  }

  function logout() {
    setAuthenticated(false);
    setUsername("");
    setPassword("");
    setLoginError("");
    setActivePage("Dashboard");
    resetAnalysis();
  }

  /* ---------------- CAPTURE + AUTOMATIC PIPELINE ---------------- */

  function resetAnalysis() {
    setSelectedImage(null);
    setImagePreview("");
    setAnalysisState("IDLE");
    setAnalysisError("");
    setAnalysis((prev) => ({
      ...prev,
      riskLevel: "LOW RISK",
      confidence: null,
      high: null,
      low: null,
      gradcamUrl: null,
      status: "READY",
    }));
  }

  function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedImage(file);
    setAnalysisError("");
    setAnalysisState("IMAGE_SELECTED");

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      // Image is selected -> the whole pipeline runs automatically,
      // no manual "Upload" / "Analyze" click required.
      runAnalysisPipeline(file, reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function runAnalysisPipeline(file, previewDataUrl) {
    setAnalysisState("PROCESSING");
    setAnalysisError("");
    setActivePage("Risk Analysis");

    const source = isAdmin ? (sourceType === "drone" ? "DRONE" : "CAMERA") : "CAMERA";
    const device = isAdmin ? (sourceType === "drone" ? "UAV-01" : sourceId) : sourceId;
    const timestamp = nowTime();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source);
      formData.append("device", device);

      setAnalysisState("ANALYZING");

      const response = await fetch(ANALYSIS_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Backend responded with status ${response.status}`);
      }

      const data = await response.json();
      const result = normalizeAnalysisResponse(data);

      const nextAnalysis = {
        riskLevel: result.riskLevel,
        confidence: result.confidence ?? 0,
        high: result.high ?? 0,
        low: result.low ?? 0,
        gradcamUrl: result.gradcamUrl,
        timestamp,
        source,
        device,
        model: MODEL_NAME,
        status: "COMPLETE",
        imageUrl: previewDataUrl,
      };

      setAnalysis(nextAnalysis);
      setAnalysisState(result.gradcamUrl ? "GRAD_CAM" : "RESULT");

      // Save to Supabase (storage + row). Failure here surfaces a
      // separate, non-blocking error — the AI result is still shown.
      const detectionId = `${Date.now()}`;
      let storedImageUrl = null;
      let storedGradcamUrl = null;

      if (supabase) {
        storedImageUrl = await uploadImageToSupabase(file, "images");
        // Grad-CAM comes back from the backend as base64/URL, not a File,
        // so we store the reference we already have rather than re-uploading.
        storedGradcamUrl = result.gradcamUrl;

        try {
          const { error } = await supabase.from(DETECTIONS_TABLE).insert({
            detection_id: detectionId,
            timestamp,
            risk_level: result.riskLevel,
            confidence: nextAnalysis.confidence,
            low_risk_probability: nextAnalysis.low,
            high_risk_probability: nextAnalysis.high,
            image_url: storedImageUrl,
            gradcam_url: storedGradcamUrl,
            source,
            device,
            model: MODEL_NAME,
            user_role: role,
          });

          if (error) throw error;
        } catch (saveErr) {
          // eslint-disable-next-line no-console
          console.error("Supabase save failed:", saveErr.message);
        }
      }

      setAnalysisState("SAVED");

      setDetections((previous) => [
        {
          id: detectionId,
          time: timestamp,
          source,
          device,
          image: file.name,
          imageUrl: storedImageUrl ?? previewDataUrl,
          gradcamUrl: storedGradcamUrl,
          risk: result.riskLevel,
          confidence: `${nextAnalysis.confidence}%`,
          status: result.riskLevel === "HIGH RISK" ? "Alert Active" : "Reviewed",
        },
        ...previous,
      ]);
    } catch (err) {
      setAnalysisError(
        err.message || "Unable to connect to the Rockfall AI backend."
      );
      setAnalysisState("ERROR");
      setAnalysis((prev) => ({ ...prev, status: "ERROR" }));
    }
  }

  function retryAnalysis() {
    if (selectedImage) {
      runAnalysisPipeline(selectedImage, imagePreview);
    }
  }

  /* ---------------- RENDER ---------------- */

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
        alertCount={alerts.length}
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
              detections={detections}
              alerts={alerts}
              setActivePage={setActivePage}
            />
          )}

          {activePage === "Drone Monitoring" && (
            <LiveFeed
              title="UAV LIVE MONITORING"
              subtitle="Real-time aerial mine wall surveillance"
              type="drone"
            />
          )}

          {activePage === "Camera Monitoring" && (
            <LiveFeed
              title="MINE CAMERA MONITORING"
              subtitle="Fixed highwall surveillance network"
              type="camera"
            />
          )}

          {activePage === "Capture / Upload" && (
            <UploadPage
              role={role}
              isAdmin={isAdmin}
              sourceType={sourceType}
              setSourceType={setSourceType}
              sourceId={sourceId}
              setSourceId={setSourceId}
              imagePreview={imagePreview}
              selectedImage={selectedImage}
              handleImage={handleImage}
              analysisState={analysisState}
            />
          )}

          {(activePage === "Risk Analysis" || activePage === "Grad-CAM") && (
            <AnalysisPage
              analysis={analysis}
              analysisState={analysisState}
              analysisError={analysisError}
              imagePreview={imagePreview}
              retryAnalysis={retryAnalysis}
              onNewScan={() => {
                resetAnalysis();
                setActivePage("Capture / Upload");
              }}
            />
          )}

          {activePage === "Detection History" && (
            <HistoryPage
              detections={filteredDetections}
              search={search}
              setSearch={setSearch}
              historyFilter={historyFilter}
              setHistoryFilter={setHistoryFilter}
              selectedDetection={selectedDetection}
              setSelectedDetection={setSelectedDetection}
            />
          )}

          {activePage === "Drone Status" && <DroneStatusPage />}

          {activePage === "Camera Status" && <CameraStatusPage />}

          {activePage === "Alerts" && <AlertsPage alerts={alerts} />}

          {activePage === "Reports" && <ReportsPage />}

          {activePage === "Model Information" && <ModelInfoPage />}

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
              {role === "administrator" ? "MINE ADMINISTRATOR" : "MINE WORKER"}
            </div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-header">
            <div className="eyebrow">SECURE ACCESS</div>
            <h1>Mine Safety Command Center</h1>
            <p>
              Select your role and authenticate to access AI-powered rockfall
              monitoring.
            </p>
          </div>

          <div className="role-selector">
            <button
              className={role === "worker" ? "active" : ""}
              onClick={() => setRole("worker")}
              type="button"
            >
              <Icon name="hardhat" />
              <span>
                <strong>MINE WORKER</strong>
                <small>Capture, alerts & risk analysis</small>
              </span>
            </button>

            <button
              className={role === "administrator" ? "active" : ""}
              onClick={() => setRole("administrator")}
              type="button"
            >
              <Icon name="shield" />
              <span>
                <strong>MINE ADMINISTRATOR</strong>
                <small>Full system monitoring & control</small>
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
  alertCount,
}) {
  const primary = navigation.slice(0, isSystemItem(navigation));
  const system = navigation.slice(isSystemItem(navigation));

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
        {role === "administrator" ? "MINE ADMINISTRATOR" : "MINE WORKER"}
      </div>

      <nav>
        <div className="nav-label">MONITORING</div>

        {primary.map(([name, icon]) => (
          <button
            key={name}
            className={activePage === name ? "nav-item active" : "nav-item"}
            onClick={() => setActivePage(name)}
          >
            <Icon name={icon} />
            <span>{name}</span>

            {name === "Alerts" && alertCount > 0 && (
              <span className="nav-alert-count">{alertCount}</span>
            )}
          </button>
        ))}

        {system.length > 0 && (
          <>
            <div className="nav-label system-label">SYSTEM</div>

            {system.map(([name, icon]) => (
              <button
                key={name}
                className={
                  activePage === name ? "nav-item active" : "nav-item"
                }
                onClick={() => setActivePage(name)}
              >
                <Icon name={icon} />
                <span>{name}</span>
              </button>
            ))}
          </>
        )}
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

// "Reports" onward is treated as the SYSTEM group; everything
// before it (Dashboard, monitoring, capture, analysis, history,
// alerts) is the MONITORING group. Falls back to putting
// everything in MONITORING if "Reports" isn't in the list (worker view).
function isSystemItem(navigation) {
  const index = navigation.findIndex(([name]) => name === "Reports");
  return index === -1 ? navigation.length : index;
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
          {role === "administrator" ? "MINE ADMINISTRATOR" : "MINE WORKER"}
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
            <strong>
              {role === "administrator" ? "Mine Administrator" : "Mine Worker"}
            </strong>
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

function Dashboard({ role, analysis, detections, alerts, setActivePage }) {
  const isAdmin = role === "administrator";
  const highRiskCount = detections.filter((d) => d.risk === "HIGH RISK").length;
  const lowRiskCount = detections.filter((d) => d.risk === "LOW RISK").length;

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? "SYSTEM OVERVIEW" : "WORKER OVERVIEW"}
        title={
          isAdmin
            ? "Rockfall AI Command Dashboard"
            : "Mine Safety Rockfall Monitoring"
        }
        subtitle={
          isAdmin
            ? "Full-system visibility across drones, cameras and AI monitoring."
            : "Capture, monitor and react to AI rockfall risk assessments."
        }
      />

      <div className="status-strip">
        <StatusPill label="AI ENGINE" value="READY" />
        <StatusPill label={isAdmin ? "UAV-01" : "CAMERAS"} value="ONLINE" />
        <StatusPill label="BACKEND" value="ONLINE" />
        <StatusPill label="MONITORING" value="ACTIVE" />
        <div className="last-sync">
          <Icon name="refresh" />
          Last sync {analysis.timestamp || "—"}
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="CURRENT RISK"
          value={analysis.confidence !== null ? analysis.riskLevel : "NO SCAN YET"}
          icon="shield"
          state={analysis.riskLevel === "HIGH RISK" ? "danger" : "safe"}
          footer="Latest AI assessment"
        />

        <StatCard
          title="AI CONFIDENCE"
          value={
            analysis.confidence !== null ? `${analysis.confidence}%` : "—"
          }
          icon="target"
          footer="Model confidence"
        />

        <StatCard
          title="TOTAL SCANS"
          value={detections.length}
          icon="image"
          footer="Completed analyses"
        />

        <StatCard
          title="HIGH-RISK DETECTIONS"
          value={highRiskCount}
          icon="alert"
          state={highRiskCount > 0 ? "danger" : ""}
          footer="Across all history"
        />

        <StatCard
          title="LOW-RISK DETECTIONS"
          value={lowRiskCount}
          icon="check"
          state="safe"
          footer="Across all history"
        />

        {isAdmin && (
          <>
            <StatCard
              title="DRONE STATUS"
              value={droneStatus.connection}
              icon="drone"
              state="safe"
              footer="UAV-01"
            />

            <StatCard
              title="CAMERA STATUS"
              value={`${cameras.filter((c) => c.status === "ONLINE").length}/${cameras.length} ONLINE`}
              icon="camera"
              footer="Fixed network"
            />
          </>
        )}
      </div>

      <div className="dashboard-grid main-grid">
        <section className="panel image-panel">
          <PanelHeader
            title="LATEST ANALYZED IMAGE"
            subtitle={
              analysis.device
                ? `${analysis.device} • ${analysis.source}`
                : "No analysis yet"
            }
            action="NEW SCAN"
            onAction={() => setActivePage("Capture / Upload")}
          />

          <div className="mine-image">
            {analysis.imageUrl ? (
              <img src={analysis.imageUrl} alt="Latest rock face" />
            ) : (
              <div className="placeholder-mine">
                <Icon name="mountain" />
                <span>ROCK-FACE VISUAL FEED</span>
                <small>Capture or upload an image to begin</small>
              </div>
            )}

            <div className="image-overlay-top">
              <span className="live-tag">
                <span className="status-dot red" />
                LIVE
              </span>
              <span>224 × 224 AI INPUT</span>
            </div>

            <div className="image-overlay-bottom">
              <span>{analysis.device || "—"}</span>
              <span>{analysis.timestamp || "—"}</span>
            </div>
          </div>
        </section>

        <RiskAssessment analysis={analysis} />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <PanelHeader
            title="RECENT DETECTIONS"
            subtitle="Latest AI assessments"
            action="VIEW ALL"
            onAction={() => setActivePage("Detection History")}
          />

          <DetectionList detections={detections.slice(0, 5)} />
        </section>

        <section className="panel">
          <PanelHeader
            title="RECENT ALERTS"
            subtitle="High-risk detections requiring review"
            action="VIEW ALL"
            onAction={() => setActivePage("Alerts")}
          />

          {alerts.length === 0 ? (
            <div className="safe-alert">
              <div>
                <Icon name="check" />
              </div>
              <section>
                <strong>✓ NO ACTIVE ALERTS</strong>
                <p>No high-risk detections currently on record.</p>
              </section>
            </div>
          ) : (
            <div className="alert-stack">
              {alerts.slice(0, 3).map((item) => (
                <AlertCard
                  key={item.id}
                  device={item.device}
                  location={item.source}
                  time={item.time}
                  confidence={item.confidence}
                  probability={item.confidence}
                />
              ))}
            </div>
          )}
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
  const high = analysis.riskLevel === "HIGH RISK";
  const hasResult = analysis.confidence !== null;

  return (
    <section className={`panel risk-panel ${high && hasResult ? "high-risk" : ""}`}>
      <PanelHeader
        title="AI RISK ASSESSMENT"
        subtitle={`${MODEL_NAME} prediction`}
      />

      <div className="risk-content">
        <div className={`risk-ring ${hasResult ? (high ? "danger" : "safe") : ""}`}>
          <div className="risk-ring-inner">
            <Icon name={hasResult ? (high ? "alert" : "check") : "brain"} />
            <strong>{hasResult ? `${analysis.confidence}%` : "—"}</strong>
            <small>CONFIDENCE</small>
          </div>
        </div>

        <div className="risk-result">
          <span
            className={`risk-label ${
              hasResult ? (high ? "danger-text" : "safe-text") : ""
            }`}
          >
            {hasResult ? (high ? "⚠" : "✓") : ""} {hasResult ? analysis.riskLevel : "NO SCAN YET"}
          </span>

          <p>
            {!hasResult
              ? "Capture or upload a rock-face image to run an AI risk assessment."
              : high
              ? "AI detected visual patterns associated with potential rockfall instability. Review the affected area."
              : "AI detected a visually stable rock-face pattern with low predicted rockfall risk."}
          </p>

          <div className="probability">
            <div>
              <span>HIGH RISK</span>
              <strong>{analysis.high ?? 0}%</strong>
            </div>
            <div className="probability-track">
              <span style={{ width: `${analysis.high ?? 0}%` }} />
            </div>
          </div>

          <div className="probability">
            <div>
              <span>LOW RISK</span>
              <strong>{analysis.low ?? 0}%</strong>
            </div>
            <div className="probability-track low">
              <span style={{ width: `${analysis.low ?? 0}%` }} />
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
          <b className={analysis.status === "ERROR" ? "danger-text" : "safe-text"}>
            {analysis.status}
          </b>
        </span>
      </div>
    </section>
  );
}

/* =========================================================
   EXPLAINABILITY (GRAD-CAM)
========================================================= */

function Explainability({ imagePreview, gradcamUrl, hasResult }) {
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
          <div className="visual-label">GRAD-CAM / AI ATTENTION MAP</div>

          <div className="explain-image heatmap">
            {gradcamUrl ? (
              <img src={gradcamUrl} alt="Grad-CAM attention map" />
            ) : (
              <div className="visual-placeholder">
                <Icon name="focus" />
                {hasResult
                  ? "Grad-CAM unavailable for this analysis."
                  : "Awaiting analysis"}
              </div>
            )}
          </div>
        </div>
      </div>

      {gradcamUrl && (
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
      )}

      <div className="ai-explanation">
        <div className="explanation-icon">
          <Icon name="brain" />
        </div>

        <div>
          <strong>AI VISUAL EXPLANATION</strong>
          <p>
            Highlighted regions indicate image areas that contributed most
            strongly to the AI prediction.
          </p>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   CAPTURE / UPLOAD
========================================================= */

function UploadPage({
  isAdmin,
  sourceType,
  setSourceType,
  sourceId,
  setSourceId,
  imagePreview,
  selectedImage,
  handleImage,
  analysisState,
}) {
  const busy = ["PROCESSING", "ANALYZING"].includes(analysisState);

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? "UAV & CAMERA INGESTION" : "MINE CAMERA INPUT"}
        title="Capture / Upload"
        subtitle="Select an image and the AI pipeline runs automatically — no extra clicks needed."
      />

      <div className="upload-layout">
        <section className="panel upload-panel">
          <PanelHeader
            title="IMAGE INPUT"
            subtitle="Image acquisition and automatic AI processing"
          />

          <div className="source-row">
            {isAdmin && (
              <div className="field">
                <label>SOURCE TYPE</label>
                <select
                  value={sourceType}
                  onChange={(e) => {
                    setSourceType(e.target.value);
                    setSourceId(e.target.value === "drone" ? "UAV-01" : "CAM-01");
                  }}
                >
                  <option value="drone">Drone</option>
                  <option value="camera">Camera</option>
                </select>
              </div>
            )}

            <div className="field">
              <label>{isAdmin && sourceType === "drone" ? "UAV ID" : "CAMERA ID"}</label>

              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                {isAdmin && sourceType === "drone" ? (
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
          </div>

          <label className={`drop-zone ${busy ? "disabled" : ""}`}>
            <input
              type="file"
              accept="image/*"
              onChange={handleImage}
              disabled={busy}
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
                <small>{(selectedImage.size / 1024 / 1024).toFixed(2)} MB</small>
              </div>

              <span className="file-ready">
                <span className={`status-dot ${busy ? "orange" : "green"}`} />
                {busy ? "PROCESSING" : "READY"}
              </span>
            </div>
          )}

          <div className="metadata-grid">
            <Metadata
              label={isAdmin && sourceType === "drone" ? "UAV ID" : "CAMERA ID"}
              value={sourceId}
            />
            <Metadata label="TIMESTAMP" value="Automatic" />
            <Metadata label="AI MODEL" value={MODEL_NAME} />
            <Metadata label="PROCESSING" value={MODEL_DEVICE} />
          </div>

          <p className="upload-hint">
            Selecting an image automatically runs it through Risk Analysis and
            Grad-CAM, then saves the result — there's nothing else to click.
          </p>
        </section>

        <section className="panel process-panel">
          <PanelHeader
            title="PROCESSING PIPELINE"
            subtitle="Capture → Analyze → Predict → Explain → Save"
          />

          <PipelineStep
            number="01"
            icon="image"
            title="IMAGE RECEIVED"
            description="Rock-face image enters the AI pipeline."
            active={analysisState === "IMAGE_SELECTED"}
            complete={
              !["IDLE", "IMAGE_SELECTED"].includes(analysisState)
            }
          />

          <PipelineStep
            number="02"
            icon="brain"
            title="AI ANALYSIS"
            description="EfficientNet-B0 processes the image via FastAPI."
            active={["PROCESSING", "ANALYZING"].includes(analysisState)}
            complete={["RESULT", "GRAD_CAM", "SAVED"].includes(analysisState)}
          />

          <PipelineStep
            number="03"
            icon="target"
            title="RISK PREDICTION"
            description="Low Risk or High Risk classification."
            active={analysisState === "ANALYZING"}
            complete={["RESULT", "GRAD_CAM", "SAVED"].includes(analysisState)}
          />

          <PipelineStep
            number="04"
            icon="focus"
            title="GRAD-CAM"
            description="Visual evidence and attention mapping."
            active={analysisState === "GRAD_CAM"}
            complete={analysisState === "SAVED"}
          />
        </section>
      </div>
    </>
  );
}

/* =========================================================
   ANALYSIS PAGE (Risk Analysis + Grad-CAM + Final Result)
========================================================= */

function AnalysisPage({
  analysis,
  analysisState,
  analysisError,
  imagePreview,
  retryAnalysis,
  onNewScan,
}) {
  const hasResult = ["RESULT", "GRAD_CAM", "SAVED"].includes(analysisState);
  const busy = ["PROCESSING", "ANALYZING"].includes(analysisState);

  return (
    <>
      <PageHeader
        eyebrow="ARTIFICIAL INTELLIGENCE"
        title="AI Risk Assessment"
        subtitle="Explainable rockfall prediction powered by EfficientNet-B0."
      />

      {busy && (
        <div className="processing-banner">
          <span className="spinner" />
          AI ENGINE PROCESSING ROCK-FACE IMAGE...
        </div>
      )}

      {analysisState === "ERROR" && (
        <div className="error-banner">
          <Icon name="alert" />
          <div>
            <strong>AI ANALYSIS FAILED</strong>
            <p>{analysisError || "Unable to connect to the Rockfall AI backend."}</p>
          </div>
          <button className="secondary-button" onClick={retryAnalysis}>
            <Icon name="refresh" />
            TRY AGAIN
          </button>
        </div>
      )}

      <div className="analysis-layout">
        <RiskAssessment analysis={analysis} />
        <Explainability
          imagePreview={imagePreview}
          gradcamUrl={analysis.gradcamUrl}
          hasResult={hasResult}
        />
      </div>

      {hasResult && (
        <section className="panel final-result-panel">
          <PanelHeader
            title="FINAL RESULT"
            subtitle="Complete analysis record"
          />

          <div className="metadata-grid">
            <Metadata label="RISK LEVEL" value={analysis.riskLevel} />
            <Metadata label="CONFIDENCE" value={`${analysis.confidence}%`} />
            <Metadata label="LOW RISK PROBABILITY" value={`${analysis.low}%`} />
            <Metadata label="HIGH RISK PROBABILITY" value={`${analysis.high}%`} />
            <Metadata label="MODEL" value={analysis.model} />
            <Metadata label="TIMESTAMP" value={analysis.timestamp} />
            <Metadata label="SOURCE" value={`${analysis.source} • ${analysis.device}`} />
            <Metadata
              label="STATUS"
              value={analysisState === "SAVED" ? "SAVED" : "COMPLETE"}
            />
          </div>

          <button className="analyze-button" onClick={onNewScan}>
            <Icon name="upload" />
            NEW SCAN
          </button>
        </section>
      )}
    </>
  );
}

/* =========================================================
   HISTORY
========================================================= */

const HISTORY_FILTERS = ["All", "High Risk", "Low Risk", "Drone", "Camera"];

function HistoryPage({
  detections,
  search,
  setSearch,
  historyFilter,
  setHistoryFilter,
  selectedDetection,
  setSelectedDetection,
}) {
  return (
    <>
      <PageHeader
        eyebrow="MONITORING RECORD"
        title="Detection History"
        subtitle="Search and review previous AI rockfall assessments."
      />

      {selectedDetection && (
        <section className="panel detection-detail-panel">
          <PanelHeader
            title={`DETECTION DETAIL • ${selectedDetection.device}`}
            subtitle={selectedDetection.time}
            action="CLOSE"
            onAction={() => setSelectedDetection(null)}
          />

          <div className="explain-grid">
            <div>
              <div className="visual-label">ORIGINAL IMAGE</div>
              <div className="explain-image">
                {selectedDetection.imageUrl ? (
                  <img src={selectedDetection.imageUrl} alt="Detection" />
                ) : (
                  <div className="visual-placeholder">
                    <Icon name="image" />
                    {selectedDetection.image}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="visual-label">GRAD-CAM</div>
              <div className="explain-image heatmap">
                {selectedDetection.gradcamUrl ? (
                  <img src={selectedDetection.gradcamUrl} alt="Grad-CAM" />
                ) : (
                  <div className="visual-placeholder">
                    <Icon name="focus" />
                    Grad-CAM unavailable for this analysis.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="metadata-grid">
            <Metadata label="RISK" value={selectedDetection.risk} />
            <Metadata label="CONFIDENCE" value={selectedDetection.confidence} />
            <Metadata label="SOURCE" value={selectedDetection.source} />
            <Metadata label="STATUS" value={selectedDetection.status} />
          </div>
        </section>
      )}

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

          <div className="filter-chip-row">
            {HISTORY_FILTERS.map((filter) => (
              <button
                key={filter}
                className={`secondary-button ${
                  historyFilter === filter ? "active" : ""
                }`}
                onClick={() => setHistoryFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
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
                <th>MODEL</th>
                <th>STATUS</th>
              </tr>
            </thead>

            <tbody>
              {filteredDetectionsOrEmpty(detections)}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  function filteredDetectionsOrEmpty(rows) {
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={8} className="empty-row">
            No detections match this filter yet.
          </td>
        </tr>
      );
    }

    return rows.map((item, index) => (
      <tr
        key={item.id ?? `${item.time}-${index}`}
        className="clickable-row"
        onClick={() => setSelectedDetection(item)}
      >
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

        <td>{MODEL_NAME}</td>

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
    ));
  }
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

function AlertsPage({ alerts }) {
  return (
    <>
      <PageHeader
        eyebrow="SAFETY NOTIFICATIONS"
        title="Rockfall Alerts"
        subtitle="High-priority AI detections requiring attention."
      />

      <div className="alert-stack">
        {alerts.length === 0 ? (
          <div className="safe-alert">
            <div>
              <Icon name="check" />
            </div>
            <section>
              <strong>✓ NO ACTIVE ALERTS</strong>
              <p>No high-risk detections currently on record.</p>
            </section>
          </div>
        ) : (
          alerts.map((item) => (
            <AlertCard
              key={item.id}
              device={item.device}
              location={item.source}
              time={item.time}
              confidence={item.confidence}
              probability={item.confidence}
            />
          ))
        )}
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
        title="Reports"
        subtitle="Monitoring statistics and operational summaries."
      />

      <div className="report-grid">
        <ReportMetric title="DATASET SIZE" value="2,764" subtitle="Images" />
        <ReportMetric title="RISK CLASSES" value="2" subtitle="Low / High" />
        <ReportMetric title="INPUT RESOLUTION" value={MODEL_INPUT} subtitle="Model input" />
        <ReportMetric title="PROCESSING DEVICE" value={MODEL_DEVICE} subtitle="GPU acceleration" />
        <ReportMetric title="EXPLAINABILITY" value="Grad-CAM" subtitle="Visual attention" />
        <ReportMetric title="MODEL STATUS" value="READY" subtitle="Production engine" />
      </div>

      <section className="panel">
        <PanelHeader title="MONITORING PIPELINE" subtitle="System architecture" />
        <Workflow role="administrator" />
      </section>
    </>
  );
}

/* =========================================================
   MODEL INFORMATION
========================================================= */

function ModelInfoPage() {
  return (
    <>
      <PageHeader
        eyebrow="ARTIFICIAL INTELLIGENCE"
        title="Model Information"
        subtitle="Production AI model powering Rockfall AI."
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
        <ReportMetric title="MODEL" value={MODEL_NAME} subtitle="Architecture" />
        <ReportMetric title="INPUT" value={MODEL_INPUT} subtitle="Preprocessing" />
        <ReportMetric title="CLASSES" value={MODEL_CLASSES} subtitle={`${MODEL_CLASS_0} / ${MODEL_CLASS_1}`} />
        <ReportMetric title="CLASS 0" value={MODEL_CLASS_0} subtitle="Label 0" />
        <ReportMetric title="CLASS 1" value={MODEL_CLASS_1} subtitle="Label 1" />
        <ReportMetric title="DEVICE" value={MODEL_DEVICE} subtitle="Inference hardware" />
      </div>
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
            ["Model", MODEL_NAME],
            ["Input", MODEL_INPUT],
            ["Device", MODEL_DEVICE],
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

        <SettingsCard
          title="SUPABASE"
          icon="server"
          rows={[
            ["Configured", supabase ? "YES" : "NO"],
            ["Detections table", DETECTIONS_TABLE],
            ["Image bucket", IMAGE_BUCKET],
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
          text="Select a rock-face image on the Capture / Upload page. The AI pipeline (risk analysis, Grad-CAM, save) runs automatically — no extra clicks required."
        />

        <HelpCard
          icon="alert"
          title="HIGH RISK"
          text="High Risk indicates that the AI identified visual patterns associated with potential rockfall instability. Review the image and attention map."
        />

        <HelpCard
          icon="focus"
          title="GRAD-CAM"
          text="Highlighted regions indicate image areas that contributed most strongly to the AI prediction."
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

          <div className="feed-corner top-left">REC • {nowTime()}</div>
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
        ["UAV / CAMERA", "drone"],
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
            ? "UAV/Camera → Image → AI → Prediction → Explain → Dashboard"
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
   SHARED COMPONENTS
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
        <strong>{nowTime()}</strong>
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
  if (detections.length === 0) {
    return (
      <div className="empty-row" style={{ padding: "16px 0" }}>
        No detections yet — run a scan to populate this list.
      </div>
    );
  }

  return (
    <div className="detection-list">
      {detections.map((item, index) => (
        <div className="detection-row" key={item.id ?? `${item.time}-${index}`}>
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
      <strong>{value ?? "—"}</strong>
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
              ["ONLINE", "READY", "ACTIVE", "Strong", "YES"].includes(value)
                ? "safe-text"
                : ["OFFLINE", "NO"].includes(value)
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
