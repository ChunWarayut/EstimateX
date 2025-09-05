export const metadata = {
  title: 'Donate',
  description: 'สนับสนุนการพัฒนา EstimateX'
};

export default function Donate() {
  return (
    <section className="glass rounded-2xl p-6">
      <h1 className="text-2xl font-semibold mb-2">สนับสนุน (Donate)</h1>
      <p className="text-white/80 mb-4">ขอบคุณที่สนับสนุนโปรเจกต์โอเพ่นซอร์สนี้</p>
      <ul className="space-y-2">
        <li>PromptPay: 091-813-6426</li>
        <li>Ko-fi: <a className="underline" href="https://ko-fi.com/estimatex">ko-fi.com/estimatex</a></li>
        <li>GitHub Sponsors: <a className="underline" href="https://github.com/sponsors/ChunWarayut">github.com/sponsors/ChunWarayut</a></li>
      </ul>
    </section>
  );
}

