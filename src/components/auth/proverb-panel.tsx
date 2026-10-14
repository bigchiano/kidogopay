/** Haba na haba hujaza kibaba: little by little fills the measure. Dots fill from the bottom up. */
export function ProverbPanel() {
  const cols = 13;
  const rows = 9;
  const dots: { x: number; y: number; r: number; o: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fill = r / (rows - 1); // 0 at the top, 1 at the bottom
      const wobble = ((c * 7 + r * 11) % 5) / 10;
      const level = Math.min(1, Math.max(0, fill * 1.25 - 0.2 + wobble * 0.35));
      dots.push({ x: c * 26 + 13, y: r * 26 + 13, r: 1.6 + level * 8.4, o: 0.18 + level * 0.82 });
    }
  }
  return (
    <aside className="on-dark relative hidden overflow-hidden bg-adire text-chalk lg:flex lg:flex-col lg:justify-between lg:p-14">
      <svg viewBox={`0 0 ${cols * 26} ${rows * 26}`} className="w-full max-w-[460px]" aria-hidden="true">
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#ffb61d" opacity={d.o} />
        ))}
      </svg>
      <blockquote>
        <p className="max-w-[12ch] font-wide text-[clamp(2.4rem,3.6vw,3.6rem)] leading-[0.98] font-extrabold tracking-[-0.04em]">
          Haba na haba hujaza kibaba.
        </p>
        <p className="mt-5 max-w-[38ch] text-lg leading-relaxed text-chalk/70">
          Little by little fills the measure. It&apos;s a Swahili proverb, and the idea behind our name: kidogo means
          little.
        </p>
      </blockquote>
    </aside>
  );
}
