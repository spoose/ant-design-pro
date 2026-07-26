/** Skill 启动卡右侧插画：纸张叠层 + 轻暖色点缀，替代图标。 */

const SoftShadowFilter = ({ id }: { id: string }) => (
  <filter
    filterUnits="userSpaceOnUse"
    height="148"
    id={id}
    width="160"
    x="28"
    y="10"
  >
    <feDropShadow
      dx="0"
      dy="4"
      floodColor="#09090b"
      floodOpacity="0.08"
      stdDeviation="4"
    />
  </filter>
);

const SparkleBadge = ({ cx = 138, cy = 46 }: { cx?: number; cy?: number }) => (
  <g transform={`translate(${cx} ${cy})`}>
    <circle cx="0" cy="0" fill="#f5d0a9" r="14" />
    <path
      d="M0 -7 L1.6 -1.6 L7 0 L1.6 1.6 L0 7 L-1.6 1.6 L-7 0 L-1.6 -1.6 Z"
      fill="#c2410c"
    />
  </g>
);

const FileReviewArt = () => (
  <svg
    aria-hidden
    className="h-full w-full"
    fill="none"
    viewBox="0 0 200 160"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>文件审阅插画</title>
    <rect
      fill="#e4e4e7"
      height="112"
      rx="14"
      transform="rotate(8 118 78)"
      width="92"
      x="88"
      y="28"
    />
    <rect
      fill="#f4f4f5"
      height="112"
      rx="14"
      transform="rotate(3 108 74)"
      width="92"
      x="78"
      y="24"
    />
    <g filter="url(#platform-art-file-review)">
      <rect fill="#ffffff" height="118" rx="14" width="100" x="54" y="22" />
    </g>
    <text
      fill="#3f3f46"
      fontFamily="AlibabaSans, system-ui, sans-serif"
      fontSize="13"
      fontWeight="600"
      x="68"
      y="48"
    >
      审查
    </text>
    <rect fill="#e4e4e7" height="6" rx="3" width="64" x="68" y="62" />
    <rect fill="#ececef" height="6" rx="3" width="52" x="68" y="76" />
    <rect fill="#ececef" height="6" rx="3" width="58" x="68" y="90" />
    <rect fill="#f4f4f5" height="6" rx="3" width="40" x="68" y="104" />
    <SparkleBadge />
    <defs>
      <SoftShadowFilter id="platform-art-file-review" />
    </defs>
  </svg>
);

const DocumentSummaryArt = () => (
  <svg
    aria-hidden
    className="h-full w-full"
    fill="none"
    viewBox="0 0 200 160"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>文档摘要插画</title>
    <rect
      fill="#e4e4e7"
      height="108"
      rx="14"
      transform="rotate(-6 96 82)"
      width="88"
      x="70"
      y="34"
    />
    <g filter="url(#platform-art-document-summary)">
      <rect fill="#ffffff" height="118" rx="14" width="104" x="62" y="22" />
      <path
        d="M166 46h18c4.4 0 8 3.6 8 8v52c0 4.4-3.6 8-8 8h-18V46Z"
        fill="#fafafa"
        stroke="#e4e4e7"
      />
    </g>
    <text
      fill="#3f3f46"
      fontFamily="AlibabaSans, system-ui, sans-serif"
      fontSize="11"
      fontWeight="600"
      transform="rotate(90 183 74)"
      x="183"
      y="74"
    >
      摘要
    </text>
    <rect fill="#e4e4e7" height="6" rx="3" width="58" x="76" y="56" />
    <rect fill="#ececef" height="6" rx="3" width="48" x="76" y="72" />
    <rect fill="#ececef" height="6" rx="3" width="54" x="76" y="88" />
    <defs>
      <SoftShadowFilter id="platform-art-document-summary" />
    </defs>
  </svg>
);

