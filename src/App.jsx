import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Eye,
  History,
  Minus,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Timer,
  Play,
  Pause,
} from "lucide-react";

/**
 * Calisthenics Mobile (20 semanas)
 * - Responsive (mobile-first)
 * - 4 días/semana
 * - Ajuste interactivo de series/reps por ejercicio
 * - Registro por sesión (completado, RPE, notas)
 * - Recomendación automática: avanzar o mantener nivel
 * - Persistencia con localStorage
 * - Visual: grupo muscular + explicación visual por ejercicio
 */

// -----------------------------
// Utils
// -----------------------------
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// -----------------------------
// Plan Generator (20 semanas)
// -----------------------------

/**
 * Diseño del plan:
 * - 4 días (Full body repartido) para ~45 min.
 * - Progresión suave: +reps y +series cada ciertos hitos.
 * - Semanas 8 y 16: descarga ligera.
 * - Alternativas seguras: silla/mesa/pared.
 */

const DAYS = [
  { id: "A", name: "Día 1" },
  { id: "B", name: "Día 2" },
  { id: "C", name: "Día 3" },
  { id: "D", name: "Día 4" },
];

const MUSCLE_GROUPS = {
  warmup: { key: "warmup", label: "Movilidad" },
  push: { key: "push", label: "Pecho/Tríceps" },
  pull: { key: "pull", label: "Espalda" },
  legs: { key: "legs", label: "Pierna" },
  glutes: { key: "glutes", label: "Glúteos" },
  core: { key: "core", label: "Core" },
  calves: { key: "calves", label: "Gemelos" },
  shoulders: { key: "shoulders", label: "Escápulas" },
  cardio: { key: "cardio", label: "Cardio" },
  cooldown: { key: "cooldown", label: "Recuperación" },
};

const exerciseLibrary = {
  warmup: {
    id: "warmup",
    title: "Calentamiento (5–7 min)",
    muscleGroup: "warmup",
    tips:
      "Movilidad suave + activación. Mantén respiración cómoda. No busques fatiga aquí.",
    videoHint:
      "Círculos de hombro, bisagra de cadera, sentadillas parciales, scapular push-ups.",
    checklist: [
      { label: "Movilidad de hombros (30s)", secs: 30 },
      { label: "Bisagra de cadera (10 reps)", reps: 10 },
      { label: "Sentadilla parcial (10 reps)", reps: 10 },
      { label: "Scapular push-ups (8 reps)", reps: 8 },
      { label: "Marcha suave (60s)", secs: 60 },
    ],
  },
  cooldown: {
    id: "cooldown",
    title: "Vuelta a la calma (3–5 min)",
    muscleGroup: "cooldown",
    tips:
      "Respiración + estiramientos suaves. Termina sintiéndote mejor de lo que empezaste.",
    videoHint:
      "Estiramiento de pectoral en pared, flexores de cadera, respiración 4-6.",
  },

  inclinePushUp: {
    id: "inclinePushUp",
    title: "Flexiones inclinadas",
    muscleGroup: "push",
    equipment: "mesa / encimera / pared",
    cues: [
      "Manos al ancho de hombros, dedos abiertos.",
      "Cuerpo en bloque (glúteos y abdomen activos).",
      "Baja controlado hasta que el pecho se acerque al apoyo.",
      "Sube empujando el suelo, sin encoger hombros.",
    ],
    scaling: ["Más fácil: pared.", "Más difícil: mesa baja / flexión en suelo."],
  },

  chairSquat: {
    id: "chairSquat",
    title: "Sentadilla a silla",
    muscleGroup: "legs",
    equipment: "silla robusta",
    cues: [
      "Pies a ancho de caderas, puntas ligeramente hacia fuera.",
      "Cadera atrás y abajo (como sentarte).",
      "Toca la silla sin desplomarte y vuelve a subir.",
      "Rodillas siguen la línea de los pies.",
    ],
    scaling: ["Más fácil: rango parcial.", "Más difícil: pausa 1–2s abajo / sin tocar."],
  },

  tableRow: {
    id: "tableRow",
    title: "Remo bajo mesa (inverted row)",
    muscleGroup: "pull",
    equipment: "mesa robusta",
    safety:
      "Asegura la mesa (estable). Si no es segura, usa una variante más segura (remo con banda, isométricos).",
    cues: [
      "Agarra el borde, cuerpo en línea.",
      "Tira llevando el pecho hacia la mesa.",
      "Hombros lejos de orejas, escápulas atrás.",
      "Baja controlado.",
    ],
    scaling: ["Más fácil: rodillas flexionadas.", "Más difícil: piernas estiradas."],
  },

  gluteBridge: {
    id: "gluteBridge",
    title: "Puente de glúteo",
    muscleGroup: "glutes",
    equipment: "suelo",
    cues: [
      "Talones cerca de glúteos.",
      "Empuja el suelo con talones.",
      "Sube cadera sin arquear lumbar.",
      "Pausa 1s arriba.",
    ],
    scaling: ["Más difícil: una pierna (progresivo)."],
  },

  deadBug: {
    id: "deadBug",
    title: "Dead bug",
    muscleGroup: "core",
    equipment: "suelo",
    cues: [
      "Lumbar pegada al suelo (costillas abajo).",
      "Extiende brazo y pierna contraria sin perder control.",
      "Movimientos lentos y respira.",
    ],
    scaling: ["Más fácil: solo brazos o solo piernas.", "Más difícil: pausa 1s estirado."],
  },

  plank: {
    id: "plank",
    title: "Plancha",
    muscleGroup: "core",
    equipment: "suelo",
    cues: [
      "Codos bajo hombros.",
      "Glúteos y abdomen firmes.",
      "Cuello largo, mira al suelo.",
      "Respira, no aguantes el aire.",
    ],
    scaling: ["Más fácil: rodillas al suelo.", "Más difícil: plancha larga o con toques."],
  },

  stepUp: {
    id: "stepUp",
    title: "Step-ups",
    muscleGroup: "legs",
    equipment: "escalón bajo / caja estable",
    cues: [
      "Sube empujando con la pierna de arriba.",
      "Controla la bajada.",
      "Rodilla alineada con el pie.",
    ],
    scaling: ["Más fácil: escalón más bajo.", "Más difícil: más lento o con pausa."],
  },

  calfRaise: {
    id: "calfRaise",
    title: "Elevación de gemelos",
    muscleGroup: "calves",
    equipment: "suelo",
    cues: ["Sube lento, pausa arriba.", "Baja controlado.", "Puedes apoyarte en pared."],
    scaling: ["Más difícil: una pierna."],
  },

  scapularPushUp: {
    id: "scapularPushUp",
    title: "Flexión escapular",
    muscleGroup: "shoulders",
    equipment: "pared / mesa / suelo",
    cues: [
      "Brazos rectos.",
      "Junta y separa escápulas sin doblar codos.",
      "Movimiento corto y controlado.",
    ],
    scaling: ["Más fácil: pared."],
  },

  marchInPlace: {
    id: "marchInPlace",
    title: "Marcha en el sitio (zona 2 suave)",
    muscleGroup: "cardio",
    equipment: "ninguno",
    cues: ["Ritmo cómodo, puedes hablar.", "Brazos acompañan.", "Postura alta."],
    scaling: ["Más difícil: intervalos 30/30."],
  },
};

function isDeloadWeek(week) {
  return week === 8 || week === 16;
}

function setsForWeek(week) {
  // Base 2 sets (sem 1-4), 3 sets (5-8), 3 (9-12), 4 (13-20) con descarga en 8 y 16
  let sets = 2;
  if (week >= 5) sets = 3;
  if (week >= 13) sets = 4;
  if (isDeloadWeek(week)) sets = Math.max(2, sets - 1);
  return sets;
}

function repsForWeek(week, baseReps) {
  const add = Math.floor((week - 1) / 2);
  let reps = baseReps + add;
  if (isDeloadWeek(week)) reps = Math.max(4, reps - 2);
  return reps;
}

