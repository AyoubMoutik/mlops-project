const pptxgen = require("pptxgenjs");
const sizeOf = require("image-size");
const path = require("path");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Ayoub Moutik";
pptx.company = "BDIO / ENSAM";
pptx.subject = "MLOps Exam Project";
pptx.title = "End-to-End MLOps Workflow";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Trebuchet MS",
  bodyFontFace: "Calibri",
  lang: "en-US",
};
pptx.defineLayout({ name: "CUSTOM_WIDE", width: 13.333, height: 7.5 });
pptx.layout = "CUSTOM_WIDE";

const W = 13.333;
const H = 7.5;
const C = {
  ink: "222831",
  body: "4B5563",
  muted: "7C8797",
  line: "E6E9EF",
  soft: "F7F8FC",
  white: "FFFFFF",
  purple: "7465F3",
  pink: "EC5BB8",
  orange: "F59E0B",
  yellow: "F8D53D",
  green: "70B957",
  teal: "0EA5A6",
  red: "EF6351",
};
const partColors = [C.purple, C.pink, C.orange, C.yellow, C.green];
const figDir = path.join(__dirname, "figures");
const logoDir = path.join(__dirname, "logos");

function shadow(opacity = 0.14, blur = 2, offset = 1) {
  return { type: "outer", color: "000000", opacity, blur, angle: 45, offset };
}

function slide() {
  const s = pptx.addSlide();
  s.background = { color: C.white };
  return s;
}

function addTopStripe(s, active = -1) {
  const x0 = 9.58;
  const y = 0.13;
  const segW = 0.42;
  partColors.forEach((color, i) => {
    s.addShape(pptx.ShapeType.rect, {
      x: x0 + i * (segW + 0.03),
      y,
      w: segW,
      h: active === i ? 0.075 : 0.055,
      fill: { color },
      line: { color },
    });
  });
}

function addFooter(s, n) {
  s.addText("MLOps Exam Project", {
    x: 0.55,
    y: 7.12,
    w: 2.2,
    h: 0.18,
    fontFace: "Calibri",
    fontSize: 7.5,
    color: "A5ABB6",
    margin: 0,
  });
  s.addText(String(n).padStart(2, "0"), {
    x: 12.4,
    y: 7.03,
    w: 0.38,
    h: 0.2,
    fontFace: "Trebuchet MS",
    fontSize: 8,
    bold: true,
    color: "A5ABB6",
    align: "right",
    margin: 0,
  });
}

function addTitle(s, title, subtitle, active = -1) {
  addTopStripe(s, active);
  s.addText(title, {
    x: 0.55,
    y: 0.34,
    w: 8.6,
    h: 0.44,
    fontFace: "Trebuchet MS",
    fontSize: 23,
    bold: true,
    color: C.ink,
    margin: 0,
    fit: "shrink",
  });
  if (subtitle) {
    s.addText(subtitle, {
      x: 0.56,
      y: 0.82,
      w: 8.8,
      h: 0.24,
      fontFace: "Calibri",
      fontSize: 9.5,
      color: C.muted,
      margin: 0,
      fit: "shrink",
    });
  }
}

function card(s, x, y, w, h, opts = {}) {
  s.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: opts.fill || C.white },
    line: { color: opts.line || "EDF0F5", width: opts.lineWidth || 0.7 },
    shadow: opts.shadow === false ? undefined : shadow(opts.opacity || 0.1, 1.5, 0.7),
  });
}

function pill(s, x, y, w, h, color, text, textColor = C.white, fs = 10) {
  s.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color },
    line: { color },
  });
  s.addText(text, {
    x,
    y: y + 0.015,
    w,
    h: h - 0.03,
    fontFace: "Trebuchet MS",
    fontSize: fs,
    bold: true,
    color: textColor,
    align: "center",
    valign: "mid",
    margin: 0,
    fit: "shrink",
  });
}

