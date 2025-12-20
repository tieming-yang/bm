import { BEYOND_EMAIL } from "@/app/(marketing)/contact/page";
import Link from "next/link";

const sections = [
  {
    id: "introduction",
    title: "1. Introduction 簡介",
    paragraphs: [
      "This Privacy Policy explains how Beyond Digital Media (\"we\", \"our\", \"us\") collects, uses, stores, and protects personal information when you access our websites, create an account, purchase or participate in our membership plans (including Lifetime Glory Share, Monthly Support, Annual Support, and Organization Lifetime Glory Share), or interact with our creative, educational, and faith-based platforms. By using our services, you agree to the practices described in this policy.",
      "本《隱私政策》說明 Beyond Digital Media（以下稱「我們」）於您使用我們的網站、建立帳號、購買或參與各項會員方案（包含終身榮耀份額、每月支持、每年支持、組織終身榮耀份額），或使用我們的創作、教育與信仰平台時，如何蒐集、使用、保存與保護您的個人資料。使用本服務即表示您同意本政策之內容。"
    ]
  },
  {
    id: "information-we-collect",
    title: "2. Information We Collect 我們蒐集的資料",
    paragraphs: [
      "We collect information necessary to operate our services and enforce our Terms of Service. This may include account information (such as name, email address, organization email, language preference, and profile details), payment information processed securely by Stripe, technical data (IP address, browser type, device information, cookies), usage data (pages viewed, interactions, access logs), and information submitted as part of organization or custom content requests.",
      "為提供服務並執行《服務條款》，我們可能蒐集以下資料：帳號資訊（包含姓名、電子郵件、組織電子郵件、語言偏好與個人資料）、付款資訊（由 Stripe 安全處理）、技術資料（IP 位址、瀏覽器類型、裝置資訊、Cookie）、使用紀錄（瀏覽頁面、互動行為、存取紀錄），以及組織方案或內容提交相關資料。"
    ]
  },
  {
    id: "how-we-use",
    title: "3. How We Use Your Information 我們如何使用資料",
    paragraphs: [
      "We use collected information to: (1) provide and manage membership benefits, (2) process payments and subscriptions via Stripe, (3) deliver content, notices, and organization communications (including custom music delivery), (4) maintain platform security and prevent misuse, fraud, or unauthorized distribution, (5) enforce our Terms of Service, including suspension or termination of accounts, and (6) comply with legal obligations.",
      "我們使用所蒐集之資料以：1) 提供並管理會員權益，2) 透過 Stripe 處理付款與訂閱，3) 傳遞內容、通知與組織相關通訊（包含客製音樂交付），4) 維護平台安全並防止濫用、詐欺或未經授權之散布，5) 執行《服務條款》（包含帳號暫停或終止），以及 6) 遵守法律義務。"
    ]
  },
  {
    id: "storage-security",
    title: "4. Data Storage and Security 資料保存與安全",
    paragraphs: [
      "We store personal information using industry-standard cloud services (including Firebase / Google Cloud). We apply reasonable technical and organizational safeguards such as encryption, access controls, and HTTPS. However, no system is completely secure, and we do not guarantee absolute security.",
      "我們使用業界標準之雲端服務（包含 Firebase / Google Cloud）保存個人資料，並採取加密、存取控管與 HTTPS 等合理安全措施。然而，任何系統皆無法保證絕對安全。"
    ]
  },
  {
    id: "data-sharing",
    title: "5. Data Sharing 資料共享",
    paragraphs: [
      "We do not sell or rent personal information. We may share data with trusted service providers strictly as necessary to operate our services, including Stripe (payment processing), Firebase (authentication and storage), Vercel (hosting and analytics), and other infrastructure providers. We may also disclose information where required by law, or to protect our rights, property, content, or users.",
      "我們不會販售或出租個人資料。僅於營運所需範圍內，與可信之服務供應商共享資料，包含 Stripe（付款處理）、Firebase（驗證與儲存）、Vercel（託管與分析）及其他基礎設施服務商。於法律要求或為保護我們的權利、財產、內容或使用者時，我們亦可能依法揭露相關資料。"
    ]
  },
  {
    id: "cookies",
    title: "6. Cookies and Analytics Cookie 與分析",
    paragraphs: [
      "We use cookies to understand usage patterns and personalize experiences. You may disable cookies in your browser, but some features may be affected.",
      "我們使用 Cookie 了解使用者行為並優化體驗。您可在瀏覽器停用 Cookie，但部分功能可能受影響。"
    ]
  },
  {
    id: "retention",
    title: "7. Data Retention 資料保存期限",
    paragraphs: [
      "We retain personal information for as long as an account remains active, or as reasonably necessary to operate our services, comply with legal obligations, resolve disputes, enforce our agreements, or prevent abuse. Some information may be retained after account deletion where legally required or operationally necessary.",
      "我們於帳號存續期間，或於合理必要範圍內保存個人資料，以提供服務、遵守法律、處理爭議、執行協議或防止濫用。即使帳號刪除，部分資料仍可能依法或基於營運需要而保留。"
    ]
  },
  {
    id: "transfers",
    title: "8. International Transfers 跨國資料傳輸",
    paragraphs: [
      "Our servers are hosted in the United States and may process data globally. By using our services, you consent to such transfers.",
      "我們的伺服器位於美國，並可能於全球各地處理資料。使用本服務即表示您同意此類跨國處理。"
    ]
  },
  {
    id: "your-rights",
    title: "9. Your Rights 您的權利",
    paragraphs: [
      "You may request access to, correction of, or deletion of your personal data by contacting us. Such requests are subject to identity verification, legal requirements, and our legitimate business and security interests. Certain data may not be eligible for deletion.",
      "您可透過聯絡我們要求查閱、更正或刪除個人資料。相關請求須經身分驗證，並受法律規定、營運需求與安全考量之限制，部分資料可能無法刪除。"
    ]
  },
  {
    id: "termination-and-data",
    title: "10. Account Termination and Data Deletion 帳號終止與資料處理",
    paragraphs: [
      "We may suspend, terminate, or delete accounts in accordance with our Terms of Service. Upon termination or deletion, we may remove or restrict access to associated data, subject to legal retention requirements.",
      "We are not responsible for loss of access to content, benefits, or communications resulting from account termination, deletion, or incorrect account information.",
      "我們得依《服務條款》暫停、終止或刪除帳號。於帳號終止或刪除後，我們得依法或基於營運需要移除或限制相關資料之存取。",
      "因帳號終止、刪除或帳號資訊錯誤而導致之內容、權益或通訊存取損失，我們不承擔責任。"
    ]
  },
  {
    id: "children",
    title: "11. Children’s Privacy 兒童隱私",
    paragraphs: [
      "Our services are not directed toward children under 13, and we do not knowingly collect data from minors without parental consent.",
      "本服務並非針對 13 歲以下兒童設計，未經家長同意，我們不會主動蒐集未成年者資料。"
    ]
  },
  {
    id: "changes",
    title: "12. Changes to This Policy 政策修訂",
    paragraphs: [
      "We may update this Privacy Policy periodically. Updates will be posted with a revised \"Last updated\" date.",
      "本公司可能定期更新本政策，並於官網公告最新「最後修改日期」。"
    ]
  },
  {
    id: "logs-and-evidence",
    title: "13. Logs and Evidence Preservation 存取紀錄與證據保全",
    paragraphs: [
      "We may collect, generate, and retain security and access logs (including IP addresses, device identifiers, timestamps, and activity records) to operate our services, prevent abuse, detect fraud, enforce our Terms of Service, and preserve evidence for disputes, chargebacks, or legal claims.",
      "We may retain such logs even after account deletion where reasonably necessary for security, abuse prevention, dispute resolution, or legal compliance.",
      "我們得蒐集、生成並保存安全與存取紀錄（包含 IP 位址、裝置識別資訊、時間戳記與行為紀錄），以提供服務、預防濫用、偵測詐欺、執行《服務條款》，並於爭議、拒付或法律主張中進行證據保全。",
      "於安全、防止濫用、處理爭議或遵守法律之合理必要範圍內，即使帳號刪除，我們仍得保留上述紀錄。"
    ]
  },
  {
    id: "automated-processing",
    title: "14. Automated Processing 自動化處理",
    paragraphs: [
      "We may use automated or semi-automated systems to detect abuse, unauthorized distribution, suspicious activity, or security risks, and to help us enforce our Terms of Service.",
      "We do not guarantee manual review of every automated flag or decision, and we may take actions based on automated signals where we determine it is necessary to protect our services, content, or users.",
      "我們得使用自動化或半自動化系統以偵測濫用、未經授權之散布、可疑活動或安全風險，並協助我們執行《服務條款》。",
      "我們不保證對每一項自動化標記或判定皆進行人工審查；於我們認定為保護服務、內容或使用者之必要情況下，我們得依自動化訊號採取相應措施。"
    ]
  },
  {
    id: "no-duty-to-monitor",
    title: "15. No Duty to Monitor 無監控義務",
    paragraphs: [
      "We do not assume any duty to monitor all user activity or communications. Our enforcement actions are discretionary, and our failure to act in one instance does not waive our right to act in other instances.",
      "我們不負有監控所有使用者活動或通訊之義務。我們的執行與處置屬於自主裁量；即使我們在某次情況未採取行動，亦不構成放棄我們於其他情況採取行動之權利。"
    ]
  },
  {
    id: "jurisdiction-rights",
    title: "16. Jurisdiction-Specific Rights 法域特定權利",
    paragraphs: [
      "We provide privacy rights and disclosures to the extent required by applicable law. Depending on your location, certain rights may apply, and certain requests may be limited where we have legal obligations, security requirements, or legitimate operational needs.",
      "We may require identity verification and may deny or restrict requests where permitted by law, including to prevent fraud, protect our services and users, enforce our agreements, or comply with legal requirements.",
      "我們依適用法律之要求提供隱私權利與揭露內容。視您的所在地而定，部分權利可能適用，且在法律允許範圍內，基於法律義務、安全需求或合理營運需要，部分請求可能受限制。",
      "我們得要求身分驗證，並得於法律允許範圍內拒絕或限制特定請求（包含為防止詐欺、保護服務與使用者、執行協議或遵守法律要求）。"
    ]
  },
  {
    id: "privacy-force-majeure",
    title: "17. Service Disruptions 服務中斷",
    paragraphs: [
      "We may experience service interruptions, delays, or data-access limitations due to maintenance, outages, platform failures, third-party provider disruptions, or events beyond our reasonable control. We do not guarantee uninterrupted availability of our services.",
      "We will make reasonable efforts to restore service, but we are not liable for disruptions or inability to access data caused by such events.",
      "我們可能因維護、故障、平台異常、第三方服務中斷或其他超出我們合理控制之事件而出現服務中斷、延遲或資料存取限制。我們不保證服務可用性不中斷。",
      "我們將在合理範圍內努力恢復服務，但對於因上述事件所致之中斷或無法存取資料之情形不承擔責任。"
    ]
  },
  {
    id: "language-priority",
    title: "18. Language Priority 語言優先順序",
    paragraphs: [
      "We state that in the event of any inconsistency or discrepancy between language versions of this Privacy Policy, the Chinese version shall prevail and control.",
      "若本《隱私政策》不同語言版本間出現不一致或歧義，應以中文版本為準。"
    ]
  }
];

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl px-4 py-12 mx-auto space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-semibold">Privacy Policy (隱私政策)</h1>
        <p className="text-sm text-muted-foreground">Last updated: 11-08-2025</p>
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
