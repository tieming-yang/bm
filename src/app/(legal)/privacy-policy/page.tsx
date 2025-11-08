import Link from "next/link";

const sections = [
  {
    id: "introduction",
    title: "1. Introduction 簡介",
    paragraphs: [
      "This Privacy Policy explains how Beyond Digital Media (“we”, “our”, “us”) collects, uses, and protects personal information when you access our websites, purchase the Glory Share (榮耀份額) membership, or interact with our creative and educational platforms. By using our services, you agree to the practices described in this policy.",
      "本《隱私政策》說明 Beyond Digital Media（以下簡稱「本公司」）在您使用我們的網站、購買榮耀份額（Glory Share）會員資格或參與相關創作與教育服務時，如何蒐集、使用與保護您的個人資料。使用本服務即表示您同意本政策之內容。",
    ],
  },
  {
    id: "information-we-collect",
    title: "2. Information We Collect 我們蒐集的資料",
    paragraphs: [
      "We collect information to provide and improve our services. This may include account data (name, email, language preference, profile photo), payment data processed securely by Stripe, technical data (IP address, browser, device info, cookies), and usage data (pages visited, clicks, interactions).",
      "為提供及改善服務，我們可能蒐集以下資料：帳號資料（姓名、電子郵件、語言偏好、個人頭像）、付款資料（由 Stripe 安全處理）、技術資料（IP、瀏覽器、裝置、Cookie）以及使用資料（瀏覽頁面、點擊紀錄、內容互動）。",
    ],
  },
  {
    id: "how-we-use",
    title: "3. How We Use Your Information 我們如何使用資料",
    paragraphs: [
      "We use collected data to: (1) deliver Glory Share benefits, (2) process payments via Stripe, (3) send updates and newsletters, (4) improve the site with analytics, and (5) comply with legal obligations and prevent misuse.",
      "我們使用資料以：1) 提供榮耀份額權益，2) 透過 Stripe 處理付款，3) 傳遞通知與電子報，4) 分析並改善網站體驗，5) 遵守法律並防範濫用或詐欺。",
    ],
  },
  {
    id: "storage-security",
    title: "4. Data Storage and Security 資料保存與安全",
    paragraphs: [
      "Your information is securely stored using Firebase (Google Cloud) and related services. We apply encryption, restricted access, and HTTPS to protect your data.",
      "您的資料將安全地保存於 Firebase（Google Cloud）等系統中，我們採取加密、權限控管與 HTTPS 以確保資料安全。",
    ],
  },
  {
    id: "data-sharing",
    title: "5. Data Sharing 資料共享",
    paragraphs: [
      "We do not sell or rent personal data. We only share information with trusted partners when necessary: Stripe (payments), Firebase (storage/auth), and Vercel (hosting/analytics).",
      "我們不會販售或出租個資，僅在必要時與可信的合作夥伴共享：Stripe（付款）、Firebase（儲存與驗證）、Vercel（託管與分析）。",
    ],
  },
  {
    id: "cookies",
    title: "6. Cookies and Analytics Cookie 與分析",
    paragraphs: [
      "We use cookies to understand usage patterns and personalize experiences. You may disable cookies in your browser, but some features may be affected.",
      "我們使用 Cookie 了解使用者行為並優化體驗。您可在瀏覽器停用 Cookie，但部分功能可能受影響。",
    ],
  },
  {
    id: "retention",
    title: "7. Data Retention 資料保存期限",
    paragraphs: [
      "We retain information while your account remains active or as needed for legal compliance. You may request deletion at any time (see Section 9).",
      "在帳號啟用期間或法律要求的保存期限內，我們會保留資料。您可隨時申請刪除帳號（詳見第 9 條）。",
    ],
  },
  {
    id: "transfers",
    title: "8. International Transfers 跨國資料傳輸",
    paragraphs: [
      "Our servers are hosted in the United States and may process data globally. By using our services, you consent to such transfers.",
      "我們的伺服器位於美國，並可能於全球各地處理資料。使用本服務即表示您同意此類跨國處理。",
    ],
  },
  {
    id: "your-rights",
    title: "9. Your Rights 您的權利",
    paragraphs: [
      "You may request access, correction, deletion, or opt out of newsletters anytime by contacting support@beyonddigital.media.",
      "您可要求查閱、更正、刪除資料，或取消電子報，請聯絡 support@beyonddigital.media。",
    ],
  },
  {
    id: "children",
    title: "10. Children’s Privacy 兒童隱私",
    paragraphs: [
      "Our services are not directed toward children under 13, and we do not knowingly collect data from minors without parental consent.",
      "本服務並非針對 13 歲以下兒童設計，未經家長同意，我們不會主動蒐集未成年者資料。",
    ],
  },
  {
    id: "changes",
    title: "11. Changes to This Policy 政策修訂",
    paragraphs: [
      "We may update this Privacy Policy periodically. Updates will be posted with a revised “Last updated” date.",
      "本公司可能定期更新本政策，並於官網公告最新「最後修改日期」。",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold">Privacy Policy (隱私政策)</h1>
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