function circleLabel(s, x, y, d, color, label, fs = 13) {
  s.addShape(pptx.ShapeType.ellipse, {
    x,
    y,
    w: d,
    h: d,
    fill: { color },
    line: { color },
    shadow: shadow(0.11, 1.5, 0.8),
  });
  s.addText(label, {
    x,
    y: y + 0.03,
    w: d,
    h: d - 0.06,
    fontFace: "Trebuchet MS",
    fontSize: fs,
    bold: true,
    color: C.white,
    align: "center",
    valign: "mid",
    margin: 0,
  });
}

function addBullets(s, items, x, y, w, h, color = C.body, fs = 12) {
  s.addText(
    items.map((item, i) => ({
      text: item,
      options: { bullet: true, breakLine: i !== items.length - 1 },
    })),
    {
      x,
      y,
      w,
      h,
      fontFace: "Calibri",
      fontSize: fs,
      color,
      breakLine: false,
      fit: "shrink",
      paraSpaceAfterPt: 4,
      margin: 0.03,
    }
  );
}

function addImageContain(s, file, x, y, w, h) {
  const full = path.join(figDir, file);
  const dim = sizeOf.imageSize(full);
  const ratio = dim.width / dim.height;
  let iw = w;
  let ih = iw / ratio;
  if (ih > h) {
    ih = h;
    iw = ih * ratio;
  }
  s.addImage({ path: full, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih });
}

function diagramFrame(s, file, x, y, w, h, caption) {
  card(s, x, y, w, h, { fill: "FBFCFF", line: "E7EBF2", opacity: 0.12 });
  addImageContain(s, file, x + 0.18, y + 0.2, w - 0.36, h - 0.56);
  if (caption) {
    s.addText(caption, {
      x: x + 0.2,
      y: y + h - 0.28,
      w: w - 0.4,
      h: 0.18,
      fontFace: "Calibri",
      fontSize: 7.5,
      color: C.muted,
      align: "center",
      margin: 0,
      fit: "shrink",
    });
  }
}

function processNode(s, x, y, num, title, text, color, connect = true) {
  if (connect) {
    s.addShape(pptx.ShapeType.line, {
      x: x + 0.72,
      y: y + 0.5,
      w: 1.28,
      h: 0,
      line: { color: "DADFE9", width: 1.4 },
    });
  }
  circleLabel(s, x, y, 0.72, color, num, 12);
  s.addText(title, {
    x: x - 0.26,
    y: y + 0.88,
    w: 1.25,
    h: 0.2,
    fontFace: "Trebuchet MS",
    fontSize: 8.5,
    bold: true,
    color: C.ink,
    align: "center",
    margin: 0,
    fit: "shrink",
  });
  s.addText(text, {
    x: x - 0.32,
    y: y + 1.12,
    w: 1.38,
    h: 0.5,
    fontFace: "Calibri",
    fontSize: 7.4,
    color: C.muted,
    align: "center",
    valign: "mid",
    margin: 0,
    fit: "shrink",
  });
}

