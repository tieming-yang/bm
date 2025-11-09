"use client";

import Link from "next/link";

const sections = [
  {
    id: "overview",
    title: "1. Overview 概述",
    paragraphs: [
      "Beyond Digital Media is a creative studio dedicated to faith-based storytelling and artistic expression.",
      "The Glory Share (榮耀份額) is a one-time lifetime membership plan that provides access to exclusive creative content, project previews, workshops, and participation benefits within the Beyond Digital Media ecosystem. It is not a charitable donation or financial investment.",
      "Beyond Digital Media 是一個以信仰為核心的創意媒體團隊，致力於以藝術和故事傳遞真理。",
      "榮耀份額（Glory Share）為一次性、終身制會員方案，讓成員能夠獲得專屬創作內容、計畫搶先預覽、工作坊以及參與式榮耀權益。此方案並非募款、捐贈或投資計畫。",
    ],
  },
  {
    id: "eligibility",
    title: "2. Eligibility 資格",
    paragraphs: [
      "You must be 18 years or older or have a guardian’s consent to join. All registration information must be accurate and current.",
      "您必須年滿 18 歲，或經監護人同意後方可註冊。所提供的註冊資訊須正確且為最新資料。",
    ],
  },
  {
    id: "membership",
    title: "3. Glory Share Membership 榮耀份額會員條款",
    paragraphs: [
      "The Glory Share membership is a one-time lifetime plan currently priced at USD 77 (excluding tax). The price may change in future offerings, but existing members will retain their original benefits.",
      "Membership is for individual, personal use only. Each Glory Share is tied to one person and may not be transferred, sold, rented, or shared beyond the member’s immediate household (defined as spouse and direct descendants such as children or grandchildren).",
      "If a member wishes to transfer their membership to a direct descendant, they must submit a formal transfer request to Beyond Digital Media for verification and approval. The transfer is effective only upon written confirmation from Beyond Digital Media.",
      "Use of Glory Share content for public viewing, classroom instruction, live streaming, screenings, or community presentations is strictly prohibited without prior written authorization.",
      "Members may not download, copy, distribute, broadcast, or upload any content obtained through their membership. All materials remain the intellectual property of Beyond Digital Media.",
      "If you represent an organization, institution, school, church, or collective entity and wish to use or display Beyond Digital Media content, you must first contact us at beyonddigitalmedia.art@gmail.com to obtain a separate license or written permission.",
      "Beyond Digital Media reserves the right to introduce new membership tiers or benefits. Glory Share memberships will continue to provide lifetime access under the terms active at the time of purchase.",
      "榮耀份額為一次性終身會員方案，目前價格為 77 美元（未稅）。未來價格可能調整，但不影響已購會員的既有權益。",
      "會員資格僅限於個人、非商業用途。每一份榮耀份額僅屬單一個人，不得轉讓、出售、出租或與他人共用，除非為直系家庭成員（配偶、子女、孫子女）之間的合理家庭使用。",
      "若會員希望將會員資格轉移給直系後代，須向 Beyond Digital Media 提出正式申請，經審核與書面同意後方可生效。未經批准之轉讓皆屬無效。",
      "未經書面授權，嚴禁於公開場合、課堂、直播、放映或社群活動中播放或展示榮耀份額內容。",
      "會員不得下載、複製、再散佈、轉播或上傳任何會員內容，所有素材及權利均屬 Beyond Digital Media 所有。",
      "若您為任何機構、團體、學校或教會等組織，並希望使用或展示 Beyond Digital Media 的內容，請先以電子郵件至 beyonddigitalmedia.art@gmail.com 聯絡以申請授權。",
      "Beyond Digital Media 保留推出新會員等級或權益的權利，已購榮耀份額會員將繼續依購買時之條款享有終身權益。",
    ],
  },
  {
    id: "use-of-service",
    title: "4. Use of Service 服務使用",
    paragraphs: [
      "You agree to use the Service only for lawful, personal, and non-commercial purposes. You may not copy, redistribute, or publicly display membership content. Use of membership materials for commercial, public, or institutional purposes is prohibited.",
      "您同意僅以合法、個人、非商業目的使用本服務。不得複製、再散布或公開播放會員內容，亦不得將會員素材用於商業、公共或機構用途。",
    ],
  },
  {
    id: "intellectual-property",
    title: "5. Intellectual Property 智慧財產權",
    paragraphs: [
      "All content (artwork, video, music, design, and writing) is owned or licensed by Beyond Digital Media. Members receive a limited, non-commercial, personal-use license only.",
      "所有內容（包含影像、音樂、設計與文字）皆為 Beyond Digital Media 之所有或授權使用。會員僅享有非商業性、個人使用的有限授權。",
    ],
  },
  {
    id: "payment-processing",
    title: "6. Payment Processing 付款處理",
    paragraphs: [
      "Payments are securely processed via Stripe. Beyond Digital Media does not store payment credentials. By purchasing, you agree to Stripe’s Terms of Service. All prices are in USD unless otherwise stated.",
      "所有付款皆透過 Stripe 安全處理。Beyond Digital Media 不保存您的付款資訊。完成付款即表示您同意遵守 Stripe 服務條款。所有金額除另有說明外均以美元計價。",
    ],
  },
  {
    id: "no-financial-status",
    title: "7. No Financial or Charitable Status 非投資或募款性質",
    paragraphs: [
      "The Glory Share represents creative participation and spiritual partnership, not a donation or security. Payments are not tax-deductible and do not generate profit, dividends, or ownership rights.",
      "榮耀份額代表的是創作同行與屬靈夥伴關係，而非捐贈或金融性商品。所有付款不具備抵稅資格，且不產生任何分紅、股權或財務回報。",
    ],
  },
  {
    id: "termination",
    title: "8. Termination 終止權益",
    paragraphs: [
      "Beyond Digital Media may suspend or revoke access if a member violates these Terms or misuses the Service.",
      "若會員違反條款或不當使用服務，Beyond Digital Media 保留暫停或終止其權益之權利。",
    ],
  },
  {
    id: "disclaimer",
    title: "9. Disclaimer 免責聲明",
    paragraphs: [
      "The Service is provided “as is.” Beyond Digital Media makes no warranty regarding uninterrupted access or error-free content.",
      "本服務依「現況」提供，Beyond Digital Media 不保證服務不中斷或內容完全無誤。",
    ],
  },
  {
    id: "limitation",
    title: "10. Limitation of Liability 責任限制",
    paragraphs: [
      "To the fullest extent permitted by law, Beyond Digital Media and its affiliates are not liable for indirect or consequential damages arising from use of the Service.",
      "在法律允許的最大範圍內，Beyond Digital Media 及其附屬機構對因使用本服務所引起的間接或附帶損害不承擔責任。",
    ],
  },
  {
    id: "privacy",
    title: "11. Privacy 隱私",
    paragraphs: [
      "Your data is handled according to our Privacy Policy. By using the Service, you consent to such processing.",
      "您的個人資料將依據《隱私政策》進行處理。使用本服務即表示您同意相關資料使用。",
    ],
  },
  {
    id: "governing-law",
    title: "12. Governing Law 準據法",
    paragraphs: [
      "These Terms are governed by the laws of the State of Texas, USA. Any disputes shall be resolved in the courts of Harris County, Texas.",
      "本條款依美國德州法律管轄並據以解釋。任何爭議將於德州哈里斯郡法院解決。",
    ],
  },
  {
    id: "changes",
    title: "13. Changes to Terms 條款修訂",
    paragraphs: [
      "Beyond Digital Media may update these Terms at any time. Updates take effect upon publication, and continued use constitutes acceptance.",
      "Beyond Digital Media 得隨時修訂本條款，修改後即時生效。會員持續使用本服務視為同意更新內容。",
    ],
  },
  {
    id: "contact",
    title: "14. Contact 聯絡方式",
    paragraphs: [
      "For any inquiries regarding these Terms, please contact us at beyonddigitalmedia.art@gmail.com.",
      "如有關於本條款之任何問題，請聯絡：beyonddigitalmedia.art@gmail.com。",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold">Terms of Service (服務條款)</h1>
        <p className="text-sm text-muted-foreground">Last updated: 11-08-2025</p>
      </header>

      <nav className="flex flex-wrap gap-3 text-sm text-primary">
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
          className="space-y-3 scroll-mt-24 border-t border-border pt-6"
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
