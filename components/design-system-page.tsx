import type { ReactNode } from "react";

type IconName = "bell" | "search" | "play" | "file" | "bookmark" | "chart" | "clock" | "user" | "chevron" | "lock" | "check" | "external" | "folder" | "eye" | "grid" | "target" | "accessibility" | "level";

function Icon({ name, filled = false, size = 20 }: { name: IconName; filled?: boolean; size?: number }) {
  const common = { fill: filled ? "currentColor" : "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, ReactNode> = {
    bell: <><path {...common} d="M6.4 9a5.6 5.6 0 0 1 11.2 0c0 6.2 2.4 6.2 2.4 7.6H4c0-1.4 2.4-1.4 2.4-7.6Z" /><path {...common} d="M9.6 20h4.8" /></>,
    search: <><circle {...common} cx="10.5" cy="10.5" r="6.5" /><path {...common} d="m15.5 15.5 4.5 4.5" /></>,
    play: <><circle {...common} cx="12" cy="12" r="8" /><path {...common} fill={filled ? "white" : "none"} d="m10 8.8 5.2 3.2-5.2 3.2Z" /></>,
    file: <><path {...common} d="M7 3h7l4 4v14H7Z" /><path {...common} d="M14 3v5h4M10 12h5M10 16h5" /></>,
    bookmark: <path {...common} d="M6 4h12v17l-6-3.8L6 21Z" />,
    chart: <path {...common} d="M5 19v-4h3v4M10.5 19V9h3v10M16 19V5h3v14" />,
    clock: <><circle {...common} cx="12" cy="12" r="8" /><path {...common} d="M12 7v5l3.5 2" /></>,
    user: <><circle {...common} cx="12" cy="8" r="3.2" /><path {...common} d="M5.8 20c.5-4 2.6-6 6.2-6s5.7 2 6.2 6Z" /></>,
    chevron: <path {...common} d="m9 5 7 7-7 7" />,
    lock: <><rect {...common} x="6" y="10" width="12" height="10" rx="2" /><path {...common} d="M9 10V7a3 3 0 0 1 6 0v3" /></>,
    check: <><circle {...common} cx="12" cy="12" r="9" /><path {...common} d="m8 12 2.6 2.6L16.5 9" /></>,
    external: <><path {...common} d="M14 5h5v5M19 5l-8 8" /><path {...common} d="M17 13v6H5V7h6" /></>,
    folder: <path {...common} d="M3 7h7l2-2h9v14H3Z" />,
    eye: <><path {...common} d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle {...common} cx="12" cy="12" r="2.5" /></>,
    grid: <><rect {...common} x="3" y="3" width="7" height="7" /><rect {...common} x="14" y="3" width="7" height="7" /><rect {...common} x="3" y="14" width="7" height="7" /><rect {...common} x="14" y="14" width="7" height="7" /></>,
    target: <><circle {...common} cx="12" cy="12" r="8" /><circle {...common} cx="12" cy="12" r="3" /><path {...common} d="m14 10 6-6M16 4h4v4" /></>,
    accessibility: <><circle {...common} cx="12" cy="4.5" r="2" /><path {...common} d="M5 8h14M12 8v12M8 21l4-7 4 7" /></>,
    level: <path {...common} d="M4 19v-4h3v4M10.5 19v-8h3v8M17 19V6h3v13" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}>{paths[name]}</svg>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand"><svg aria-hidden="true" className={compact ? "brand-mark brand-mark-small" : "brand-mark"} viewBox="0 0 40 36"><path fill="#F05223" d="M1 2h38L20 35 1 2Zm9 6 10 18L30 8h-7l-3 6-3-6h-7Z" /></svg><span>Lopsis</span></div>;
}

function Panel({ number, title, className = "", children }: { number: string; title: string; className?: string; children: ReactNode }) {
  return <section className={`panel ${className}`}><header className="section-heading"><span>{number}</span><h2>{title}</h2></header>{children}</section>;
}

