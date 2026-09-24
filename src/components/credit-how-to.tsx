const steps = [
  {
    number: '01',
    title: 'Keep the code private',
    body: 'Copy the credit code and keep it private. Anyone who gets access to it may be able to redeem it first.'
  },
  {
    number: '02',
    title: 'Follow the offer instructions',
    body: 'Use only the official OpenAI redemption flow or the redemption link provided with this specific offer. Sign in to the account you want credited.'
  },
  {
    number: '03',
    title: 'Check the terms',
    body: 'Check eligibility, expiration, and what the offer covers. API credits are not a ChatGPT subscription or an API key. Never paste a credit code into an API-key field or an untrusted site.'
  },
];

export default function CreditHowTo() {
  return <section aria-labelledby="credit-help-title" className="mt-10 border-t border-[#334328] pt-7 sm:mt-14 sm:pt-9">
    <div className="grid gap-6 lg:grid-cols-[.72fr_1.28fr] lg:gap-10">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#9ab17f]">A QUICK FIELD GUIDE</p>
        <h2 id="credit-help-title" className="mt-3 max-w-sm text-2xl font-black leading-tight tracking-[-.05em] sm:text-3xl">HOW TO USE<br className="hidden sm:block" /> OPENAI CREDITS</h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#b4c6a2]">Redemption steps depend on the specific offer. Follow the instructions that came with your code, and use official OpenAI pages only.</p>
      </div>
      <ol className="divide-y divide-[#263621] border-y border-[#263621]">
        {steps.map(step => <li key={step.number} className="grid grid-cols-[2.5rem_1fr] gap-3 py-4 sm:grid-cols-[3rem_1fr] sm:gap-4 sm:py-5">
          <span className="pt-0.5 font-mono text-xs font-bold text-[#b9ff52]">{step.number}</span>
          <div><h3 className="text-sm font-bold text-[#f2f7e9]">{step.title}</h3><p className="mt-1.5 text-xs leading-5 text-[#a5b797] sm:text-sm">{step.body}</p></div>
        </li>)}
      </ol>
    </div>
  </section>;
}