// 1. Cover
{
  const s = slide();
  s.background = { color: "F6F2FF" };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: "8B6FF3" }, line: { color: "8B6FF3" } });
  s.addShape(pptx.ShapeType.rect, { x: 6.35, y: 0, w: 6.98, h: H, fill: { color: "ED61B6", transparency: 8 }, line: { color: "ED61B6", transparency: 100 } });
  addTopStripe(s, -1);
  const bdio = path.join(logoDir, "bdiologo.png");
  const ensam = path.join(logoDir, "ensamlogo.png");
  s.addImage({ path: bdio, x: 0.55, y: 0.42, w: 0.52, h: 0.68 });
  s.addImage({ path: ensam, x: 11.65, y: 0.42, w: 1.1, h: 0.42 });
  card(s, 1.36, 2.12, 10.6, 2.05, { fill: C.white, line: C.white, opacity: 0.15 });
  s.addText("END-TO-END", {
    x: 2.05,
    y: 2.55,
    w: 9.2,
    h: 0.28,
    fontFace: "Trebuchet MS",
    fontSize: 12,
    bold: true,
    color: "8B6FF3",
    align: "center",
    margin: 0,
  });
  s.addText("MLOps Workflow", {
    x: 2.0,
    y: 2.86,
    w: 9.3,
    h: 0.62,
    fontFace: "Trebuchet MS",
    fontSize: 31,
    bold: true,
    color: "6246EA",
    align: "center",
    margin: 0,
    fit: "shrink",
  });
  s.addText("CI/CD, Dockerized Training, Model Serving, and Monitoring", {
    x: 2.2,
    y: 3.55,
    w: 8.9,
    h: 0.28,
    fontFace: "Calibri",
    fontSize: 12,
    color: C.muted,
    align: "center",
    margin: 0,
    fit: "shrink",
  });
  s.addText("DevOps & MLOps Project | Academic Year 2025-2026", {
    x: 2.25,
    y: 5.85,
    w: 8.9,
    h: 0.26,
    fontFace: "Calibri",
    fontSize: 10.5,
    color: "F9FAFB",
    align: "center",
    margin: 0,
  });
  s.addText("Omar Elkhali  |  Ayoub Moutik  |  Jamila Ouzzane", {
    x: 2.1,
    y: 6.28,
    w: 9.1,
    h: 0.22,
    fontFace: "Calibri",
    fontSize: 10,
    color: "FFFFFF",
    align: "center",
    margin: 0,
  });
}

// 2. Project overview
{
  const s = slide();
  addTitle(s, "Project At A Glance", "A text classification system wrapped in a practical MLOps workflow.", -1);
  const parts = [
    ["01", "Scripts", "Convert the notebook into reusable Python modules.", C.purple],
    ["02", "Logging", "Record training, evaluation, prediction, and errors.", C.pink],
    ["03", "Reproducibility", "Track code, data, dependencies, runs, and artifacts.", C.orange],
    ["04", "CI/CD", "Build, test, train, evaluate, push, and deploy with Jenkins.", C.yellow],
    ["05", "Monitoring", "Observe API health and model behavior after release.", C.green],
  ];
  let x = 0.8;
  parts.forEach((p, i) => {
    card(s, x, 2.07, 2.08, 2.28, { fill: C.white, line: "EDF0F5", opacity: 0.1 });
    pill(s, x + 0.24, 1.73, 1.6, 0.47, p[3], p[0], C.white, 13);
    s.addText(p[1], {
      x: x + 0.25,
      y: 2.48,
      w: 1.58,
      h: 0.25,
      fontFace: "Trebuchet MS",
      fontSize: 13,
      bold: true,
      color: C.ink,
      align: "center",
      margin: 0,
    });
    s.addText(p[2], {
      x: x + 0.25,
      y: 2.95,
      w: 1.58,
      h: 0.83,
      fontFace: "Calibri",
      fontSize: 9,
      color: C.body,
      align: "center",
      margin: 0.02,
      fit: "shrink",
    });
    if (i < parts.length - 1) {
      s.addShape(pptx.ShapeType.line, {
        x: x + 2.08,
        y: 3.2,
        w: 0.32,
        h: 0,
        line: { color: "D1D7E3", width: 1.2, beginArrowType: "none", endArrowType: "triangle" },
      });
    }
    x += 2.42;
  });
  card(s, 1.2, 5.08, 10.9, 0.82, { fill: "FAFBFF", line: "ECEFF6", opacity: 0.08 });
  s.addText("Main objective", {
    x: 1.55,
    y: 5.31,
    w: 1.45,
    h: 0.22,
    fontFace: "Trebuchet MS",
    fontSize: 11,
    bold: true,
    color: C.ink,
    margin: 0,
  });
  s.addText("Turn a machine learning prototype into an observable, traceable, and automated delivery workflow.", {
    x: 3.05,
    y: 5.28,
    w: 8.55,
    h: 0.3,
    fontFace: "Calibri",
    fontSize: 12,
    color: C.body,
    margin: 0,
    fit: "shrink",
  });
  addFooter(s, 2);
}