const primaryColors = [["Primary 500", "#F97316"], ["Primary 400", "#FB923C"], ["Primary 300", "#FDBA74"], ["Primary 200", "#FED7AA"], ["Primary 100", "#FFEEE5"]];
const neutralColors = [["Neutral 900", "#0F172A"], ["Neutral 700", "#334155"], ["Neutral 500", "#64748B"], ["Neutral 300", "#CBD5E1"], ["Neutral 200", "#E2E8F0"], ["Neutral 100", "#F1F5F9"], ["Neutral 50", "#FAFAFC"], ["White", "#FFFFFF"]];

function Swatch({ label, color }: { label: string; color: string }) {
  return <div className="swatch"><div className="swatch-color" style={{ backgroundColor: color }} /><span>{label}</span><code>{color}</code></div>;
}

const typeScale = [
  ["Display 1", "Playfair Display", "48 / 56", "Bold", "Page titles"], ["Display 2", "Playfair Display", "36 / 44", "Bold", "Section titles"],
  ["Heading 1", "Inter", "28 / 36", "Semi Bold", "Card titles"], ["Heading 2", "Inter", "22 / 30", "Semi Bold", "Sub section"],
  ["Heading 3", "Inter", "18 / 26", "Medium", "Small titles"], ["Body Large", "Inter", "16 / 24", "Regular", "Body copy"],
  ["Body", "Inter", "14 / 20", "Regular", "Supporting text"], ["Small", "Inter", "12 / 16", "Regular", "Captions, meta"],
];

function ButtonSample({ kind, state, children, icon }: { kind: "primary" | "secondary" | "tertiary" | "text"; state?: "hover" | "disabled"; children: ReactNode; icon?: boolean }) {
  return <button type="button" disabled={state === "disabled"} className={`button button-${kind} ${state ? `is-${state}` : ""}`}>{children}{icon && <Icon name={kind === "text" ? "play" : "external"} size={15} />}</button>;
}

function Badge({ kind, children }: { kind: "video" | "lesson" | "popular"; children: ReactNode }) {
  return <span className={`badge badge-${kind}`}>{children}</span>;
}

function AppCard({ type }: { type: "course" | "video" | "lesson" | "resource" }) {
  if (type === "course") return <article className="sample-card course-card"><div className="card-main"><div className="course-icon">N</div><div><h3>Next.js for Production</h3><p>Build scalable, high-performance web applications with Next.js.</p></div></div><div className="card-meta"><span><Icon name="level" size={14} />Intermediate</span><span><Icon name="clock" size={14} />18h 24m</span><span><Icon name="folder" size={14} />12 modules</span></div></article>;
  if (type === "video") return <article className="sample-card lesson-card"><Badge kind="video">Video</Badge><h3>Data Fetching in Server Components</h3><p>Learn how to fetch data on the server using async/await and Next.js best practices.</p><div className="card-footer"><span>Lesson 5.1&nbsp;&nbsp; · &nbsp;&nbsp;12:45</span><a href="#video"><Icon name="play" size={15} />Watch from 12:45</a></div></article>;
  if (type === "lesson") return <article className="sample-card lesson-card"><Badge kind="lesson">Lesson</Badge><h3>Data Fetching &amp; Caching</h3><p>Explore different data fetching methods in Next.js and how to cache and revalidate data for optimal performance.</p><div className="card-footer"><span>Module 5</span><a href="#lesson">View lesson<Icon name="external" size={15} /></a></div></article>;
  return <article className="sample-card resource-card"><div className="resource-top"><Icon name="file" size={26} /><div><h3>Caching and Revalidation Guide</h3><p>Deep dive into Next.js caching strategies.</p></div></div><div className="card-footer"><span>PDF&nbsp;&nbsp; · &nbsp;&nbsp;1.2 MB</span><a href="#resource" aria-label="Open resource"><Icon name="external" size={16} /></a></div></article>;
}