function secondsForWeek(week, baseSeconds) {
  const add = Math.floor((week - 1) / 2) * 5;
  let s = baseSeconds + add;
  if (isDeloadWeek(week)) s = Math.max(10, s - 10);
  return s;
}

function buildWeekPlan(week) {
  const sets = setsForWeek(week);

  const pushReps = repsForWeek(week, 6);
  const squatReps = repsForWeek(week, 8);
  const rowReps = repsForWeek(week, 5);
  const bridgeReps = repsForWeek(week, 10);
  const deadBugReps = repsForWeek(week, 6);
  const stepUpReps = repsForWeek(week, 8);
  const calfReps = repsForWeek(week, 10);
  const scapReps = repsForWeek(week, 8);
  const plankSec = secondsForWeek(week, 20);
  const marchMin = clamp(8 + Math.floor((week - 1) / 2), 8, 20);
  const marchMinDeload = Math.max(6, marchMin - 4);

  const march = {
    type: "time",
    exerciseId: "marchInPlace",
    sets: 1,
    reps: isDeloadWeek(week) ? marchMinDeload : marchMin,
    unit: "min",
    rest: "—",
  };

  // ✅ Aseguramos calentamiento al comienzo en TODAS las sesiones
  const warm = { type: "block", exerciseId: "warmup" };
  const cool = { type: "block", exerciseId: "cooldown" };

  const A = {
    id: "A",
    title: "Empuje + Core",
    items: [
      warm,
      {
        type: "reps",
        exerciseId: "scapularPushUp",
        sets: Math.max(2, sets - 1),
        reps: scapReps,
        unit: "reps",
        rest: "45–60s",
      },
      {
        type: "reps",
        exerciseId: "inclinePushUp",
        sets,
        reps: pushReps,
        unit: "reps",
        rest: "60–90s",
      },
      {
        type: "reps",
        exerciseId: "gluteBridge",
        sets,
        reps: bridgeReps,
        unit: "reps",
        rest: "60s",
      },
      {
        type: "reps",
        exerciseId: "deadBug",
        sets,
        reps: deadBugReps,
        unit: "reps/lado",
        rest: "45–60s",
      },
      {
        type: "time",
        exerciseId: "plank",
        sets,
        reps: plankSec,
        unit: "s",
        rest: "45–60s",
      },
      cool,
    ],
  };

  const B = {
    id: "B",
    title: "Pierna + Tirón",
    items: [
      warm,
      {
        type: "reps",
        exerciseId: "chairSquat",
        sets,
        reps: squatReps,
        unit: "reps",
        rest: "60–90s",
      },
      {
        type: "reps",
        exerciseId: "stepUp",
        sets,
        reps: stepUpReps,
        unit: "reps/lado",
        rest: "60–90s",
      },
      {
        type: "reps",
        exerciseId: "tableRow",
        sets,
        reps: rowReps,
        unit: "reps",
        rest: "60–90s",
      },
      {
        type: "reps",
        exerciseId: "calfRaise",
        sets: Math.max(2, sets - 1),
        reps: calfReps,
        unit: "reps",
        rest: "45–60s",
      },
      march,
      cool,
    ],
  };

  const C = {
    id: "C",
    title: "Full body (técnica)",
    items: [
      warm,
      {
        type: "reps",
        exerciseId: "inclinePushUp",
        sets: Math.max(2, sets - 1),
        reps: Math.max(4, pushReps - 1),
        unit: "reps",
        rest: "60–90s",
      },
      {
        type: "reps",
        exerciseId: "chairSquat",
        sets: Math.max(2, sets - 1),
        reps: Math.max(6, squatReps - 2),
        unit: "reps",
        rest: "60–90s",
      },
      {
        type: "reps",
        exerciseId: "tableRow",
        sets: Math.max(2, sets - 1),
        reps: Math.max(4, rowReps - 1),
        unit: "reps",
        rest: "60–90s",
      },
      {
        type: "reps",
        exerciseId: "deadBug",
        sets: Math.max(2, sets - 1),
        reps: Math.max(5, deadBugReps - 1),
        unit: "reps/lado",
        rest: "45–60s",
      },
      {
        type: "time",
        exerciseId: "plank",
        sets: Math.max(2, sets - 1),
        reps: Math.max(15, plankSec - 5),
        unit: "s",
        rest: "45–60s",
      },
      cool,
    ],
  };

  const D = {
    id: "D",
    title: "Tirón + Core + Suave",
    items: [
      warm,
      {
        type: "reps",
        exerciseId: "tableRow",
        sets,
        reps: rowReps,
        unit: "reps",
        rest: "60–90s",
      },
      {
        type: "reps",
        exerciseId: "gluteBridge",
        sets: Math.max(2, sets - 1),
        reps: bridgeReps,
        unit: "reps",
        rest: "60s",
      },
      {
        type: "reps",
        exerciseId: "deadBug",
        sets,
        reps: deadBugReps,
        unit: "reps/lado",
        rest: "45–60s",
      },
      {
        type: "time",
        exerciseId: "plank",
        sets,
        reps: plankSec,
        unit: "s",
        rest: "45–60s",
      },
      march,
      cool,
    ],
  };

  return { week, sets, sessions: [A, B, C, D] };
}

function getPlan20Weeks() {
  const weeks = [];
  for (let w = 1; w <= 20; w++) weeks.push(buildWeekPlan(w));
  return weeks;
}

// -----------------------------
// Scoring / Recommendation
// -----------------------------

/**
 * Score por sesión (0..1)
 *
 * Por cada ejercicio (no "block"):
 *  - setsRatio = min(setsDone / targetSets, 1)
 *  - repsRatio = min(repsDone / targetReps, 1)
 *  - itemScore = 0.5*setsRatio + 0.5*repsRatio
 *
 * pct  = media de itemScore (cumplimiento)
 * score = pct - penalización por RPE (evita progresar con fatiga excesiva)
 */
function scoreSession({ items, actualByItemId, targetsByItemId, rpe }) {
  let total = 0;
  let sum = 0;

  items.forEach((it, idx) => {
    if (it.type === "block") return;
    const itemKey = `${it.exerciseId}:${idx}`;

    const a = actualByItemId[itemKey];
    const t = targetsByItemId[itemKey] ?? { sets: it.sets, reps: it.reps };

    const targetSets = Math.max(1, Number(t.sets ?? it.sets ?? 1));
    const targetReps = Math.max(1, Number(t.reps ?? it.reps ?? 1));

    const setsDone = Math.max(0, Number(a?.setsDone ?? 0));
    const repsDone = Math.max(0, Number(a?.repsDone ?? 0));

    const setsRatio = clamp(setsDone / targetSets, 0, 1);
    const repsRatio = clamp(repsDone / targetReps, 0, 1);

    const itemScore = 0.5 * setsRatio + 0.5 * repsRatio;
    total += 1;
    sum += itemScore;
  });

  const pct = total === 0 ? 0 : sum / total;

  const rpePenalty = rpe >= 9 ? 0.2 : rpe >= 8 ? 0.1 : 0;
  const score = clamp(pct - rpePenalty, 0, 1);

  return { pct, score };
}

function recommendationFromScore(scoreObj) {
  if (scoreObj.score >= 0.8) return { level: "advance", label: "Avanza" };
  if (scoreObj.score >= 0.55) return { level: "hold", label: "Mantén" };
  return { level: "reduce", label: "Repite más fácil" };
}