// 3. Part 1
{
  const s = slide();
  addTitle(s, "Part 1 - Moving From Notebooks To Scripts", "The notebook becomes a modular codebase that Jenkins and tests can execute.", 0);
  diagramFrame(s, "code_architecture.png", 5.45, 1.38, 7.15, 4.9, "Diagram from report/figures/code_architecture.png");
  pill(s, 0.75, 1.36, 1.4, 0.36, C.purple, "WHY", C.white, 9.5);
  s.addText("Notebooks are excellent for exploration, but production workflows need deterministic modules and terminal commands.", {
    x: 0.75,
    y: 1.84,
    w: 4.2,
    h: 0.7,
    fontFace: "Calibri",
    fontSize: 13,
    color: C.body,
    margin: 0,
    fit: "shrink",
  });
  const modules = [
    ["data.py", "load, split, clean, tokenize"],
    ["train.py", "Ray Train and checkpoints"],
    ["evaluate.py", "overall, class, and slice metrics"],
    ["serve.py", "FastAPI and optional Ray Serve"],
  ];
  modules.forEach((m, i) => {
    card(s, 0.78, 2.82 + i * 0.76, 4.15, 0.5, { fill: "FBFCFF", line: "ECEFF6", opacity: 0.08 });
    circleLabel(s, 0.98, 2.91 + i * 0.76, 0.32, partColors[i % partColors.length], String(i + 1), 7);
    s.addText(m[0], { x: 1.46, y: 2.93 + i * 0.76, w: 1.0, h: 0.15, fontFace: "Trebuchet MS", fontSize: 8.3, bold: true, color: C.ink, margin: 0 });
    s.addText(m[1], { x: 2.45, y: 2.93 + i * 0.76, w: 2.25, h: 0.16, fontFace: "Calibri", fontSize: 8.2, color: C.muted, margin: 0, fit: "shrink" });
  });
  addFooter(s, 3);
}

// 4. Part 2
{
  const s = slide();
  addTitle(s, "Part 2 - Logging For ML Systems", "Logs make training and serving behavior inspectable after the run finishes.", 1);
  diagramFrame(s, "foundations_evidence.png", 6.05, 1.2, 6.25, 4.45, "Diagram from report/figures/foundations_evidence.png");
  pill(s, 0.78, 1.36, 1.65, 0.36, C.pink, "LOG FLOW", C.white, 9.5);
  const steps = [
    ["App code", "logger.info / errors", C.purple],
    ["Handlers", "console + rotating files", C.pink],
    ["Artifacts", "info.log and error.log", C.orange],
    ["Audit", "debug, trace, explain", C.green],
  ];
  steps.forEach((p, i) => {
    processNode(s, 0.95 + i * 1.18, 2.1 + (i % 2) * 0.1, String(i + 1), p[0], p[1], p[2], i < steps.length - 1);
  });
  card(s, 0.82, 4.55, 4.74, 1.18, { fill: "FBFCFF", line: "ECEFF6", opacity: 0.08 });
  addBullets(s, [
    "Configuration lives in madewithml/config.py.",
    "Training logs run ID, parameters, and metric history.",
    "Evaluation and prediction logs support troubleshooting.",
  ], 1.06, 4.83, 4.28, 0.58, C.body, 9.4);
  addFooter(s, 4);
}

