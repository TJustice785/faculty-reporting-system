import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      titleColor: '#fff',
      bodyColor: '#e5e7eb',
      displayColors: false,
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.y}`,
      },
    },
  },
  elements: {
    point: { radius: 0, hitRadius: 6, hoverRadius: 4 },
    line: { tension: 0.35 },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { display: false },
    },
    y: {
      grid: { display: false },
      ticks: { display: false },
    },
  },
};

function TrendsMiniChart({ label = 'Activity', series = [] }) {
  // Resolve brand color from CSS variables with fallback
  let brand = 'rgba(13,110,253,1)';
  let brandBg = 'rgba(13,110,253,0.20)';
  try {
    const root = getComputedStyle(document.documentElement);
    const brandVar = (root.getPropertyValue('--brand') || '').trim();
    if (brandVar) {
      brand = brandVar;
      // Create a semi-transparent fill color from the brand variable
      brandBg = brandVar.startsWith('#') ? `${brandVar}33` : 'rgba(13,110,253,0.20)';
    }
  } catch (_) {
    // noop: use fallback colors in non-browser contexts
  }
  const labels = series.map((_, i) => `${i + 1}`);
  const data = {
    labels,
    datasets: [
      {
        data: series,
        borderColor: brand,
        backgroundColor: brandBg,
        fill: true,
        borderWidth: 2,
      },
    ],
  };

  return (
    <div style={{ height: 140 }}>
      <Line data={data} options={baseOptions} aria-label={label} role="img" />
    </div>
  );
}

export default TrendsMiniChart;