function suggestReduction({ items, actualByItemId, targetsByItemId }) {
  const out = [];

  items.forEach((it, idx) => {
    if (it.type === "block") return;

    const itemKey = `${it.exerciseId}:${idx}`;
    const ex = exerciseLibrary[it.exerciseId];
    const a = actualByItemId[itemKey];
    const t = targetsByItemId[itemKey] ?? { sets: it.sets, reps: it.reps };

    const targetSets = Math.max(1, Number(t.sets ?? it.sets ?? 1));
    const targetReps = Math.max(1, Number(t.reps ?? it.reps ?? 1));

    const setsDone = Number(a?.setsDone ?? 0);
    const repsDone = Number(a?.repsDone ?? 0);

    const noData = !a;

    let newSets = targetSets;
    let newReps = targetReps;

    // Ajuste estándar: -1 serie si no llegas a series
    if (noData || setsDone < targetSets) newSets = Math.max(1, targetSets - 1);

    // Ajuste estándar: -2 reps (o -5s / -1min si es tiempo) si no llegas a reps/tiempo
    if (noData || repsDone < targetReps) {
      if (it.type === "time") {
        const delta = it.unit === "min" ? 1 : 5;
        newReps = Math.max(1, targetReps - delta);
      } else {
        newReps = Math.max(1, targetReps - 2);
      }
    }

    if (newSets === targetSets && newReps === targetReps) return;

    out.push({
      itemKey,
      exerciseId: it.exerciseId,
      title: ex?.title ?? it.exerciseId,
      from: { sets: targetSets, reps: targetReps, unit: it.unit },
      to: { sets: newSets, reps: newReps, unit: it.unit },
    });
  });

  return out;
}

// -----------------------------
// Visual helpers (muscle + exercise drawings)
// -----------------------------

const VISUAL_STEPS = {
  warmup: [
    { title: "Activa", text: "Movilidad suave: hombros y cadera. Sin dolor, sin prisa." },
    { title: "Eleva temperatura", text: "Marcha suave o pasos en el sitio. Debes poder hablar." },
    { title: "Listo", text: "1–2 repeticiones de prueba del primer ejercicio antes de empezar." },
  ],
  cooldown: [
    { title: "Baja pulsaciones", text: "Respira 4s inhalar / 6s exhalar durante 60–90s." },
    { title: "Suelta", text: "Estira suave pectoral y flexores de cadera. Sin rebotes." },
    { title: "Cierra", text: "Termina con sensación de alivio, no de tensión." },
  ],
  inclinePushUp: [
    { title: "Posición", text: "Manos en mesa/pared. Cuerpo en bloque: glúteos y abdomen activos." },
    { title: "Baja", text: "Codos 30–45°. Pecho se acerca al apoyo, hombros lejos de orejas." },
    { title: "Sube", text: "Empuja fuerte el suelo y vuelve a la línea recta sin arquear lumbar." },
  ],
  chairSquat: [
    { title: "Coloca", text: "Pies a ancho de caderas. Pecho alto, mirada al frente." },
    { title: "Siéntate controlado", text: "Cadera atrás y abajo. Rodillas siguen la línea de los pies." },
    { title: "Levanta", text: "Empuja el suelo y sube. Pausa 1s arriba para controlar." },
  ],
  tableRow: [
    { title: "Asegura", text: "Mesa estable. Agarre firme. Cuerpo en línea (no cuelgues la cadera)." },
    { title: "Tira", text: "Pecho hacia la mesa. Escápulas atrás y abajo, cuello largo." },
    { title: "Baja lento", text: "Controla la bajada sin perder la línea del cuerpo." },
  ],
  gluteBridge: [
    { title: "Coloca", text: "Talones cerca de glúteos. Costillas abajo, cuello relajado." },
    { title: "Empuja", text: "Sube la cadera empujando con talones, sin arquear la lumbar." },
    { title: "Pausa", text: "1s arriba apretando glúteos. Baja lento y repite." },
  ],
  deadBug: [
    { title: "Bloquea lumbar", text: "Lumbar pegada al suelo. Costillas abajo." },
    { title: "Extiende", text: "Brazo y pierna contraria lento. No pierdas el control." },
    { title: "Vuelve", text: "Regresa al centro manteniendo respiración fluida." },
  ],
  plank: [
    { title: "Alinea", text: "Codos bajo hombros. Glúteos y abdomen firmes." },
    { title: "Sostén", text: "Respira. Evita hundir cadera o elevarla." },
    { title: "Termina estable", text: "Sales igual de alineado que entraste. Calidad > tiempo." },
  ],
  stepUp: [
    { title: "Pie arriba", text: "Apoya todo el pie en el escalón. Tronco alto." },
    { title: "Sube", text: "Empuja con la pierna de arriba. No te impulses con la de abajo." },
    { title: "Baja controlado", text: "Desciende lento manteniendo rodilla alineada." },
  ],
  calfRaise: [
    { title: "Base", text: "Postura alta. Apoyo en pared si hace falta." },
    { title: "Sube", text: "Pausa arriba 1s. Siente gemelo trabajando." },
    { title: "Baja", text: "Baja lento y completo. No rebotes." },
  ],
  scapularPushUp: [
    { title: "Brazos rectos", text: "Manos al ancho hombros. Cuerpo en línea." },
    { title: "Separa", text: "Empuja el suelo y separa escápulas sin doblar codos." },
    { title: "Junta", text: "Deja que se acerquen controladas. Movimiento corto." },
  ],
  marchInPlace: [
    { title: "Ritmo cómodo", text: "Marcha suave. Debes poder hablar sin jadear." },
    { title: "Constante", text: "Brazos acompañan. Postura alta, hombros relajados." },
    { title: "Cierra", text: "Termina con respiración tranquila, listo para estirar." },
  ],
};

function getVisualSteps(exId) {
  return VISUAL_STEPS[exId] ?? [
    { title: "Coloca", text: "Ajusta postura: estable y sin dolor." },
    { title: "Ejecuta", text: "Movimiento controlado, sin rebotes." },
    { title: "Finaliza", text: "Vuelve a neutro con control." },
  ];
}


function MuscleIcon({ group, className = "" }) {
  // Minimalist silhouette + highlight by group (grayscale)
  const g = group ?? "core";
  const hi = {
    push: { chest: 0.9, arms: 0.7 },
    pull: { back: 0.9, arms: 0.6 },
    legs: { legs: 0.9 },
    glutes: { glutes: 0.9 },
    core: { core: 0.9 },
    calves: { calves: 0.9 },
    shoulders: { shoulders: 0.9 },
    cardio: { full: 0.5 },
    warmup: { full: 0.4 },
    cooldown: { full: 0.25 },
  };
  const h = hi[g] ?? hi.core;

  const dim = (v) => (v ? v : 0.12);

  return (
    <svg
      viewBox="0 0 120 120"
      className={`h-9 w-9 ${className}`}
      aria-label="Grupo muscular"
    >
      <g fill="none" stroke="currentColor" strokeWidth="3" opacity="0.6">
        <circle cx="60" cy="18" r="10" />
        <path d="M45 34 Q60 28 75 34" />
        <path d="M40 38 Q60 46 80 38" />
        <path d="M45 40 Q60 55 75 40" />
        <path d="M45 40 L40 66" />
        <path d="M75 40 L80 66" />
        <path d="M50 58 L50 92" />
        <path d="M70 58 L70 92" />
      </g>

      {/* Highlights (filled) */}
      <g fill="currentColor">
        {/* Chest */}
        <path
          d="M46 40 Q60 48 74 40 Q60 58 46 40"
          opacity={dim(h.chest)}
        />
        {/* Back */}
        <path
          d="M44 42 Q60 50 76 42 Q60 70 44 42"
          opacity={dim(h.back)}
        />
        {/* Shoulders */}
        <circle cx="44" cy="41" r="7" opacity={dim(h.shoulders)} />
        <circle cx="76" cy="41" r="7" opacity={dim(h.shoulders)} />
        {/* Arms */}
        <path d="M40 44 L35 65 L43 67 L46 46 Z" opacity={dim(h.arms)} />
        <path d="M80 44 L85 65 L77 67 L74 46 Z" opacity={dim(h.arms)} />
        {/* Core */}
        <rect x="52" y="50" width="16" height="22" rx="6" opacity={dim(h.core)} />
        {/* Glutes */}
        <path
          d="M50 72 Q60 80 70 72 Q60 90 50 72"
          opacity={dim(h.glutes)}
        />
        {/* Legs */}
        <rect x="46" y="82" width="10" height="26" rx="5" opacity={dim(h.legs)} />
        <rect x="64" y="82" width="10" height="26" rx="5" opacity={dim(h.legs)} />
        {/* Calves */}
        <rect x="46" y="96" width="10" height="12" rx="5" opacity={dim(h.calves)} />
        <rect x="64" y="96" width="10" height="12" rx="5" opacity={dim(h.calves)} />
        {/* Full body */}
        <rect x="36" y="32" width="48" height="78" rx="18" opacity={dim(h.full)} />
      </g>
    </svg>
  );
}