export default function DesignSystemPage() {
  const iconNames: IconName[] = ["bell", "search", "play", "file", "bookmark", "chart", "clock", "user", "chevron"];
  return <main className="design-page"><div className="design-board">
    <section className="intro-panel"><div className="intro-copy"><Brand /><h1>Design System</h1><p>A unified design language for Lopsis learning platform. Clean, modern and focused on clarity, consistency and intuitive learning experiences.</p><div className="version">Version 1.0 <span>•</span> May 2025</div></div><div className="colors-block"><header className="section-heading"><span>01</span><h2>Colors</h2></header><h3>Primary</h3><div className="swatch-grid primary-swatches">{primaryColors.map(([label, color]) => <Swatch key={label} label={label} color={color} />)}</div><h3>Neutral</h3><div className="swatch-grid neutral-swatches">{neutralColors.map(([label, color]) => <Swatch key={label} label={label} color={color} />)}</div></div></section>

    <div className="two-columns foundations-row"><Panel number="02" title="Typography" className="typography-panel"><div className="font-sample"><strong className="font-playfair">Ag</strong><div><h3 className="font-playfair">Playfair Display</h3><p>Elegant <i>•</i> Readable <i>•</i> Timeless</p></div></div><div className="font-sample"><strong>Ag</strong><div><h3>Inter</h3><p>Clean <i>•</i> Modern <i>•</i> Highly legible</p></div></div></Panel><Panel number="03" title="Type Scale" className="type-panel"><div className="table-scroll"><table><thead><tr><th>Style</th><th>Font</th><th>Size / Line Height</th><th>Weight</th><th>Use</th></tr></thead><tbody>{typeScale.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell} className={index === 0 && row[0].startsWith("Display") ? "font-playfair" : ""}>{cell}</td>)}</tr>)}</tbody></table></div></Panel></div>

    <div className="two-columns spacing-row"><Panel number="04" title="Spacing System" className="spacing-panel"><h3>Base unit: 4px</h3><div className="spacing-scale">{[[4,"0.25rem"],[8,"0.5rem"],[12,"0.75rem"],[16,"1rem"],[24,"1.5rem"],[32,"2rem"],[40,"2.5rem"],[48,"3rem"],[64,"4rem"]].map(([size, rem]) => <div key={size}><span style={{ width: size, height: Math.max(6, Number(size) * .65) }} /><b>{size}</b><small>({rem})</small></div>)}</div></Panel><Panel number="05" title="Radius & Shadows" className="radius-panel"><h3>Radius</h3><div className="radius-scale">{[[4,"xs"],[8,"sm"],[12,"md"],[16,"lg"],[24,"xl"],[999,"circle"]].map(([radius,label], i) => <div key={label}><span style={{ borderRadius: radius }} className={i === 5 ? "circle" : ""}/><b>{i === 5 ? "Full" : `${radius}px`}</b><small>({label})</small></div>)}</div><h3 className="shadow-title">Shadows</h3><div className="shadow-scale">{[["Sm","0 1px 2px 0","rgba(15, 23, 42, 0.05)"],["Md","0 4px 12px -2px","rgba(15, 23, 42, 0.08)"],["Lg","0 12px 24px -4px","rgba(15, 23, 42, 0.10)"],["Xl","0 20px 40px -8px","rgba(15, 23, 42, 0.12)"]].map(([name,value,color]) => <div key={name}><b>{name}</b><small>{value}<br/>{color}</small></div>)}</div></Panel></div>

    <div className="three-columns components-row"><Panel number="06" title="Icons" className="icons-panel"><h3>Outline Style</h3><div className="icon-row">{iconNames.map((name) => <Icon key={name} name={name} />)}</div><h3>Filled Style</h3><div className="icon-row">{iconNames.map((name) => <Icon key={name} name={name} filled />)}</div><h3>Icon Specs</h3><ul className="spec-list"><li>24×24px grid</li><li>2px stroke width (outline)</li><li>Rounded line caps</li><li>Consistent optical balance</li></ul></Panel>
    <Panel number="07" title="Buttons" className="buttons-panel"><div className="button-grid"><span /><span>Primary</span><span>Secondary</span><span>Tertiary</span><span>Text</span><b>Default</b><ButtonSample kind="primary">Get Started</ButtonSample><ButtonSample kind="secondary">Explore Courses</ButtonSample><ButtonSample kind="tertiary" icon>View Lesson</ButtonSample><ButtonSample kind="text" icon>Watch Video</ButtonSample><b>Hover</b><ButtonSample kind="primary" state="hover">Get Started</ButtonSample><ButtonSample kind="secondary" state="hover">Explore Courses</ButtonSample><ButtonSample kind="tertiary" state="hover" icon>View Lesson</ButtonSample><ButtonSample kind="text" state="hover" icon>Watch Video</ButtonSample><b>Disabled</b><ButtonSample kind="primary" state="disabled">Get Started</ButtonSample><ButtonSample kind="secondary" state="disabled">Explore Courses</ButtonSample><ButtonSample kind="tertiary" state="disabled" icon>View Lesson</ButtonSample><ButtonSample kind="text" state="disabled" icon>Watch Video</ButtonSample></div><h3>Button Specs</h3><ul className="spec-list"><li>Height: 44px (default)</li><li>Padding: 0 16px (lg), 0 12px (md)</li><li>Radius: 12px</li><li>Font: Inter Medium (14–16px)</li></ul></Panel>
    <Panel number="08" title="Inputs" className="inputs-panel"><label htmlFor="search-demo">Search / Text Input</label><div className="search-field"><Icon name="search" size={18}/><input id="search-demo" placeholder="Search anything..."/><kbd>⌘ K</kbd></div><label htmlFor="sort-demo">Select</label><div className="select-wrap"><select id="sort-demo" defaultValue="relevant"><option value="relevant">Most Relevant</option></select><span>⌄</span></div><h3>Field Specs</h3><ul className="spec-list"><li>Height: 44px</li><li>Radius: 12px</li><li>Border: 1px solid #E2E8F0</li><li>Padding: 0 16px</li><li>Focus: Border color #FB923C</li></ul></Panel></div>

    <div className="three-columns compact-row"><Panel number="09" title="Badges / Tags"><div className="badge-grid"><div><span>Video</span><Badge kind="video">Video</Badge></div><div><span>Lesson</span><Badge kind="lesson">Lesson</Badge></div><div><span>Popular</span><Badge kind="popular">Popular</Badge></div></div></Panel><Panel number="10" title="Status / Indicators"><div className="status-row"><span><i className="status-progress"/>In Progress</span><span><Icon name="check" size={18}/>Completed</span><span><Icon name="play" size={18} filled/>Now Playing</span><span><Icon name="lock" size={18}/>Locked</span></div></Panel><Panel number="11" title="Progress Bar"><div className="progress-demo"><div className="progress-track"><span/></div><b>35% <em>complete</em></b></div></Panel></div>

    <Panel number="12" title="Cards" className="cards-panel"><div className="cards-grid"><div><span>Course Card</span><AppCard type="course"/></div><div><span>Lesson Card (Video)</span><AppCard type="video"/></div><div><span>Lesson Card (Lesson)</span><AppCard type="lesson"/></div><div><span>Resource Card</span><AppCard type="resource"/></div></div></Panel>
    <Panel number="13" title="Navigation" className="navigation-panel"><div className="navigation-grid"><nav aria-label="Example primary navigation"><Brand compact/><a className="active" href="#courses">Courses</a><a href="#learning">My Learning</a></nav><div className="breadcrumbs"><span>Breadcrumbs</span><div><a href="#all">All Courses</a><Icon name="chevron" size={14}/><a href="#next">Next.js for Production</a><Icon name="chevron" size={14}/><b>Data Fetching &amp; Caching</b></div></div><nav className="pagination" aria-label="Example pagination"><span>Pagination</span><div><button aria-label="Previous page">‹</button><button className="current">1</button><button>2</button><button>3</button><b>…</b><button>8</button><button aria-label="Next page">›</button></div></nav></div></Panel>
    <Panel number="14" title="Principles" className="principles-panel"><div className="principles-grid">{[["eye","Clarity First","Every element should communicate clearly."],["grid","Consistency","Use components and patterns consistently across the platform."],["target","Focus & Calm","Remove noise and help learners focus on what matters."],["accessibility","Accessible","Design with accessibility and inclusivity in mind."]].map(([icon,title,copy]) => <div className="principle" key={title}><Icon name={icon as IconName} size={34}/><div><h3>{title}</h3><p>{copy}</p></div></div>)}</div></Panel>
  </div></main>;
}