// 5. Part 3
{
  const s = slide();
  addTitle(s, "Part 3 - Reproducibility", "A result is useful only when the team can explain and recreate it.", 2);
  const xs = [0.95, 3.35, 5.75, 8.15, 10.55];
  const labels = [
    ["Git", "code history"],
    ["requirements.txt", "dependency versions"],
    ["datasets/", "small data versioning"],
    ["MLflow", "runs, params, metrics"],
    ["Checkpoints", "model artifacts"],
  ];
  s.addShape(pptx.ShapeType.line, { x: 1.45, y: 3.05, w: 10.08, h: 0, line: { color: "D7DCE7", width: 2.2 } });
  labels.forEach((l, i) => {
    circleLabel(s, xs[i], 2.58, 0.78, partColors[i], String(i + 1), 12);
    s.addText(l[0], { x: xs[i] - 0.55, y: 3.55, w: 1.88, h: 0.23, fontFace: "Trebuchet MS", fontSize: 10, bold: true, color: C.ink, align: "center", margin: 0, fit: "shrink" });
    s.addText(l[1], { x: xs[i] - 0.48, y: 3.87, w: 1.72, h: 0.42, fontFace: "Calibri", fontSize: 8.6, color: C.muted, align: "center", margin: 0, fit: "shrink" });
  });
  card(s, 1.05, 5.03, 5.35, 0.85, { fill: "FBFCFF", line: "ECEFF6", opacity: 0.08 });
  s.addText("Project evidence", { x: 1.35, y: 5.23, w: 1.35, h: 0.22, fontFace: "Trebuchet MS", fontSize: 10.5, bold: true, color: C.ink, margin: 0 });
  s.addText("Seed utilities, Ray checkpoints, MLflow file URI, tracked datasets, and archived CI artifacts.", {
    x: 2.85,
    y: 5.2,
    w: 3.2,
    h: 0.28,
    fontFace: "Calibri",
    fontSize: 9.6,
    color: C.body,
    margin: 0,
    fit: "shrink",
  });
  card(s, 6.9, 5.03, 5.35, 0.85, { fill: "FBFCFF", line: "ECEFF6", opacity: 0.08 });
  s.addText("Production path", { x: 7.2, y: 5.23, w: 1.5, h: 0.22, fontFace: "Trebuchet MS", fontSize: 10.5, bold: true, color: C.ink, margin: 0 });
  s.addText("Move large data and artifacts to DVC, object storage, or a remote MLflow server.", {
    x: 8.82,
    y: 5.2,
    w: 3.05,
    h: 0.28,
    fontFace: "Calibri",
    fontSize: 9.6,
    color: C.body,
    margin: 0,
    fit: "shrink",
  });
  addFooter(s, 5);
}

// 6. Model lifecycle
{
  const s = slide();
  addTitle(s, "Training And Model Lifecycle", "The reproducibility layer connects data, training, evaluation, serving, and monitoring.", 2);
  diagramFrame(s, "ml_lifecycle.png", 0.98, 1.23, 3.85, 5.35, "Diagram from report/figures/ml_lifecycle.png");
  const rows = [
    ["1", "Load and preprocess", "CSV data is cleaned, tokenized, and split with stratification.", C.purple],
    ["2", "Train and track", "Ray Train writes checkpoints while MLflow records params and metrics.", C.pink],
    ["3", "Evaluate and gate", "Weighted F1 plus class and slice metrics decide deployability.", C.orange],
    ["4", "Serve and observe", "FastAPI exposes predictions and Prometheus-format metrics.", C.green],
  ];
  rows.forEach((r, i) => {
    card(s, 5.35, 1.42 + i * 1.18, 6.85, 0.82, { fill: C.white, line: "ECEFF6", opacity: 0.08 });
    circleLabel(s, 5.65, 1.57 + i * 1.18, 0.46, r[3], r[0], 8.5);
    s.addText(r[1], { x: 6.33, y: 1.55 + i * 1.18, w: 2.1, h: 0.2, fontFace: "Trebuchet MS", fontSize: 10.2, bold: true, color: C.ink, margin: 0 });
    s.addText(r[2], { x: 6.33, y: 1.83 + i * 1.18, w: 5.35, h: 0.22, fontFace: "Calibri", fontSize: 9.5, color: C.body, margin: 0, fit: "shrink" });
  });
  addFooter(s, 6);
}