function ExerciseIllustration({ exId, step = 0 }) {
  // Minimal line-art per exercise (grayscale). No external assets.
  const common = "stroke-current";

  const overlay = (
    <g>
      <rect x="12" y="10" width="34" height="26" rx="10" fill="currentColor" opacity="0.12" />
      <text
        x="29"
        y="28"
        textAnchor="middle"
        fontSize="14"
        fontWeight="800"
        fill="currentColor"
      >
        {step + 1}
      </text>
      {step === 1 ? (
        <path
          d="M72 30 C96 16 124 16 148 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.45"
        />
      ) : null}
      {step === 2 ? (
        <path
          d="M160 28 l8 8 l16 -18"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.65"
        />
      ) : null}
    </g>
  );

  const content = (() => {
    switch (exId) {
      case "inclinePushUp":
        return (
          <g
            fill="none"
            className={common}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 110 H200" opacity="0.25" />
            <path d="M150 55 H200 V110" opacity="0.35" />
            <circle cx={step === 1 ? 74 : 70} cy={step === 1 ? 66 : 60} r="10" />
            <path d={step === 1 ? "M84 74 L122 78 L150 70" : "M80 68 L120 72 L150 70"} />
            <path d={step === 1 ? "M122 78 L112 104" : "M120 72 L110 102"} />
            <path d={step === 1 ? "M150 70 L156 98" : "M150 70 L155 95"} />
            <path d={step === 1 ? "M112 104 L82 108" : "M110 102 L80 108"} />
          </g>
        );
      case "chairSquat":
        return (
          <g
            fill="none"
            className={common}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 110 H200" opacity="0.25" />
            <path d="M150 62 H190 V110" opacity="0.35" />
            <path d="M150 62 V110" opacity="0.35" />
            <path d="M150 72 H190" opacity="0.35" />
            <circle cx="80" cy={step === 1 ? 50 : 42} r="10" />
            <path d={step === 1 ? "M80 60 L92 82 L104 98" : "M80 52 L88 74 L98 94"} />
            <path d={step === 1 ? "M92 82 L70 92" : "M88 74 L68 86"} />
            <path d={step === 1 ? "M104 98 L84 110" : "M98 94 L80 108"} />
            <path d={step === 1 ? "M70 92 L62 110" : "M68 86 L60 108"} />
          </g>
        );
      case "tableRow":
        return (
          <g
            fill="none"
            className={common}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M40 45 H180" opacity="0.35" />
            <path d="M50 45 V115" opacity="0.35" />
            <path d="M170 45 V115" opacity="0.35" />
            <path d="M20 115 H200" opacity="0.25" />
            <circle cx={step === 1 ? 98 : 90} cy={step === 1 ? 74 : 80} r="9" />
            <path d={step === 1 ? "M106 79 L136 72 L160 70" : "M98 85 L130 78 L160 70"} />
            <path d={step === 1 ? "M136 72 L122 98" : "M130 78 L118 102"} />
            <path d={step === 1 ? "M122 98 L96 110" : "M118 102 L90 110"} />
          </g>
        );
      case "gluteBridge":
        return (
          <g
            fill="none"
            className={common}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 110 H200" opacity="0.25" />
            <circle cx="60" cy="82" r="9" />
            <path d={step === 1 ? "M68 86 L110 66 L150 86" : "M68 86 L110 76 L150 86"} />
            <path d={step === 1 ? "M110 66 L122 98" : "M110 76 L120 102"} />
            <path d="M150 86 L160 110" />
            <path d="M122 98 L92 110" />
            <path d="M92 110 H60" />
          </g>
        );
      case "deadBug":
        return (
          <g
            fill="none"
            className={common}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 115 H200" opacity="0.25" />
            <circle cx="70" cy="85" r="9" />
            <path d="M78 90 L120 90" />
            <path d={step === 1 ? "M95 90 L70 62" : "M95 90 L80 65"} />
            <path d={step === 1 ? "M115 90 L150 64" : "M115 90 L140 70"} />
            <path d={step === 1 ? "M105 90 L75 112" : "M105 90 L85 112"} />
            <path d={step === 1 ? "M120 90 L160 112" : "M120 90 L150 112"} />
          </g>
        );
      case "plank":
        return (
          <g
            fill="none"
            className={common}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 110 H200" opacity="0.25" />
            <circle cx={step === 1 ? 62 : 60} cy={step === 1 ? 74 : 70} r="9" />
            <path d={step === 1 ? "M70 79 L140 84" : "M68 75 L140 80"} />
            <path d="M90 78 L85 105" />
            <path d="M140 80 L150 108" />
            <path d="M85 105 L60 110" />
          </g>
        );
      case "stepUp":
        return (
          <g
            fill="none"
            className={common}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 110 H200" opacity="0.25" />
            <path d="M130 90 H180 V110 H130 Z" opacity="0.35" />
            <circle cx="70" cy={step === 1 ? 40 : 45} r="9" />
            <path d={step === 1 ? "M70 50 L82 72 L102 90" : "M70 54 L78 76 L92 95"} />
            <path d={step === 1 ? "M82 72 L64 88" : "M78 76 L60 90"} />
            <path d={step === 1 ? "M102 90 L136 90" : "M92 95 L130 95"} />
            <path d={step === 1 ? "M64 88 L56 110" : "M60 90 L55 110"} />
          </g>
        );
      case "calfRaise":
        return (
          <g
            fill="none"
            className={common}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 110 H200" opacity="0.25" />
            <circle cx="90" cy={step === 1 ? 42 : 45} r="9" />
            <path d={step === 1 ? "M90 51 L90 84" : "M90 54 L90 85"} />
            <path d="M90 70 L70 80" />
            <path d={step === 1 ? "M90 84 L78 108" : "M90 85 L75 110"} />
            <path d={step === 1 ? "M90 84 L108 108" : "M90 85 L105 110"} />
            <path d="M75 110 Q82 100 90 110" />
          </g>
        );
      case "scapularPushUp":
        return (
          <g
            fill="none"
            className={common}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 110 H200" opacity="0.25" />
            <circle cx="60" cy="70" r="9" />
            <path d="M68 75 L140 80" />
            <path d="M90 78 L85 105" />
            <path d="M140 80 L150 108" />
            <path d="M85 105 L60 110" />
            <path
              d={step === 1 ? "M98 70 Q112 60 126 70" : "M98 70 Q110 65 122 70"}
              opacity="0.6"
            />
          </g>
        );
      case "marchInPlace":
        return (
          <g
            fill="none"
            className={common}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 110 H200" opacity="0.25" />
            <circle cx={step === 1 ? 100 : 95} cy={step === 1 ? 40 : 42} r="9" />
            <path d={step === 1 ? "M100 50 L104 78" : "M95 52 L98 78"} />
            <path d={step === 1 ? "M104 66 L84 76" : "M98 66 L78 76"} />
            <path d={step === 1 ? "M104 66 L124 76" : "M98 66 L118 76"} />
            <path d={step === 1 ? "M104 78 L88 98" : "M98 78 L85 100"} />
            <path d={step === 1 ? "M104 78 L128 94" : "M98 78 L120 92"} />
            <path d="M88 98 L80 110" />
            <path d="M128 94 L136 110" />
          </g>
        );
      case "warmup":
        return (
          <g
            fill="none"
            className={common}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 110 H200" opacity="0.25" />
            <circle cx="95" cy="42" r="9" />
            <path d="M95 52 L95 80" />
            <path d="M95 62 L70 65" />
            <path d="M95 62 L120 65" />
            <path d="M95 80 L80 110" />
            <path d="M95 80 L110 110" />
            <path d="M55 45 Q40 60 55 75" opacity={step === 1 ? 0.75 : 0.5} />
            <path d="M135 45 Q150 60 135 75" opacity={step === 1 ? 0.75 : 0.5} />
          </g>
        );
      case "cooldown":
        return (
          <g
            fill="none"
            className={common}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 110 H200" opacity="0.25" />
            <circle cx="85" cy="55" r="9" />
            <path d="M85 65 L105 82" />
            <path d="M105 82 L140 90" />
            <path d="M105 82 L98 108" />
            <path d="M140 90 L160 110" />
            <path d="M55 70 Q65 60 75 70" opacity={step === 1 ? 0.75 : 0.5} />
          </g>
        );
      default:
        return (
          <g
            fill="none"
            className={common}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 110 H200" opacity="0.25" />
            <circle cx="70" cy="60" r="10" />
            <path d="M80 70 L140 85" />
            <path d="M100 80 L90 110" />
          </g>
        );
    }
  })();

  return (
    <svg
      viewBox="0 0 220 140"
      className="h-40 w-full text-zinc-900"
      aria-label="Ilustración del ejercicio"
    >
      {content}
      {overlay}
    </svg>
  );
}

