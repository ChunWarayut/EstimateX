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
        <li>PromptPay: 08x-xxx-xxxx</li>
        <li>Ko-fi: <a className="underline" href="#">kofi.com/estimatex</a></li>
        <li>GitHub Sponsors: <a className="underline" href="#">github.com/sponsors/yourname</a></li>
      </ul>
    </section>
  );
}