// 7. Part 4 CI/CD
{
  const s = slide();
  addTitle(s, "Part 4 - Dockerized Jenkins CI/CD", "The pipeline validates both software correctness and model quality before deployment.", 3);
  diagramFrame(s, "cicd_pipeline.png", 0.75, 1.12, 4.3, 5.85, "Diagram from report/figures/cicd_pipeline.png");
  const stages = [
    ["Checkout", "Pull source code from GitHub"],
    ["Build image", "Create versioned Docker image"],
    ["CI checks", "compileall, pytest, critical flake8"],
    ["Train", "Run containerized Ray training"],
    ["Evaluate", "Compare weighted F1 to MIN_F1"],
    ["Deploy", "Start API and run smoke tests"],
  ];
  stages.forEach((st, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = 5.68 + col * 3.28;
    const y = 1.5 + row * 1.35;
    card(s, x, y, 2.82, 0.9, { fill: "FBFCFF", line: "ECEFF6", opacity: 0.08 });
    pill(s, x + 0.18, y + 0.18, 0.52, 0.34, partColors[i % 5], String(i + 1), C.white, 8.5);
    s.addText(st[0], { x: x + 0.82, y: y + 0.2, w: 1.78, h: 0.18, fontFace: "Trebuchet MS", fontSize: 9.8, bold: true, color: C.ink, margin: 0, fit: "shrink" });
    s.addText(st[1], { x: x + 0.82, y: y + 0.48, w: 1.75, h: 0.2, fontFace: "Calibri", fontSize: 8.3, color: C.muted, margin: 0, fit: "shrink" });
  });
  card(s, 5.76, 5.74, 6.1, 0.62, { fill: "FFF9E8", line: "F4E5B5", opacity: 0.07 });
  s.addText("Jenkins gate: weighted F1 = 0.9055 passed MIN_F1 = 0.85 and promoted the model.", {
    x: 6.07,
    y: 5.93,
    w: 5.45,
    h: 0.16,
    fontFace: "Calibri",
    fontSize: 9.2,
    color: "7A4E00",
    margin: 0,
    fit: "shrink",
  });
  addFooter(s, 7);
}

// 8. CI/CD decisions and serving
{
  const s = slide();
  addTitle(s, "Deployment Decision Flow", "The pipeline only promotes a model after the code, training job, evaluation, and smoke checks pass.", 3);
  s.addShape(pptx.ShapeType.line, { x: 1.25, y: 3.2, w: 10.85, h: 0, line: { color: "D7DCE7", width: 2.2 } });
  const flow = [
    ["Build", "Docker image", C.purple],
    ["Test", "4 tests passed", C.pink],
    ["Train", "MLflow run ID", C.orange],
    ["Gate", "weighted F1", C.yellow],
    ["Deploy", "FastAPI :8000", C.green],
  ];
  flow.forEach((f, i) => {
    const x = 1.08 + i * 2.25;
    circleLabel(s, x, 2.63, 0.92, f[2], String(i + 1), 14);
    s.addText(f[0], { x: x - 0.55, y: 3.85, w: 2.0, h: 0.22, fontFace: "Trebuchet MS", fontSize: 12, bold: true, color: C.ink, align: "center", margin: 0 });
    s.addText(f[1], { x: x - 0.52, y: 4.22, w: 1.95, h: 0.36, fontFace: "Calibri", fontSize: 9, color: C.muted, align: "center", margin: 0, fit: "shrink" });
  });
  card(s, 1.2, 5.45, 5.05, 0.75, { fill: "FBFCFF", line: "ECEFF6", opacity: 0.08 });
  s.addText("Artifacts archived", { x: 1.52, y: 5.65, w: 1.65, h: 0.2, fontFace: "Trebuchet MS", fontSize: 10, bold: true, color: C.ink, margin: 0 });
  s.addText("train_results.json, eval_results.json, run_id.txt, metrics_smoke.txt", {
    x: 3.3,
    y: 5.65,
    w: 2.55,
    h: 0.18,
    fontFace: "Calibri",
    fontSize: 8.2,
    color: C.muted,
    margin: 0,
    fit: "shrink",
  });
  card(s, 7.1, 5.45, 5.05, 0.75, { fill: "FBFCFF", line: "ECEFF6", opacity: 0.08 });
  s.addText("Serving choice", { x: 7.42, y: 5.65, w: 1.45, h: 0.2, fontFace: "Trebuchet MS", fontSize: 10, bold: true, color: C.ink, margin: 0 });
  s.addText("FastAPI was selected for stable local deployment; Ray remains in training and evaluation.", {
    x: 8.98,
    y: 5.62,
    w: 2.8,
    h: 0.23,
    fontFace: "Calibri",
    fontSize: 8.2,
    color: C.muted,
    margin: 0,
    fit: "shrink",
  });
  addFooter(s, 8);
}

