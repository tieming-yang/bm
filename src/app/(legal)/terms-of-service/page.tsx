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
      "We currently offer four membership plans: (1) Lifetime Glory Share, (2) Monthly Support, (3) Annual Support, and (4) Organization Lifetime Glory Share. We define and present the specific benefits, pricing, and eligibility of each plan on our official website or purchase pages at the time of purchase or subscription.",
      "We define the Lifetime Glory Share as a one-time, lifetime plan that grants permanent access to designated creative content, recognition privileges, inheritance rights, and Bible-related gift discounts as specified at the time of purchase.",
      "We define the Monthly Support and Annual Support plans as recurring subscriptions that grant access to selected digital content and benefits only during the active subscription period. We terminate access automatically if the subscription is canceled or payment fails.",
      "We define the Organization Lifetime Glory Share as an organization-level plan designed for churches and similar religious organizations, which may include limited public performance rights and custom music benefits, subject to additional organization-specific terms in these Terms.",
      "We restrict all memberships to individual, personal, and non-commercial use. We prohibit sharing, resale, sublicensing, or redistribution of any membership content.",
      "We grant inheritance or transfer rights only to Lifetime Glory Share members. We limit such transfers to direct descendants and require formal written approval from us before any transfer becomes effective.",
      "We reserve the right to adjust pricing, features, content scope, or availability of any plan for future offerings. We confirm that existing members retain access according to the terms in effect at the time of purchase.",
      "我們目前提供四種會員支持方案：（1）終身榮耀份額、（2）月度支持、（3）年度支持、（4）組織終身榮耀份額。我們以購買當下官方頁面所載內容作為各方案權益之依據。",
      "我們將終身榮耀份額定義為一次性、永久方案，提供指定創作內容之永久存取、名錄載入、傳承權，以及聖經禮品相關折扣。",
      "我們將月度支持與年度支持方案定義為訂閱制方案，僅於訂閱有效期間內提供內容與權益；若取消或付款失敗，我們將自動終止存取權限。",
      "我們將組織終身榮耀份額（Organization Lifetime Glory Share）定義為面向教會與類似宗教組織的組織級方案，可能包含有限之公開播放權與客製音樂權益，但須受本條款中之組織方案專章所約束。",
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
      "We govern and interpret these Terms under the laws of the State of Texas, USA. We clarify that dispute resolution is subject to Section 23 (Arbitration), except where prohibited by law.",
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
  {
    id: "no-refunds",
    title: "16. No Refunds and Chargebacks 無退款與拒付政策",
    paragraphs: [
      "We state that all payments, including one-time purchases and recurring subscriptions, are final and non-refundable to the fullest extent permitted by law.",
      "We do not provide refunds, credits, or exchanges for partial use, unused time, dissatisfaction, plan changes, benefit modifications, or termination of access.",
      "We reserve the right to immediately suspend or terminate access if a chargeback, payment dispute, or fraudulent transaction is initiated through Stripe or any payment provider.",
      "我們聲明，所有一次性付款與訂閱付款在法律允許的最大範圍內均不提供退款。",
      "我們不因未使用期間、部分使用、不滿意、方案調整或權益變更而提供退款、補償或折抵。",
      "若發生拒付、爭議付款或疑似詐欺交易，我們保留立即暫停或終止會員權益之權利。",
    ],
  },
  {
    id: "benefit-availability",
    title: "17. Benefit Availability and Substitution 權益可得性與替代",
    paragraphs: [
      "We clarify that all benefits, including events, gifts, premieres, features, and recognitions, are subject to availability and operational feasibility.",
      "We reserve the right to substitute, modify, delay, or cancel any benefit and, where reasonable, provide an alternative of comparable nature or value, without constituting a breach of these Terms.",
      "We state that certain benefits may be aspirational or future-facing and are not guaranteed to occur.",
      "我們說明，所有權益（包含活動、禮品、首映、功能與榮譽）皆視實際可得性與營運狀況而定。",
      "我們保留替換、調整、延後或取消任何權益之權利，並可於合理情況下提供性質相當之替代方案，且不構成違約。",
      "我們進一步說明，部分權益屬於願景性或未來規劃，並非必然實現之保證。",
    ],
  },
  {
    id: "platform-availability",
    title: "18. Platform and Access Availability 平台與存取說明",
    paragraphs: [
      "We grant access rights to content, not a guarantee of perpetual platform availability, delivery method, or specific technical format.",
      "We reserve the right to modify, migrate, replace, or discontinue platforms, applications, websites, hosting services, or delivery mechanisms used to provide access.",
      "We confirm that such changes do not constitute termination of access rights, provided reasonable alternative access is offered when feasible.",
      "我們授予的是內容存取權，而非對特定平台、技術形式或永久系統運作之保證。",
      "我們保留變更、遷移、替換或停止使用任何提供內容之平台、網站、應用程式或技術方式之權利。",
      "只要在可行範圍內提供合理替代存取方式，此類調整不構成權益終止。",
    ],
  },
  {
    id: "force-majeure",
    title: "19. Force Majeure 不可抗力",
    paragraphs: [
      "We are not liable for any delay, suspension, or failure to perform resulting from events beyond our reasonable control, including acts of God, natural disasters, pandemics, war, government actions, labor disputes, platform outages, supply chain disruptions, or technical failures.",
      "We reserve the right to suspend, modify, or delay benefits during such events without liability.",
      "若因不可抗力事件（包含天災、疫情、戰爭、政府行為、平台中斷、技術故障或供應鏈問題）導致服務延遲、暫停或無法履行，我們不承擔責任。",
      "於不可抗力期間，我們得調整、延後或暫停相關權益，而不構成違約。",
    ],
  },
  {
    id: "discretionary-suspension",
    title: "20. Discretionary Suspension and Risk Control 自主暫停與風險控管",
    paragraphs: [
      "We reserve the right to suspend or restrict access, at our sole discretion, if we determine that continued access poses legal, security, reputational, or community risk.",
      "We are not obligated to provide detailed justification prior to suspension or restriction.",
      "若我們判定會員行為可能構成法律、安全、聲譽或社群風險，我們得依自主判斷暫停或限制其存取權限。",
      "我們無義務於暫停或限制前提供詳細理由。",
    ],
  },
  {
    id: "no-reliance",
    title: "21. No Reliance and No Expectation 不可依賴與無期待保證",
    paragraphs: [
      "We state that you acknowledge and agree that you have not relied on any future promise, projection, vision statement, or informal communication in deciding to purchase a plan.",
      "We clarify that creative direction, scope, and output may evolve over time.",
      "您確認並同意，您未依賴任何未來承諾、預期成果、願景描述或非正式說明而購買方案。",
      "我們說明，創作方向、內容範圍與產出可能隨時間調整與演進。",
    ],
  },
  {
    id: "language-priority",
    title: "22. Language Priority 語言優先順序",
    paragraphs: [
      "We state that in the event of any inconsistency or discrepancy between language versions, the Chinese version shall prevail and control.",
      "若不同語言版本間出現不一致或歧義，應以中文版本為準。",
    ],
  },
  {
    id: "arbitration",
    title: "23. Arbitration 仲裁條款",
    paragraphs: [
      "We require that any dispute arising out of or relating to these Terms be resolved through binding arbitration, except where prohibited by law.",
      "We waive the right to pursue disputes in court to the extent legally permitted.",
      "除法律禁止外，任何因本條款所生之爭議應以具拘束力之仲裁方式解決。",
      "在法律允許範圍內，我們放棄透過法院訴訟解決爭議之權利。",
    ],
  },
  {
    id: "class-action-waiver",
    title: "24. Class Action Waiver 集體訴訟放棄",
    paragraphs: [
      "We require that all claims be brought on an individual basis and waive the right to participate in any class or representative action.",
      "所有爭議須以個人名義提出，並放棄參與任何集體或代表性訴訟之權利。",
    ],
  },
  {
    id: "public-license-upsell",
    title: "25. Public Use and Licensing 公開使用與授權",
    paragraphs: [
      "We prohibit public, institutional, educational, or commercial use of our content without a separate written license, except where an active Organization Lifetime Glory Share expressly grants limited public performance rights.",
      "We invite organizations, churches, schools, or groups seeking such use to contact us for licensing options.",
      "未經另行書面授權，禁止於公開、教育、機構或商業場景中使用本內容。",
      "如需相關授權，請與我們聯絡以洽談授權方案。",
    ],
  },
  {
    id: "organization-plan",
    title: "26. Organization Lifetime Glory Share 組織終身榮耀份額",
    paragraphs: [
      "We offer an Organization Lifetime Glory Share that is intended for churches and similar religious organizations. We may require reasonable verification of organizational identity and eligibility.",
      "We state that, upon successful payment completion, we may upgrade the purchaser to an organization account. We may rely on the organization email on file as the primary channel for delivering plan benefits.",
      "We grant the Organization Lifetime Glory Share a non-transferable, non-sublicensable, perpetual public performance license to Beyond Digital Media content made available under the plan, limited to the organization’s ministry activities (including services, gatherings, and related live streams operated by the organization). We do not grant rights to reproduce, distribute, sell, or publicly post downloadable files except as expressly permitted in writing.",
      "We clarify that organizational benefits and discounts (including group-buy gift discounts) apply only to the verified organization and may not be resold, shared, or used to benefit unrelated third parties.",
      "我們提供組織終身榮耀份額（Organization Lifetime Glory Share），適用於教會及類似宗教組織。我們得要求合理之組織身分與資格驗證。",
      "我們說明，當付款完成後，我們得將購買者升級為組織帳號。我們得以帳號所登記之組織電子郵件作為交付方案權益之主要管道。",
      "我們授予組織終身榮耀份額對於本方案所提供之 Beyond Digital Media 內容一項不可轉讓、不可再授權之永久公開演出授權，其範圍限於該組織之事工活動（包含聚會、崇拜與由該組織營運之相關直播）。除非另有書面允許，我們不授予重製、散布、販售或公開上傳可下載檔案之權利。",
      "我們說明，組織方案之權益與折扣（包含團購禮品折扣）僅限於已驗證之組織使用，不得轉售、分享或用以使無關第三方受益。"
    ]
  },
  {
    id: "custom-music",
    title: "27. Custom Music Deliverables 客製音樂交付",
    paragraphs: [
      "We may offer custom Bible songs as part of the Organization Lifetime Glory Share, such as up to ten (10) custom songs per year, as a membership benefit. We clarify that timelines, scope, arrangement complexity, language, and delivery format are determined by us at our sole discretion unless otherwise agreed in writing.",
      "We reserve the right to substitute, reduce, delay, or otherwise modify custom deliverables when necessary due to capacity, scheduling, creative constraints, or other operational reasons, without providing refunds except where required by law.",
      "We clarify that custom songs delivered under the plan are not exclusive unless we expressly agree in writing. We may reuse themes, melodies, arrangements, lyrics concepts, or complete songs, and we may deliver the same or substantially similar songs to multiple organizations.",
      "We clarify that we own all intellectual property in custom songs unless otherwise agreed in writing. We grant the organization a license to use delivered songs for the organization’s ministry purposes, including public performance in services and related streams, subject to these Terms.",
      "我們得於組織終身榮耀份額中提供客製聖經歌曲交付，例如每年最多十（10）首，並視為方案權益而非商品。我們說明，交付時程、範圍、編曲複雜度、語言與交付格式，除非另有書面約定，均由我們依自主判斷決定。",
      "若因人力、排程、創作限制或其他營運因素，我們需要調整、延後、替代或減少客製交付內容，我們保留相關權利，且除法律另有規定外不提供退款。",
      "我們說明，除非另有書面明示，客製歌曲不具排他性。我們得重複使用主題、旋律、編曲、歌詞概念或完整作品，並得將相同或實質相似之歌曲交付給多個組織。",
      "我們說明，除非另有書面約定，客製歌曲之智慧財產權均屬我們所有。我們授予該組織就已交付作品於其事工用途之使用授權（包含聚會中公開演出及相關直播），並受本條款所約束。"
    ]
  },
  {
    id: "organization-email",
    title: "28. Organization Account and Email 組織帳號與電子郵件",
    paragraphs: [
      "We state that the organization email address on file is critical for delivering custom music and other organization benefits. We will deliver custom music and related materials to the organization email on record.",
      "We allow a one-time change of the organization email address after purchase, subject to our verification. We may refuse or delay changes if we detect fraud, security risk, or disputes over organizational control.",
      "We are not responsible for loss of access, missed deliveries, or confidentiality issues caused by an incorrect email address, shared inbox practices, forwarding rules, or unauthorized access to the organization email.",
      "我們說明，組織帳號所登記之組織電子郵件為交付客製音樂與組織權益之關鍵。我們將以登記之組織電子郵件作為交付客製作品與相關資料之主要管道。",
      "我們允許購買後進行一次性的組織電子郵件更改，但須經我們驗證。我們若偵測到詐欺、安全風險或組織控制權爭議，得拒絕或延後更改。",
      "若因電子郵件填寫錯誤、共用信箱管理方式、轉寄規則或未授權存取而導致權益遺失、交付錯過或機密性問題，我們不承擔責任。"
    ]
  },
  {
    id: "organization-scope",
    title: "29. Organization Scope and Single-Church Limitation 組織範圍與單一教會限制",
    paragraphs: [
      "We define each Organization Lifetime Glory Share as valid for one physical church location only. We do not permit sharing, pooling, or extending one Organization Lifetime Glory Share across multiple church locations, campuses, branches, or affiliated entities, even if they operate under the same legal organization or umbrella entity.",
      "We require each physical church to purchase its own Organization Lifetime Glory Share in order to receive organization-level rights or benefits.",
      "我們將每一份組織終身榮耀份額限定為僅適用於單一實體教會據點。即使多個教會隸屬於同一法人、宗派或組織體系，我們亦不允許共用、合併或延伸使用同一方案。",
      "我們要求每一個實體教會須各自購買其獨立的組織終身榮耀份額，方可取得相關組織權益。"
    ]
  },
  {
    id: "custom-song-process",
    title: "30. Custom Song Submission Process 客製歌曲提交流程",
    paragraphs: [
      "We state that custom song creation will begin only after we have received all ten (10) complete song ideas from the organization for the applicable year.",
      "We require that each song idea submission include, at a minimum, the intended musical style, thematic direction, and complete or near-complete lyrics. We may reject incomplete or unclear submissions at our discretion.",
      "We do not guarantee any production start date, completion date, or delivery timeline. We create custom songs on a best-effort basis and at our sole scheduling discretion.",
      "If an organization fails to submit all required song ideas within a given year, we are not obligated to create any custom songs for that year, and unused custom song opportunities do not roll over or accumulate.",
      "我們說明，僅在我們收到該年度全部十（10）首完整歌曲構想後，客製歌曲創作流程才會開始。",
      "我們要求每一首歌曲構想至少須包含音樂風格、主題方向以及完整或接近完成之歌詞內容；若內容不完整或不清楚，我們得自行決定不予受理。",
      "我們不保證任何製作開始日、完成日或交付時程，所有客製歌曲皆依我們之製作排程與最佳努力原則進行。",
      "若教會於該年度內未提交完整之歌曲構想，我們無義務進行任何客製創作，且未使用之歌曲名額不得累積或順延至次年度。"
    ]
  },
  {
    id: "no-revisions",
    title: "31. No Revisions and Final Creation 無修改與最終創作",
    paragraphs: [
      "We state that custom songs are provided as a membership benefit, not as a commissioned product or work-for-hire.",
      "Once a song idea is submitted and accepted, we do not allow revisions, modifications, change requests, returns, exchanges, or refunds of any kind.",
      "We do not permit changes to lyrics, style, theme, structure, language, arrangement, or production after submission.",
      "We clarify that acceptance of these Terms constitutes acknowledgment that all custom songs are delivered on a final, as-created basis.",
      "我們說明，客製歌曲屬於會員方案所提供之權益，而非委託製作或商品化之作品。",
      "一經提交並受理之歌曲構想，不得提出任何修改、調整、變更、退回或退款之要求。",
      "我們不允許於提交後變更歌詞、風格、主題、結構、語言、編曲或製作內容。",
      "您同意並確認，所有客製歌曲皆以最終完成版本提供，不接受任何修改。"
    ]
  },
  {
    id: "custom-song-availability",
    title: "32. Custom Song Availability 客製歌曲可用性",
    paragraphs: [
      "We clarify that the custom song feature may be unavailable at any time due to maintenance, capacity constraints, technical issues, creative considerations, or other operational reasons.",
      "We do not guarantee availability, continuity, or uptime of the custom song feature, and temporary or permanent unavailability does not constitute a breach of these Terms.",
      "我們說明，因維護、人力、技術、創作或其他營運因素，客製歌曲功能可能隨時暫停或無法提供。",
      "我們不保證客製歌曲功能之可用性、持續性或不中斷性，相關不可用狀況不構成違約。"
    ]
  },
  {
    id: "organization-refunds",
    title: "33. Organization Plan No Refunds 教會方案無退款",
    paragraphs: [
      "We confirm that the Organization Lifetime Glory Share, like all other plans, is strictly non-refundable.",
      "We do not provide refunds, credits, or compensation for unused benefits, unsubmitted song ideas, unavailable features, or dissatisfaction with creative outcomes.",
      "我們確認，組織終身榮耀份額與其他所有方案相同，均不提供退款。",
      "即使權益未使用、歌曲構想未提交、功能暫停或對創作結果不滿，我們亦不提供任何退款、補償或折抵。"
    ]
  },

  {
    id: "termination-for-cause",
    title: "34. Termination, Account Deletion, and Content Abuse 終止、帳號刪除與內容濫用",
    paragraphs: [
      "We reserve the right, at our sole discretion and without prior notice, to suspend, terminate, or permanently delete any membership or account if we determine that the account has violated these Terms, including but not limited to unauthorized copying, distribution, sharing, scraping, mirroring, public posting, resale, or other misuse of content obtained from our website or services.",
      "We may take such action immediately and without refund, credit, or compensation of any kind.",
      "We are not obligated to provide evidence, detailed explanations, or advance notice prior to termination or deletion, particularly where we determine that continued access poses legal, security, intellectual property, or operational risk.",
      "Termination or deletion of an account does not affect our ownership of intellectual property, does not create any refund rights, and does not limit our right to pursue legal or equitable remedies.",
      "我們保留依自主判斷，於不另行通知之情況下，暫停、終止或永久刪除任何會員資格或帳號之權利，若我們認定該帳號違反本條款，包括但不限於未經授權之複製、散布、分享、擷取、鏡像、公開張貼、轉售或其他對網站或服務內容之不當使用。",
      "我們得立即採取前述行動，且不提供任何形式之退款、補償或折抵。",
      "在涉及法律、安全、智慧財產權或營運風險之情況下，我們無義務於終止或刪除前提供證據、詳細說明或事前通知。",
      "帳號終止或刪除不影響我們對智慧財產權之所有權，不產生任何退款權利，亦不限制我們依法採取其他救濟措施之權利。"
    ]
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
