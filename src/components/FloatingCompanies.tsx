import Image from "next/image";

const COMPANIES = [
  ["apple", "Apple"], ["amazon", "Amazon"], ["broadcom", "Broadcom"], ["cocacola", "Coca-Cola"],
  ["intuit", "Intuit"], ["mastercard-brand", "Mastercard"], ["meta", "Meta"], ["netflix", "Netflix"],
  ["paypal", "PayPal"], ["qualcomm", "Qualcomm"], ["uber", "Uber"], ["visa", "Visa"],
  ["adobe", "Adobe"], ["oracle", "Oracle"], ["salesforce", "Salesforce"], ["walmart", "Walmart"],
] as const;

const POSITIONS = [
  ["5%", "19%"], ["3%", "42%"], ["6%", "67%"], ["27%", "9%"],
  ["37%", "86%"], ["53%", "10%"], ["72%", "14%"], ["88%", "22%"],
  ["94%", "48%"], ["83%", "75%"], ["66%", "88%"], ["48%", "76%"],
  ["22%", "84%"], ["2%", "45%"], ["92%", "68%"], ["94%", "86%"],
] as const;

export default function FloatingCompanies() {
  return (
    <div className="floating-companies" aria-hidden="true">
      {COMPANIES.map(([slug, name], index) => (
        <span
          className="floating-company"
          key={slug}
          style={{
            left: POSITIONS[index][0],
            top: POSITIONS[index][1],
            animationDelay: `${-(index * 0.8)}s`,
            animationDuration: `${11 + (index % 5) * 1.7}s`,
          }}
        >
          <Image src={`/company-logos/${slug}.svg`} alt={name} width={48} height={30} />
        </span>
      ))}
    </div>
  );
}