// 9. Part 5 monitoring
{
  const s = slide();
  addTitle(s, "Part 5 - Monitoring Architecture", "After deployment, the model API is measured by Prometheus and visualized in Grafana.", 4);
  diagramFrame(s, "monitoring_architecture.png", 6.55, 1.18, 5.3, 5.45, "Diagram from report/figures/monitoring_architecture.png");
  const services = [
    ["Jenkins", "builds, trains, deploys", C.purple],
    ["Model API", "predicts and exposes /metrics", C.pink],
    ["Prometheus", "scrapes API metrics", C.orange],
    ["Grafana", "visualizes behavior", C.green],
  ];
  services.forEach((svc, i) => {
    card(s, 0.85, 1.55 + i * 1.18, 4.85, 0.82, { fill: "FBFCFF", line: "ECEFF6", opacity: 0.08 });
    circleLabel(s, 1.14, 1.7 + i * 1.18, 0.44, svc[2], String(i + 1), 8.2);
    s.addText(svc[0], { x: 1.82, y: 1.68 + i * 1.18, w: 1.5, h: 0.2, fontFace: "Trebuchet MS", fontSize: 10.5, bold: true, color: C.ink, margin: 0 });
    s.addText(svc[1], { x: 3.24, y: 1.69 + i * 1.18, w: 2.0, h: 0.18, fontFace: "Calibri", fontSize: 8.6, color: C.muted, margin: 0, fit: "shrink" });
  });
  addFooter(s, 9);
}

// 10. Monitoring metrics and drift
{
  const s = slide();
  addTitle(s, "Metrics, Drift, And Findings", "The monitoring layer checks API health and model behavior, then guides action.", 4);
  const metrics = [
    ["Request rate", "mlopsfull_requests_total", C.purple],
    ["Latency", "request_latency_seconds", C.pink],
    ["Predictions", "predictions_total by class", C.orange],
    ["Confidence", "prediction_confidence", C.yellow],
    ["Input quality", "validation_failures_total", C.green],
    ["Drift", "length and class distribution", C.teal],
  ];
  metrics.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.82 + col * 4.05;
    const y = 1.5 + row * 1.38;
    card(s, x, y, 3.42, 0.95, { fill: "FBFCFF", line: "ECEFF6", opacity: 0.08 });
    circleLabel(s, x + 0.22, y + 0.22, 0.48, m[2], String(i + 1), 8.5);
    s.addText(m[0], { x: x + 0.88, y: y + 0.22, w: 1.85, h: 0.19, fontFace: "Trebuchet MS", fontSize: 10, bold: true, color: C.ink, margin: 0 });
    s.addText(m[1], { x: x + 0.88, y: y + 0.53, w: 2.1, h: 0.16, fontFace: "Calibri", fontSize: 7.8, color: C.muted, margin: 0, fit: "shrink" });
  });
  card(s, 1.08, 4.95, 11.1, 0.92, { fill: "F5FFF8", line: "D8F0DF", opacity: 0.08 });
  s.addText("Observed demo finding", { x: 1.42, y: 5.18, w: 1.95, h: 0.2, fontFace: "Trebuchet MS", fontSize: 10.8, bold: true, color: "2F6F46", margin: 0 });
  s.addText("The service handled 200 prediction requests with 0 HTTP errors. Monitoring showed predictions across all classes with average confidence around 0.9285.", {
    x: 3.55,
    y: 5.08,
    w: 8.1,
    h: 0.36,
    fontFace: "Calibri",
    fontSize: 10.2,
    color: "315B3D",
    margin: 0,
    fit: "shrink",
  });
  addFooter(s, 10);
}