const KnowledgeSearchArt = () => (
  <svg
    aria-hidden
    className="h-full w-full"
    fill="none"
    viewBox="0 0 200 160"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>知识检索插画</title>
    <rect
      fill="#e4e4e7"
      height="104"
      rx="14"
      transform="rotate(10 124 84)"
      width="86"
      x="96"
      y="36"
    />
    <g filter="url(#platform-art-knowledge-search)">
      <rect fill="#ffffff" height="116" rx="14" width="98" x="48" y="24" />
    </g>
    <rect fill="#e4e4e7" height="6" rx="3" width="58" x="62" y="48" />
    <rect fill="#ececef" height="6" rx="3" width="46" x="62" y="64" />
    <rect fill="#ececef" height="6" rx="3" width="52" x="62" y="80" />
    <circle
      cx="128"
      cy="104"
      fill="#fff7ed"
      r="22"
      stroke="#fdba74"
      strokeWidth="3"
    />
    <circle cx="128" cy="104" r="10" stroke="#ea580c" strokeWidth="3" />
    <path
      d="M136 112 L148 124"
      stroke="#ea580c"
      strokeLinecap="round"
      strokeWidth="3.5"
    />
    <defs>
      <SoftShadowFilter id="platform-art-knowledge-search" />
    </defs>
  </svg>
);

const PlatformAssistantArt = () => (
  <svg
    aria-hidden
    className="h-full w-full"
    fill="none"
    viewBox="0 0 200 160"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>平台助手插画</title>
    <rect
      fill="#e4e4e7"
      height="96"
      rx="18"
      transform="rotate(-8 118 86)"
      width="108"
      x="78"
      y="42"
    />
    <g filter="url(#platform-art-assistant)">
      <rect fill="#ffffff" height="104" rx="18" width="118" x="42" y="28" />
    </g>
    <text
      fill="#3f3f46"
      fontFamily="AlibabaSans, system-ui, sans-serif"
      fontSize="22"
      fontWeight="700"
      x="62"
      y="78"
    >
      AI
    </text>
    <rect fill="#ececef" height="6" rx="3" width="48" x="62" y="92" />
    <g transform="translate(132 58)">
      <circle cx="0" cy="0" fill="#f5d0a9" r="16" />
      <path
        d="M-1.5 -6.5h3v5h5v3h-5v5h-3v-5h-5v-3h5z"
        fill="#c2410c"
        transform="rotate(45)"
      />
    </g>
    <defs>
      <SoftShadowFilter id="platform-art-assistant" />
    </defs>
  </svg>
);

const FallbackArt = () => (
  <svg
    aria-hidden
    className="h-full w-full"
    fill="none"
    viewBox="0 0 200 160"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>通用应用插画</title>
    <rect
      fill="#e4e4e7"
      height="112"
      rx="14"
      transform="rotate(6 120 80)"
      width="92"
      x="90"
      y="30"
    />
    <g filter="url(#platform-art-fallback)">
      <rect fill="#ffffff" height="118" rx="14" width="100" x="56" y="22" />
    </g>
    <rect fill="#e4e4e7" height="6" rx="3" width="64" x="70" y="52" />
    <rect fill="#ececef" height="6" rx="3" width="52" x="70" y="68" />
    <rect fill="#ececef" height="6" rx="3" width="58" x="70" y="84" />
    <defs>
      <SoftShadowFilter id="platform-art-fallback" />
    </defs>
  </svg>
);

/** 按 skillCode 返回总览启动卡右侧插画；未知 code 回退为通用纸张叠层。 */
export const WorkspaceSkillArt = ({ skillCode }: { skillCode: string }) => {
  switch (skillCode) {
    case 'platform-assistant':
      return <PlatformAssistantArt />;
    case 'file-review':
      return <FileReviewArt />;
    case 'document-summary':
      return <DocumentSummaryArt />;
    case 'knowledge-search':
      return <KnowledgeSearchArt />;
    default:
      return <FallbackArt />;
  }
};
