import styles from './DonutChart.module.css';

interface DonutChartProps {
  /** 0-100+ ; values above 100 fill the ring completely and switch to the "achieved" color. */
  percentage: number;
  label: string;
  sublabel: string;
  size?: number;
}

const STROKE_WIDTH = 10;

/**
 * Small pure-SVG donut — no charting library in this project, and one ring
 * per goal doesn't need one. Ring fill is clamped to 100% (a 340%-full ring
 * would be unreadable); the real percentage is still shown as the center
 * label, and hitting/passing 100% switches the ring to the "achieved" color.
 */
export function DonutChart({ percentage, label, sublabel, size = 120 }: DonutChartProps) {
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const dashOffset = circumference * (1 - clamped / 100);
  const achieved = percentage >= 100;

  return (
    <div className={styles.wrap} style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className={styles.track}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <circle
          className={achieved ? styles.progressAchieved : styles.progress}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="48%" textAnchor="middle" className={styles.percentText}>
          {Math.round(percentage)}%
        </text>
      </svg>
      <div className={styles.label}>{label}</div>
      <div className={styles.sublabel}>{sublabel}</div>
    </div>
  );
}
