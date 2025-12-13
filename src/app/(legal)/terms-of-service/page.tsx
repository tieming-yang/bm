"use client";

import Link from "next/link";

const sections = [
  {
    id: "overview",
    title: "1. Overview 概述",
    paragraphs: [
      "We are Beyond Digital Media, a creative studio dedicated to faith-based storytelling and artistic expression.",
      "We offer multiple membership and support plans (the “Support Plans”), including Lifetime, Yearly, and Monthly options, which provide access to curated creative content, events, and member benefits within the Beyond Digital Media ecosystem. We clarify that these plans represent creative support and participation, not charitable donations or financial investments.",
      "我們是 Beyond Digital Media，一個以信仰為核心的創意媒體團隊，致力於以藝術與故事傳遞真理。",
      "我們提供多種支持方案（包含終身、年度與月度方案），讓成員能參與創作內容、活動與專屬權益。我們特此聲明，所有方案皆屬創作支持與同行關係，並非募款、捐贈或投資計畫。",
    ],
  },
  {
    id: "eligibility",
    title: "2. Eligibility 資格",
    paragraphs: [
      "We require that you be at least 18 years old, or have valid guardian consent, to join our Support Plans. We require all registration information to be accurate and current.",
      "我們要求您年滿 18 歲，或經監護人同意後方可註冊。我們要求您所提供的註冊資訊須正確且為最新資料。",
    ],
  },
  {
    id: "membership",
    title: "3. Membership Plans 會員方案條款",
    paragraphs: [
      "We currently offer three membership plans: (1) Lifetime Honor Share, (2) Yearly Support, and (3) Monthly Support. We define and present the specific benefits of each plan on our official website or purchase pages at the time of subscription.",
      "We define the Lifetime Honor Share as a one-time, lifetime plan that grants permanent access to designated creative content, recognition privileges, inheritance rights, and Bible-related gift discounts as specified at the time of purchase.",
      "We define the Yearly and Monthly Support plans as recurring subscriptions that grant access to selected digital content and benefits only during the active subscription period. We terminate access automatically if the subscription is canceled or payment fails.",
      "We restrict all memberships to individual, personal, and non-commercial use. We prohibit sharing, resale, sublicensing, or redistribution of any membership content.",
      "We grant inheritance or transfer rights only to Lifetime Honor Share members. We limit such transfers to direct descendants and require formal written approval from us before any transfer becomes effective.",
      "We reserve the right to adjust pricing, features, content scope, or availability of any plan for future offerings. We confirm that existing members retain access according to the terms in effect at the time of purchase.",
      "我們目前提供三種會員支持方案：（1）終身榮耀份額、（2）年度支持、（3）月度支持。我們以購買當下官方頁面所載內容作為各方案權益之依據。",
      "我們將終身榮耀份額定義為一次性、永久方案，提供指定創作內容之永久存取、名錄載入、傳承權，以及聖經禮品相關折扣。",
      "我們將年度與月度支持方案定義為訂閱制方案，僅於訂閱有效期間內提供內容與權益；若取消或付款失敗，我們將自動終止存取權限。",
      "我們限制所有會員方案僅限個人、非商業使用，並禁止分享、轉售、再授權或散布任何會員內容。",
      "我們僅允許終身榮耀份額具備傳承或轉移權利，且僅限直系後代，並須經我們書面核准。",
      "我們保留未來調整價格、內容與方案結構之權利；已購會員仍依購買當時條款享有其權益。",
    ],
  },
  {
    id: "use-of-service",
    title: "4. Use of Service 服務使用",
    paragraphs: [
      "We require that you use all membership content solely for lawful, personal, and non-commercial purposes, and only in accordance with your active plan.",
      "我們要求您僅依所購方案內容，以合法、個人、非商業目的使用本服務。",
    ],
  },
  {
    id: "intellectual-property",
    title: "5. Intellectual Property 智慧財產權",
    paragraphs: [
      "We own or license all content, including artwork, video, music, design, and written materials. We grant members a limited, personal, non-commercial license only.",
      "我們擁有或合法授權所有內容（包含影像、音樂、設計與文字）。我們僅授予會員非商業性、個人使用的有限授權。",
    ],
  },
  {
    id: "payment-processing",
    title: "6. Payment Processing 付款處理",
    paragraphs: [
      "We process all payments and subscriptions securely through Stripe. We confirm that recurring plans renew automatically unless canceled before the renewal date.",
      "我們透過 Stripe 安全處理所有一次性付款與訂閱。訂閱方案將自動續訂，除非於續訂日前取消。",
    ],
  },
  {
    id: "no-financial-status",
    title: "7. No Financial or Charitable Status 非投資或募款性質",
    paragraphs: [
      "We clarify that all membership payments represent creative support and content access rights only. We do not treat any payment as a donation, security, equity, or financial product.",
      "我們明確說明，所有方案之付款皆屬創作支持與內容使用權，不構成捐贈、證券、股權或任何金融商品。",
    ],
  },
  {
    id: "termination",
    title: "8. Termination 終止權益",
    paragraphs: [
      "We reserve the right to suspend or revoke access if a member violates these Terms or misuses our services.",
      "若會員違反本條款或不當使用服務，我們保留暫停或終止其權益之權利。",
    ],
  },
  {
    id: "disclaimer",
    title: "9. Disclaimer 免責聲明",
    paragraphs: [
      "We provide the Service on an “as is” basis and make no guarantees regarding uninterrupted access or error-free content.",
      "我們依「現況」提供本服務，且不保證服務不中斷或內容完全無誤。",
    ],
  },
  {
    id: "limitation",
    title: "10. Limitation of Liability 責任限制",
    paragraphs: [
      "We, to the fullest extent permitted by law, disclaim liability for indirect, incidental, or consequential damages arising from use of the Service.",
      "在法律允許的最大範圍內，我們不對因使用本服務所引起的任何間接或附帶損害承擔責任。",
    ],
  },
  {
    id: "privacy",
    title: "11. Privacy 隱私",
    paragraphs: [
      "We handle your personal data in accordance with our Privacy Policy, and we require your consent to such processing when you use our Service.",
      "我們將依據《隱私政策》處理您的個人資料；您使用本服務即表示同意相關資料處理方式。",
    ],
  },
  {
    id: "governing-law",
    title: "12. Governing Law 準據法",
    paragraphs: [
      "We govern and interpret these Terms under the laws of the State of Texas, USA, and we require that disputes be resolved in the courts of Harris County, Texas.",
      "我們依美國德州法律管轄並解釋本條款，並要求任何爭議於德州哈里斯郡法院解決。",
    ],
  },
  {
    id: "changes",
    title: "13. Changes to Terms 條款修訂",
    paragraphs: [
      "We reserve the right to update or modify these Terms at any time, and we consider continued use of the Service as acceptance of such changes.",
      "我們得隨時修訂本條款；會員持續使用本服務即視為同意更新內容。",
    ],
  },
  {
    id: "contact",
    title: "14. Contact 聯絡方式",
    paragraphs: [
      "We invite you to contact us at beyonddigitalmedia.art@gmail.com for any questions regarding these Terms.",
      "如對本條款有任何疑問，請透過 beyonddigitalmedia.art@gmail.com 與我們聯絡。",
    ],
  },
  {
    id: "final-authority",
    title: "15. Final Authority on Benefits 權益最終解釋權",
    paragraphs: [
      "We state that all membership benefits, features, privileges, discounts, access rights, recognitions, events, gifts, and related offerings described on our website, purchase pages, marketing materials, or other communications are subject to our final interpretation, adjustment, and determination.",
      "We retain sole and final authority to define, modify, replace, limit, suspend, or discontinue any benefit, in whole or in part, at any time, provided that we do not retroactively remove the core access rights explicitly granted under the active plan at the time of purchase.",
      "We clarify that no statement, listing, illustration, or example creates a legally binding obligation beyond the rights expressly granted under these Terms.",
      "我們聲明，所有於官網、購買頁面、行銷素材或其他說明中所列之會員權益，其最終解釋權、調整權與決定權皆屬我們所有。",
      "我們保留在任何時間依實際營運與創作需求，對任何會員權益進行定義、修改、替換、限制、暫停或終止之最終權利，但不會追溯性剝奪會員於購買當下方案中已明確授予的核心存取權限。",
      "我們進一步說明，任何範例、說明或列舉內容，均不構成超出本條款所明示權利之外的法律義務。",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="container max-w-3xl px-4 py-12 mx-auto space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-semibold">Terms of Service (服務條款)</h1>
        <p className="text-sm text-muted-foreground">Last updated: 12-12-2025</p>
      </header>

      <nav className="flex flex-wrap text-sm gap-3 text-primary">
        {sections.map((section) => (
          <Link
            key={section.id}
            href={`#${section.id}`}
            className="underline-offset-4 hover:underline"
          >
            {section.title}
          </Link>
        ))}
      </nav>

      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="pt-6 border-t space-y-3 scroll-mt-24 border-border"
        >
          <h2 className="text-xl font-semibold">{section.title}</h2>
          {section.paragraphs.map((text, idx) => (
            <p key={idx} className="text-sm leading-6 text-muted-foreground">
              {text}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