// -----------------------------
// UI Components
// -----------------------------

function Pill({ children, tone = "neutral" }) {
  const map = {
    neutral: "bg-zinc-100 text-zinc-800 border-zinc-200",
    good: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warn: "bg-amber-50 text-amber-900 border-amber-200",
    bad: "bg-rose-50 text-rose-800 border-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        map[tone] ?? map.neutral
      }`}
    >
      {children}
    </span>
  );
}

function Stepper({ value, onChange, min = 0, max = 999 }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-zinc-200 bg-white shadow-sm">
      <button
        className="p-2 active:scale-[0.98]"
        onClick={() => onChange(clamp(value - 1, min, max))}
        aria-label="Disminuir"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="min-w-[40px] px-2 text-center text-sm font-semibold tabular-nums">
        {value}
      </div>
      <button
        className="p-2 active:scale-[0.98]"
        onClick={() => onChange(clamp(value + 1, min, max))}
        aria-label="Aumentar"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function Card({ title, icon: Icon, right, children }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon ? (
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-100">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div>
            <div className="text-sm font-semibold text-zinc-900">{title}</div>
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function SmallButton({ onClick, children, tone = "neutral", className = "", disabled = false }) {
  const map = {
    neutral:
      "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 active:bg-zinc-100",
    primary:
      "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-700",
    ghost: "border-transparent bg-transparent text-zinc-900 hover:bg-zinc-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm active:scale-[0.99] ${
        map[tone] ?? map.neutral
      } ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
    >
      <div className="text-sm font-semibold text-zinc-900">{label}</div>
      <div
        className={`relative h-7 w-12 rounded-full border transition-colors ${
          checked ? "bg-zinc-900 border-zinc-900" : "bg-zinc-100 border-zinc-200"
        }`}
      >
        <div
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </div>
    </button>
  );
}

function TopBar({ week, day, onPrevWeek, onNextWeek, onOpenHistory }) {
  return (
    <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-900 text-white shadow">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-zinc-500">Calistenia • 20 semanas</div>
            <div className="text-sm font-semibold text-zinc-900">
              Semana {week} · {day}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="grid h-10 w-10 place-items-center rounded-2xl border border-zinc-200 bg-white shadow-sm active:scale-[0.99]"
            onClick={onPrevWeek}
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            className="grid h-10 w-10 place-items-center rounded-2xl border border-zinc-200 bg-white shadow-sm active:scale-[0.99]"
            onClick={onNextWeek}
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            className="grid h-10 w-10 place-items-center rounded-2xl border border-zinc-200 bg-white shadow-sm active:scale-[0.99]"
            onClick={onOpenHistory}
            aria-label="Historial"
          >
            <History className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Tabs({ value, onChange }) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-4">
      <div className="grid grid-cols-4 gap-2 rounded-2xl bg-zinc-100 p-2">
        {DAYS.map((d) => {
          const active = value === d.id;
          return (
            <button
              key={d.id}
              onClick={() => onChange(d.id)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {d.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExerciseDetails({ ex }) {
  return (
    <div className="mt-3 space-y-2 text-sm text-zinc-700">
      {ex.equipment ? (
        <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2">
          <span className="text-xs font-semibold text-zinc-600">Equipo</span>
          <span className="text-xs font-semibold text-zinc-900">{ex.equipment}</span>
        </div>
      ) : null}
      {ex.safety ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold">
            <Shield className="h-4 w-4" />
            Seguridad
          </div>
          <div className="text-xs leading-relaxed">{ex.safety}</div>
        </div>
      ) : null}

      {ex.cues ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold text-zinc-600">Técnica</div>
          <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed">
            {ex.cues.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {ex.scaling ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold text-zinc-600">Progresión</div>
          <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed">
            {ex.scaling.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {ex.tips ? (
        <div className="rounded-xl bg-zinc-50 p-3 text-xs leading-relaxed">{ex.tips}</div>
      ) : null}
      {ex.videoHint ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="mb-1 text-xs font-semibold text-zinc-600">Qué buscar en un vídeo</div>
          <div className="text-xs leading-relaxed text-zinc-700">{ex.videoHint}</div>
        </div>
      ) : null}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
          <motion.div
            className="absolute inset-x-0 bottom-0 mx-auto max-w-xl rounded-t-3xl border border-zinc-200 bg-white p-4 shadow-2xl"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 250, damping: 26 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-zinc-500">Visual</div>
                <div className="text-sm font-semibold text-zinc-900">{title}</div>
              </div>
              <SmallButton onClick={onClose} tone="ghost">
                Cerrar
              </SmallButton>
            </div>
            <div className="max-h-[75vh] overflow-auto pb-4">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function WarmupChecklist({ ex, storageKey }) {
  const [checked, setChecked] = useState(() => loadLS(storageKey, {}));
  useEffect(() => saveLS(storageKey, checked), [storageKey, checked]);

  return (
    <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-zinc-600">Checklist</div>
        <Pill>
          <Timer className="h-4 w-4" />
          5–7 min
        </Pill>
      </div>
      <div className="space-y-2">
        {ex.checklist?.map((it, i) => {
          const k = `${i}`;
          const on = !!checked[k];
          return (
            <button
              key={k}
              onClick={() => setChecked((s) => ({ ...s, [k]: !s[k] }))}
              className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left"
            >
              <div className="text-xs font-semibold text-zinc-900">{it.label}</div>
              <Pill tone={on ? "good" : "neutral"}>{on ? "OK" : "—"}</Pill>
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-zinc-600">
        Si hoy estás rígido o hace frío, repite una vuelta extra de movilidad.
      </div>
    </div>
  );
}

function SessionItem({
  item,
  index,
  customTarget,
  onChangeCustomTarget,
  actual,
  onChangeActual,
  onOpenVisual,
  warmupStorageKey,
}) {
  const ex = exerciseLibrary[item.exerciseId];

  if (item.type === "block") {
    const mg = MUSCLE_GROUPS[ex.muscleGroup] ?? MUSCLE_GROUPS.warmup;
    return (
      <Card
        title={ex.title}
        icon={ClipboardList}
        right={
          <div className="flex items-center gap-2 text-zinc-900">
            <div className="hidden sm:block text-xs font-semibold text-zinc-600">{mg.label}</div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-100 text-zinc-900">
              <MuscleIcon group={ex.muscleGroup} className="h-8 w-8" />
            </div>
          </div>
        }
      >
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-zinc-700">{ex.tips}</div>
            <SmallButton
              onClick={() => onOpenVisual(ex.id)}
              className="shrink-0"
            >
              <span className="inline-flex items-center gap-2">
                <Eye className="h-4 w-4" /> Ver visual
              </span>
            </SmallButton>
          </div>

          {ex.id === "warmup" ? <WarmupChecklist ex={ex} storageKey={warmupStorageKey} /> : null}

          {ex.videoHint ? (
            <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700">
              <span className="font-semibold text-zinc-900">Sugerencia: </span>
              {ex.videoHint}
            </div>
          ) : null}
        </div>
      </Card>
    );
  }

  const targetSets = customTarget?.sets ?? item.sets;
  const targetReps = customTarget?.reps ?? item.reps;
  const mg = MUSCLE_GROUPS[ex.muscleGroup] ?? MUSCLE_GROUPS.core;

  return (
    <Card
      title={ex.title}
      icon={Dumbbell}
      right={
        <div className="flex items-center gap-2">
          <Pill>
            {item.rest} · {targetSets}×{targetReps} {item.unit}
          </Pill>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-100 text-zinc-900" title={mg.label}>
            <MuscleIcon group={ex.muscleGroup} className="h-8 w-8" />
          </div>
        </div>
      }
    >
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <Pill>{mg.label}</Pill>
          <SmallButton onClick={() => onOpenVisual(ex.id)}>
            <span className="inline-flex items-center gap-2">
              <Eye className="h-4 w-4" /> Ver visual
            </span>
          </SmallButton>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-2 text-xs font-semibold text-zinc-600">Objetivo (editable)</div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-zinc-600">Series</div>
              <Stepper
                value={targetSets}
                min={1}
                max={10}
                onChange={(v) =>
                  onChangeCustomTarget({
                    ...(customTarget ?? {}),
                    sets: v,
                    reps: targetReps,
                  })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-zinc-600">
                {item.type === "time" ? "Tiempo" : "Reps"}
              </div>
              <Stepper
                value={targetReps}
                min={1}
                max={200}
                onChange={(v) =>
                  onChangeCustomTarget({
                    ...(customTarget ?? {}),
                    sets: targetSets,
                    reps: v,
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold text-zinc-600">Resultado (lo que hiciste hoy)</div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-zinc-600">Series</div>
              <Stepper
                value={actual?.setsDone ?? 0}
                min={0}
                max={20}
                onChange={(v) => onChangeActual({ ...(actual ?? {}), setsDone: v })}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-zinc-600">
                {item.type === "time" ? "Tiempo" : "Reps"}
              </div>
              <Stepper
                value={actual?.repsDone ?? 0}
                min={0}
                max={999}
                onChange={(v) => onChangeActual({ ...(actual ?? {}), repsDone: v })}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2">
            <div className="text-xs font-semibold text-zinc-600">Completado</div>
            <Pill
              tone={
                (actual?.setsDone ?? 0) >= targetSets && (actual?.repsDone ?? 0) >= targetReps
                  ? "good"
                  : "neutral"
              }
            >
              {(actual?.setsDone ?? 0) >= targetSets && (actual?.repsDone ?? 0) >= targetReps ? (
                <>
                  <Check className="h-4 w-4" /> OK
                </>
              ) : (
                "—"
              )}
            </Pill>
          </div>
        </div>

        <details className="rounded-2xl border border-zinc-200 bg-white p-3">
          <summary className="cursor-pointer select-none text-sm font-semibold text-zinc-900">
            Ver técnica
          </summary>
          <ExerciseDetails ex={ex} />
        </details>

        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold text-zinc-600">Notas</div>
          <textarea
            value={actual?.notes ?? ""}
            onChange={(e) => onChangeActual({ ...(actual ?? {}), notes: e.target.value })}
            placeholder="Ej.: mesa un poco alta, hice lento, dolor 0/10..."
            className="min-h-[80px] w-full resize-none rounded-xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
          />
        </div>
      </div>
    </Card>
  );
}

function VisualPanel({ ex }) {
  const mg = MUSCLE_GROUPS[ex.muscleGroup] ?? MUSCLE_GROUPS.core;
  const steps = getVisualSteps(ex.id);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speedMs, setSpeedMs] = useState(1500); // 1×=1500, 1.5×=1000, 2×=700
  const [tick, setTick] = useState(0); // forces rerender for progress

  // Reset when opening a new exercise
  useEffect(() => {
    setStep(0);
    setPlaying(true);
  }, [ex.id]);

  // Autoplay step switching
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setStep((s) => (s + 1) % steps.length);
    }, speedMs);
    return () => clearInterval(t);
  }, [playing, speedMs, steps.length]);

  // Lightweight progress tick (for the animated bar)
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setTick((x) => x + 1), 50);
    return () => clearInterval(t);
  }, [playing]);

  function cycleSpeed() {
    setSpeedMs((s) => (s === 1500 ? 1000 : s === 1000 ? 700 : 1500));
  }

  function speedLabel() {
    return speedMs === 1500 ? "1×" : speedMs === 1000 ? "1.5×" : "2×";
  }

  function goTo(i) {
    setPlaying(false);
    setStep(i);
  }

  function prev() {
    setPlaying(false);
    setStep((s) => Math.max(0, s - 1));
  }

  function next() {
    setPlaying(false);
    setStep((s) => Math.min(steps.length - 1, s + 1));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-500">Grupo muscular</div>
            <div className="text-sm font-semibold text-zinc-900">{mg.label}</div>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100 text-zinc-900">
            <MuscleIcon group={ex.muscleGroup} className="h-10 w-10" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-zinc-900">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold text-zinc-600">Paso a paso</div>

          <div className="flex items-center gap-2">
            <SmallButton
              tone={playing ? "primary" : "neutral"}
              onClick={() => setPlaying((p) => !p)}
              className="px-3 py-2"
            >
              <span className="inline-flex items-center gap-2">
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Pausa" : "Play"}
              </span>
            </SmallButton>

            <button
              onClick={cycleSpeed}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm active:scale-[0.99]"
              aria-label="Cambiar velocidad"
              title="Velocidad"
            >
              <span className="inline-flex items-center gap-2">
                <Timer className="h-4 w-4" />
                {speedLabel()}
              </span>
            </button>

            <Pill>
              <Timer className="h-4 w-4" />
              {step + 1}/{steps.length}
            </Pill>
          </div>
        </div>

        {/* Story-like progress */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          {steps.map((_, i) => {
            const isDone = i < step;
            const isActive = i === step;
            return (
              <div key={i} className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
                {isDone ? (
                  <div className="h-full w-full bg-zinc-900" />
                ) : isActive ? (
                  <motion.div
                    key={`${ex.id}-${step}-${speedMs}-${playing}-${tick}`}
                    className="h-full bg-zinc-900"
                    initial={{ width: "0%" }}
                    animate={{ width: playing ? "100%" : "0%" }}
                    transition={
                      playing
                        ? { duration: speedMs / 1000, ease: "linear" }
                        : { duration: 0.15, ease: "easeOut" }
                    }
                  />
                ) : (
                  <div className="h-full w-0" />
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl bg-zinc-50 p-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={`ill-${ex.id}-${step}`}
              initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
              transition={{ duration: 0.18 }}
            >
              <ExerciseIllustration exId={ex.id} step={step} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-3 grid gap-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={`txt-${ex.id}-${step}`}
              className="rounded-2xl border border-zinc-200 bg-white p-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="text-xs text-zinc-500">Paso {step + 1}</div>
              <div className="text-sm font-semibold text-zinc-900">{steps[step]?.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-zinc-700">{steps[step]?.text}</div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between gap-2">
            <SmallButton onClick={prev} disabled={step === 0}>
              <span className="inline-flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" /> Anterior
              </span>
            </SmallButton>

            <div className="flex items-center gap-2">
              {steps.map((_, i) => {
                const active = i === step;
                return (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`h-2.5 w-2.5 rounded-full border transition ${
                      active ? "bg-zinc-900 border-zinc-900" : "bg-white border-zinc-300"
                    }`}
                    aria-label={`Ir al paso ${i + 1}`}
                  />
                );
              })}
            </div>

            <SmallButton onClick={next} disabled={step === steps.length - 1} tone="primary">
              <span className="inline-flex items-center gap-2">
                Siguiente <ChevronRight className="h-4 w-4" />
              </span>
            </SmallButton>
          </div>
        </div>

        <div className="mt-2 text-xs text-zinc-600">
          Tip premium: deja el modo Play para entender el flujo, y pausa para ajustar la técnica.
        </div>
      </div>

      {ex.cues ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold text-zinc-600">Checklist técnico</div>
          <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-zinc-700">
            {ex.cues.slice(0, 5).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {ex.scaling ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold text-zinc-600">Cómo hacerlo más fácil/difícil</div>
          <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-zinc-700">
            {ex.scaling.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {ex.safety ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold">
            <Shield className="h-4 w-4" />
            Seguridad
          </div>
          <div className="text-xs leading-relaxed">{ex.safety}</div>
        </div>
      ) : null}
    </div>
  );
}

// -----------------------------
// Main App
// -----------------------------

const LS_KEYS = {
  state: "calisthenics_mobile_state_v2",
  logs: "calisthenics_mobile_logs_v2",
  targets: "calisthenics_mobile_targets_v2",
};

export default function App() {
  const plan = useMemo(() => getPlan20Weeks(), []);

  const [appState, setAppState] = useState(() =>
    loadLS(LS_KEYS.state, {
      week: 1,
      dayId: "A",
      smartProgression: true,
    })
  );

  const [customTargets, setCustomTargets] = useState(() => loadLS(LS_KEYS.targets, {}));

  const [logs, setLogs] = useState(() =>
    loadLS(LS_KEYS.logs, {
      order: [],
      byId: {},
    })
  );

  const [historyOpen, setHistoryOpen] = useState(false);
  const [visualOpen, setVisualOpen] = useState(false);
  const [visualExId, setVisualExId] = useState("inclinePushUp");

  useEffect(() => saveLS(LS_KEYS.state, appState), [appState]);
  useEffect(() => saveLS(LS_KEYS.targets, customTargets), [customTargets]);
  useEffect(() => saveLS(LS_KEYS.logs, logs), [logs]);

  const weekObj = plan.find((w) => w.week === appState.week) ?? plan[0];
  const session = weekObj.sessions.find((s) => s.id === appState.dayId) ?? weekObj.sessions[0];

  const sessionKey = `${appState.week}-${appState.dayId}`;
  const warmupStorageKey = `warmup_check_${sessionKey}`;

  const [draft, setDraft] = useState(() => ({
    actualByItemId: {},
    rpe: 7,
    completed: false,
    date: todayISO(),
  }));

  useEffect(() => {
    setDraft({
      actualByItemId: {},
      rpe: 7,
      completed: false,
      date: todayISO(),
    });
  }, [sessionKey]);

  const targetsByItemId = useMemo(() => {
    const m = {};
    session.items.forEach((it, idx) => {
      if (it.type === "block") return;
      const itemKey = `${it.exerciseId}:${idx}`;
      const path = targetPath(appState.week, appState.dayId, itemKey);
      const ct = customTargets[path];
      m[itemKey] = {
        sets: ct?.sets ?? it.sets,
        reps: ct?.reps ?? it.reps,
      };
    });
    return m;
  }, [session.items, customTargets, appState.week, appState.dayId]);

  const scoreObj = useMemo(
    () =>
      scoreSession({
        items: session.items,
        actualByItemId: draft.actualByItemId,
        targetsByItemId,
        rpe: draft.rpe,
      }),
    [session.items, draft.actualByItemId, draft.rpe, targetsByItemId]
  );

  const rec = useMemo(() => recommendationFromScore(scoreObj), [scoreObj]);
  

  const reduceSuggestions = useMemo(() => {
    if (rec.level !== "reduce") return [];
    return suggestReduction({
      items: session.items,
      actualByItemId: draft.actualByItemId,
      targetsByItemId,
    });
  }, [rec.level, session.items, draft.actualByItemId, targetsByItemId]);

  function applySuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) return;
    setCustomTargets((prev) => {
      const next = { ...prev };
      suggestions.forEach((sug) => {
        const path = targetPath(appState.week, appState.dayId, sug.itemKey);
        next[path] = { sets: sug.to.sets, reps: sug.to.reps };
      });
      return next;
    });
  }

  function clearSessionTargets() {
    const prefix = `${appState.week}-${appState.dayId}-`;
    setCustomTargets((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(prefix)) delete next[k];
      });
      return next;
    });
  }
  const recPillTone = rec.level === "advance" ? "good" : rec.level === "hold" ? "warn" : "bad";

  function goPrevWeek() {
    setAppState((s) => ({ ...s, week: clamp(s.week - 1, 1, 20) }));
  }
  function goNextWeek() {
    setAppState((s) => ({ ...s, week: clamp(s.week + 1, 1, 20) }));
  }

  function setDay(dayId) {
    setAppState((s) => ({ ...s, dayId }));
  }

  function targetPath(week, dayId, itemKey) {
    return `${week}-${dayId}-${itemKey}`;
  }

  function getCustomTargetForItem(item, idx) {
    const itemKey = `${item.exerciseId}:${idx}`;
    const path = targetPath(appState.week, appState.dayId, itemKey);
    return customTargets[path] ?? null;
  }

  function setCustomTargetForItem(item, idx, target) {
    const itemKey = `${item.exerciseId}:${idx}`;
    const path = targetPath(appState.week, appState.dayId, itemKey);
    setCustomTargets((t) => ({ ...t, [path]: target }));
  }

  function getActualForItem(item, idx) {
    const itemKey = `${item.exerciseId}:${idx}`;
    return draft.actualByItemId[itemKey] ?? null;
  }

  function setActualForItem(item, idx, actual) {
    const itemKey = `${item.exerciseId}:${idx}`;
    setDraft((d) => ({
      ...d,
      actualByItemId: { ...d.actualByItemId, [itemKey]: actual },
    }));
  }

  function openVisual(exId) {
    setVisualExId(exId);
    setVisualOpen(true);
  }

  function saveSession() {
    const suggestionsToApply = rec.level === "reduce" ? reduceSuggestions : [];
    if (appState.smartProgression && rec.level === "reduce" && suggestionsToApply.length) {
      applySuggestions(suggestionsToApply);
    }
    const id = uid();
    const payload = {
      id,
      createdAt: new Date().toISOString(),
      date: draft.date,
      week: appState.week,
      dayId: appState.dayId,
      sessionTitle: session.title,
      rpe: draft.rpe,
      score: scoreObj.score,
      pct: scoreObj.pct,
      recommendation: rec.level,
      actualByItemId: draft.actualByItemId,
      completed: true,
    };

    setLogs((prev) => {
      const order = [id, ...prev.order];
      const byId = { ...prev.byId, [id]: payload };
      return { order, byId };
    });

    if (appState.smartProgression) {
      if (rec.level === "advance") {
        const idx = DAYS.findIndex((d) => d.id === appState.dayId);
        if (idx < DAYS.length - 1) {
          setAppState((s) => ({ ...s, dayId: DAYS[idx + 1].id }));
        } else {
          setAppState((s) => ({ ...s, week: clamp(s.week + 1, 1, 20), dayId: "A" }));
        }
      } else if (rec.level === "hold") {
        const idx = DAYS.findIndex((d) => d.id === appState.dayId);
        if (idx < DAYS.length - 1) {
          setAppState((s) => ({ ...s, dayId: DAYS[idx + 1].id }));
        } else {
          setAppState((s) => ({ ...s, dayId: "A" }));
        }
      } else {
        // reduce: repetir el mismo día/semana
      }
    }

    setDraft({
      actualByItemId: {},
      rpe: 7,
      completed: false,
      date: todayISO(),
    });
  }

  function resetAll() {
    if (!confirm("Esto borrará tu historial y ajustes. ¿Continuar?")) return;
    try {
      localStorage.removeItem(LS_KEYS.state);
      localStorage.removeItem(LS_KEYS.targets);
      localStorage.removeItem(LS_KEYS.logs);
    } catch {
      // ignore (e.g., privacy mode / no localStorage)
    }
    setAppState({ week: 1, dayId: "A", smartProgression: true });
    setCustomTargets({});
    setLogs({ order: [], byId: {} });
    setDraft({ actualByItemId: {}, rpe: 7, completed: false, date: todayISO() });
  }

  const historySeries = useMemo(() => {
    const items = [...logs.order]
      .slice()
      .reverse()
      .map((id, i) => {
        const L = logs.byId[id];
        return {
          idx: i + 1,
          label: `${L.week}${L.dayId}`,
          score: Math.round((L.score ?? 0) * 100),
          rpe: L.rpe ?? 0,
        };
      });
    return items;
  }, [logs]);

  const deload = isDeloadWeek(appState.week);
  const visualEx = exerciseLibrary[visualExId] ?? exerciseLibrary.inclinePushUp;

  return (
    <div className="min-h-screen bg-zinc-50">
      <TopBar
        week={appState.week}
        day={DAYS.find((d) => d.id === appState.dayId)?.name ?? "Día"}
        onPrevWeek={goPrevWeek}
        onNextWeek={goNextWeek}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <Tabs value={appState.dayId} onChange={setDay} />

      <main className="mx-auto max-w-xl space-y-4 px-4 pb-28 pt-4">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-zinc-500">Sesión</div>
              <div className="text-lg font-semibold text-zinc-900">{session.title}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill>
                  <Sparkles className="h-4 w-4" />
                  {weekObj.sets} series base
                </Pill>
                {deload ? <Pill tone="warn">Semana de descarga</Pill> : null}
                <Pill tone={recPillTone}>Recomendación: {rec.label}</Pill>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-500">Score</div>
              <div className="text-2xl font-bold tabular-nums text-zinc-900">
                {Math.round(scoreObj.score * 100)}
                <span className="text-sm font-semibold text-zinc-500">%</span>
              </div>
              <div className="text-xs text-zinc-500">cumplimiento: {Math.round(scoreObj.pct * 100)}%</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {session.items.map((item, idx) => (
            <SessionItem
              key={`${item.exerciseId}-${idx}`}
              item={item}
              index={idx}
              customTarget={item.type === "block" ? null : getCustomTargetForItem(item, idx)}
              onChangeCustomTarget={(t) => setCustomTargetForItem(item, idx, t)}
              actual={item.type === "block" ? null : getActualForItem(item, idx)}
              onChangeActual={(a) => setActualForItem(item, idx, a)}
              onOpenVisual={openVisual}
              warmupStorageKey={warmupStorageKey}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="mb-2 text-xs font-semibold text-zinc-600">Evaluación post-entreno</div>
              <div className="mb-2 text-xs font-semibold text-zinc-600">Esfuerzo percibido (RPE)</div>
              <div className="flex items-center justify-between gap-3">
                <input
                  type="range"
                  min={5}
                  max={10}
                  value={draft.rpe}
                  onChange={(e) => setDraft((d) => ({ ...d, rpe: Number(e.target.value) }))}
                  className="w-full"
                />
                <div className="w-12 text-right text-sm font-bold tabular-nums text-zinc-900">{draft.rpe}</div>
              </div>
              <div className="mt-2 text-xs text-zinc-600">6–7 = cómodo · 8 = duro controlado · 9–10 = demasiado</div>
            </div>

            <Toggle
              checked={appState.smartProgression}
              onChange={(v) => setAppState((s) => ({ ...s, smartProgression: v }))}
              label="Progresión inteligente"
            />
          </div>

          <div className="grid gap-2">
            <SmallButton onClick={saveSession} tone="primary">
              Guardar sesión
            </SmallButton>
            <SmallButton
              onClick={() =>
                setDraft({ actualByItemId: {}, rpe: 7, completed: false, date: todayISO() })
              }
            >
              Limpiar resultados (solo esta sesión)
            </SmallButton>
            <SmallButton onClick={resetAll}>
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Reset total
              </span>
            </SmallButton>
          </div>

          {rec.level === "reduce" ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">Ajuste sugerido (automático)</div>
                  <div className="mt-1 text-rose-800">
                    Para que la próxima sesión sea alcanzable, la app propone bajar un poco el objetivo en los ejercicios donde no llegaste.
                  </div>
                </div>
                <SmallButton
                  onClick={() => applySuggestions(reduceSuggestions)}
                  tone="primary"
                  disabled={reduceSuggestions.length === 0}
                >
                  Aplicar
                </SmallButton>
              </div>

              {reduceSuggestions.length ? (
                <div className="mt-3 space-y-2">
                  {reduceSuggestions.slice(0, 6).map((sug) => (
                    <div
                      key={sug.itemKey}
                      className="flex items-center justify-between rounded-xl border border-rose-200 bg-white px-3 py-2"
                    >
                      <div className="text-xs font-semibold text-zinc-900">{sug.title}</div>
                      <div className="text-xs font-semibold text-rose-900">
                        {sug.from.sets}×{sug.from.reps} → {sug.to.sets}×{sug.to.reps} {sug.from.unit}
                      </div>
                    </div>
                  ))}
                  {reduceSuggestions.length > 6 ? (
                    <div className="text-xs text-rose-800">…y {reduceSuggestions.length - 6} más</div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2 text-xs text-rose-800">Registra al menos 1 ejercicio para generar un ajuste útil.</div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <SmallButton onClick={clearSessionTargets}>
                  Quitar objetivos personalizados (esta sesión)
                </SmallButton>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-zinc-50 p-3 text-xs text-zinc-700">
              <div className="font-semibold text-zinc-900">Cómo decide avanzar</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Avanza si completas la mayoría de objetivos y el RPE no es excesivo.</li>
                <li>Mantén si estás cerca del objetivo.</li>
                <li>Repite más fácil si no llegas (ajusta series/reps hacia abajo).</li>
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-900 text-white shadow">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-500">Semana {appState.week}</div>
              <div className="text-sm font-semibold text-zinc-900">{session.title}</div>
            </div>
          </div>
          <SmallButton tone="primary" onClick={saveSession}>
            Guardar
          </SmallButton>
        </div>
      </div>

      {/* Visual modal */}
      <Modal open={visualOpen} onClose={() => setVisualOpen(false)} title={visualEx.title}>
        <VisualPanel ex={visualEx} />
      </Modal>

      {/* History modal */}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Tus sesiones"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">Tendencia</div>
              <Pill>{logs.order.length} sesiones</Pill>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historySeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="idx" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs text-zinc-600">Puntuación de cumplimiento por sesión (0–100).</div>
          </div>

          {logs.order.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
              Aún no hay sesiones guardadas. Cuando completes una, aparecerá aquí.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.order.map((id) => {
                const L = logs.byId[id];
                const tone =
                  L.recommendation === "advance"
                    ? "good"
                    : L.recommendation === "hold"
                    ? "warn"
                    : "bad";
                return (
                  <div key={id} className="rounded-2xl border border-zinc-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-zinc-500">{L.date}</div>
                        <div className="text-sm font-semibold text-zinc-900">
                          Semana {L.week} · {L.dayId} — {L.sessionTitle}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Pill tone={tone}>{L.recommendation}</Pill>
                          <Pill>Score {Math.round((L.score ?? 0) * 100)}%</Pill>
                          <Pill>RPE {L.rpe}</Pill>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-500">Cumplimiento</div>
                        <div className="text-sm font-bold tabular-nums text-zinc-900">
                          {Math.round((L.pct ?? 0) * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-2xl bg-zinc-50 p-3 text-xs text-zinc-700">
            <div className="font-semibold text-zinc-900">Consejo</div>
            <div className="mt-1">
              Ajusta los objetivos (series/reps) para que la sesión acabe con sensación de control.
              Si aparece dolor articular, reduce rango o elige una variante más fácil.
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