// 11. Limitations and improvements
{
  const s = slide();
  addTitle(s, "Limitations And Future Improvements", "The project demonstrates the workflow locally; production hardening is the next step.", -1);
  const cols = [
    ["Current limitations", [
      "Local Docker-based stack",
      "Small local training dataset",
      "Stricter F1 deployment gate",
      "Drift helpers are not scheduled",
      "No alert routing yet",
    ], C.pink],
    ["Next improvements", [
      "Add more labeled training data",
      "Calibrate release thresholds",
      "Add Prometheus alert rules",
      "Store prediction events",
      "Move toward Kubernetes or managed ML",
    ], C.green],
  ];
  cols.forEach((col, i) => {
    const x = 1.08 + i * 6.05;
    card(s, x, 1.62, 5.1, 4.55, { fill: "FBFCFF", line: "ECEFF6", opacity: 0.1 });
    pill(s, x + 0.38, 1.92, 2.25, 0.38, col[2], col[0], C.white, 9);
    addBullets(s, col[1], x + 0.72, 2.72, 3.9, 2.5, C.body, 12);
  });
  addFooter(s, 11);
}

// 12. Conclusion
{
  const s = slide();
  s.background = { color: "F6F2FF" };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: "7465F3" }, line: { color: "7465F3" } });
  s.addShape(pptx.ShapeType.rect, { x: 8.0, y: 0, w: 5.4, h: H, fill: { color: "70B957", transparency: 18 }, line: { color: "70B957", transparency: 100 } });
  addTopStripe(s, -1);
  card(s, 1.32, 1.55, 10.7, 3.55, { fill: C.white, line: C.white, opacity: 0.14 });
  s.addText("Final Takeaway", {
    x: 2.0,
    y: 2.0,
    w: 9.35,
    h: 0.35,
    fontFace: "Trebuchet MS",
    fontSize: 16,
    bold: true,
    color: C.purple,
    align: "center",
    margin: 0,
  });
  s.addText("This project is more than a trained model.", {
    x: 2.0,
    y: 2.48,
    w: 9.35,
    h: 0.45,
    fontFace: "Trebuchet MS",
    fontSize: 24,
    bold: true,
    color: C.ink,
    align: "center",
    margin: 0,
    fit: "shrink",
  });
  s.addText("It is an operational workflow where code changes trigger validation, training creates tracked artifacts, deployment is gated by evaluation, and the running service is monitored after release.", {
    x: 2.25,
    y: 3.28,
    w: 8.85,
    h: 0.72,
    fontFace: "Calibri",
    fontSize: 14,
    color: C.body,
    align: "center",
    margin: 0,
    fit: "shrink",
  });
  s.addText("Scripts -> Logging -> Reproducibility -> CI/CD -> Monitoring", {
    x: 2.2,
    y: 5.86,
    w: 8.9,
    h: 0.24,
    fontFace: "Calibri",
    fontSize: 11,
    bold: true,
    color: "FFFFFF",
    align: "center",
    margin: 0,
  });
}

pptx.writeFile({ fileName: path.join(__dirname, "mlops_project_presentation.pptx") });
