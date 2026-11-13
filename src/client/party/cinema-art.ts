import type { PartySceneId } from "../../domain/party/stage";
import { cinemaProps } from "./cinema-props";
import { seeded } from "./timeline";
export function cinemaArtwork(
  scene: PartySceneId,
  color: string,
  id: string,
  seed: number,
): string {
  const random = seeded(seed),
    glow = `url(#${id}-energy)`,
    gold = `url(#${id}-gold)`,
    glass = `url(#${id}-glass)`;
  const ring = (r: number, width = 4) =>
    `<circle cx="500" cy="330" r="${r}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
  const rays = Array.from(
    { length: 20 },
    (_, i) =>
      `<path d="M500 330L${500 + Math.cos((i * Math.PI) / 10) * 800} ${330 + Math.sin((i * Math.PI) / 10) * 800}"/>`,
  ).join("");
  const defs = `<defs><linearGradient id="${id}-paint" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".9"/><stop offset=".26" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity=".6"/></linearGradient><linearGradient id="${id}-pearl" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".5" stop-color="#dbe8f7"/><stop offset="1" stop-color="#94abc6"/></linearGradient><radialGradient id="${id}-aura"><stop stop-color="${color}" stop-opacity=".25"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><defs><radialGradient id="${id}-energy"><stop stop-color="white" stop-opacity=".9"/><stop offset=".35" stop-color="${color}" stop-opacity=".55"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient><linearGradient id="${id}-gold" x2="0" y2="1"><stop stop-color="#fff9c1"/><stop offset=".5" stop-color="#ffd85b"/><stop offset="1" stop-color="#ed8d31"/></linearGradient><linearGradient id="${id}-glass" x2="1" y2="1"><stop stop-color="white" stop-opacity=".7"/><stop offset="1" stop-color="${color}" stop-opacity=".15"/></linearGradient></defs>`;
  let body = "";
  switch (scene) {
    case "eggstorm":
      body = `<g data-fall><path d="M475 90L590 240M435 80L555 255M540 70L635 225" stroke="${color}" stroke-width="16" stroke-linecap="round" opacity=".6"/><ellipse cx="530" cy="305" rx="75" ry="100" fill="#fff5d5" stroke="#c9a86c" stroke-width="6"/><path data-draw d="M490 280L530 300L505 327L552 346L530 380" fill="none" stroke="#ac783c" stroke-width="7"/></g><g data-grow><ellipse cx="525" cy="430" rx="180" ry="44" fill="#ffc434"/><path d="M360 410Q410 365 465 421Q510 370 550 420Q635 375 680 432Q570 490 360 450Z" fill="#ffe496" opacity=".7"/></g>`;
      break;
    case "tomato":
      body = `<g data-pulse><circle cx="500" cy="300" r="100" fill="#f74732"/><path d="M460 207L500 248L540 207L524 251L560 260L500 273L440 260L477 250Z" fill="#50a23b"/><ellipse cx="466" cy="278" rx="16" ry="35" fill="#ffc2a5" opacity=".7"/></g><g data-grow fill="#eb3f34">${Array.from({ length: 12 }, (_, i) => `<ellipse cx="${300 + random() * 400}" cy="${240 + random() * 220}" rx="${15 + random() * 30}" ry="${8 + random() * 12}" transform="rotate(${i * 29} 500 330)"/>`).join("")}</g>`;
      break;
    case "tornado":
      body = `<g data-sway fill="none" stroke="${color}" stroke-linecap="round">${Array.from({ length: 9 }, (_, i) => `<ellipse cx="500" cy="${170 + i * 35}" rx="${230 - i * 22}" ry="${40 - i * 3}" stroke-width="${3 + i * 0.7}" opacity="${0.25 + i * 0.075}"/>`).join("")}</g><g data-ride><g transform="rotate(-28 500 330)"><path d="M445 220C420 260 415 350 435 425Q455 475 500 478Q545 475 565 425C585 350 580 260 555 220Q500 175 445 220Z" fill="#ff9560" stroke="#995b3f" stroke-width="8"/><path d="M450 300Q475 270 500 260Q525 270 550 300M500 260V350" fill="none" stroke="#fff0ce" stroke-width="24" stroke-linecap="round"/><path d="M447 405Q500 445 553 405" fill="none" stroke="#e77547" stroke-width="6"/></g></g>`;
      break;
    case "bubbles":
      body = `<g data-rise>${Array.from({ length: 20 }, () => {
        const x = 200 + random() * 600,
          y = 150 + random() * 350,
          r = 18 + random() * 45;
        return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="${glass}" stroke="${color}" stroke-width="3"/><path d="M${x - r * 0.6} ${y}Q${x - r * 0.6} ${y - r * 0.7} ${x} ${y - r * 0.65}" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"/></g>`;
      }).join("")}</g>`;
      break;
    case "rocket":
      body = `<g stroke="${color}" stroke-width="3" opacity=".6">${Array.from({ length: 8 }, (_, i) => `<path data-draw d="M${320 + i * 52} 590L${240 + i * 60} 280"/>`).join("")}</g><g data-launch><path d="M460 380L500 460L540 380L525 525L500 590L475 525Z" fill="${gold}"/><path d="M450 360Q440 225 500 170Q560 225 550 360Z" fill="#e8f2ff" stroke="#607994" stroke-width="6"/><circle cx="500" cy="270" r="24" fill="#6cc6ff" stroke="#315787" stroke-width="7"/><path d="M450 310L410 400L455 377M550 310L590 400L545 377" fill="${color}"/></g>`;
      break;
    case "blast":
      body = `<circle data-grow cx="500" cy="330" r="230" fill="${glow}"/><g data-pulse stroke="#ffb73f" fill="${gold}"><path d="M500 110L540 240L640 170L600 275L760 300L620 350L710 440L570 405L530 570L475 410L345 490L390 370L240 340L395 295L320 190L455 240Z" stroke-width="5"/></g><g data-expand fill="none" stroke="${color}" stroke-width="12">${ring(140, 12)}${ring(210, 6)}${ring(280, 3)}</g><g data-bomb><circle cx="500" cy="340" r="104" fill="#263147" stroke="#d6dfea" stroke-width="5"/><path d="M550 248L570 210" stroke="#1a2335" stroke-width="32"/><path d="M570 210Q640 185 620 135" fill="none" stroke="#ffc765" stroke-width="10" stroke-linecap="round"/><path d="M610 110L625 130L650 115L637 142L660 160L628 155L610 180L612 150L585 140L614 134Z" fill="#fff2a9"/><path d="M442 300Q430 330 440 360" fill="none" stroke="#8c9ab1" stroke-width="16" stroke-linecap="round"/></g>`;
      break;
    case "ice":
      body = `<g fill="${glass}" stroke="#bcf5ff" stroke-width="4">${Array.from({ length: 9 }, (_, i) => `<path data-grow d="M${180 + i * 75} 530L${200 + i * 75} ${160 + random() * 170}L${235 + i * 75} 500Z"/>`).join("")}</g><g data-spin fill="none" stroke="${color}" stroke-width="6">${Array.from({ length: 6 }, (_, i) => `<g transform="rotate(${i * 60} 500 310)"><path data-draw d="M500 310L500 130M500 210L455 175M500 210L545 175M500 160L475 140M500 160L525 140"/></g>`).join("")}</g>`;
      break;
    case "lightning":
      body = `<g fill="#26344b">${[250, 350, 470, 590, 700].map((x, i) => `<circle cx="${x}" cy="${160 + (i % 2) * 22}" r="${65 + i * 3}"/>`).join("")}</g><g fill="none" stroke-linecap="round" stroke-linejoin="round">${Array.from(
        { length: 5 },
        (_, i) => {
          const x = 270 + i * 110;
          return `<path data-bolt d="M${x} 190L${x - 35} 280L${x + 30} 270L${x - 20} 400L${x + 15} 375L${x - 50} 520" stroke="${color}" stroke-width="15"/><path data-bolt d="M${x} 190L${x - 35} 280L${x + 30} 270L${x - 20} 400L${x + 15} 375L${x - 50} 520" stroke="white" stroke-width="4"/>`;
        },
      ).join("")}</g>`;
      break;
    case "bloom":
      body = `<g data-sway><path data-draw d="M500 395Q450 510 525 590M497 480Q405 410 380 470Q420 535 497 480M509 525Q590 445 630 475Q595 550 509 525" stroke="#58a77b" stroke-width="13" fill="#85d3a0"/><g data-petal><path d="M500 205C420 115 330 170 350 255C255 285 290 400 390 405C420 490 560 485 610 405C720 390 735 275 650 250C660 155 570 130 500 205Z" fill="#e9538d" stroke="#ffd0df" stroke-width="5"/></g><g data-petal><path d="M500 235C440 190 385 255 410 305C350 345 425 410 480 390C540 450 630 375 590 320C650 245 555 200 500 235Z" fill="#ff9dbd" stroke="#ffcfda" stroke-width="5"/></g><g data-petal data-rose-core><path d="M500 275C450 245 440 300 480 315C465 355 535 370 555 335C595 285 535 255 500 275Z" fill="#c7386e" stroke="#ffc3d9" stroke-width="6"/><path d="M488 288Q535 275 535 315Q520 340 494 316" fill="#fa7ba5" stroke="#ffd7df" stroke-width="5"/></g></g>`;
      break;
    case "parade":
      body = `<g data-ride>${Array.from({ length: 6 }, (_, i) => `<svg x="${140 + i * 125}" y="${270 + (i % 2) * 40}" width="100" height="100" viewBox="0 0 16 16"><image href="/art/beast.png" width="64" height="16" style="image-rendering:pixelated"/></svg>`).join("")}</g><g data-rise opacity=".4">${Array.from({ length: 10 }, () => `<circle cx="${random() * 1000}" cy="${400 + random() * 100}" r="${20 + random() * 25}" fill="#93a88b"/>`).join("")}</g>`;
      break;
    case "ink":
      body = `<g data-grow fill="#2c1257">${Array.from({ length: 13 }, () => `<ellipse cx="${280 + random() * 440}" cy="${200 + random() * 280}" rx="${40 + random() * 80}" ry="${30 + random() * 75}"/>`).join("")}</g><g data-drip fill="#4a2383">${Array.from({ length: 11 }, (_, i) => `<rect x="${180 + i * 60}" y="340" width="${20 + random() * 35}" height="${80 + random() * 160}" rx="18"/>`).join("")}</g>`;
      break;
    case "galaxy":
      body = `<circle cx="500" cy="330" r="280" fill="${glow}"/><g data-spin fill="none" stroke="${color}">${[120, 165, 220].map((r, i) => `<ellipse cx="500" cy="330" rx="${r}" ry="${r * 0.45}" stroke-width="${9 - i * 2}" transform="rotate(${i * 55} 500 330)"/>`).join("")}</g><circle data-pulse cx="500" cy="330" r="82" fill="#100e28" stroke="#e6cdff" stroke-width="8"/><g data-spin fill="white">${Array.from({ length: 30 }, () => `<circle cx="${80 + random() * 840}" cy="${80 + random() * 480}" r="${1 + random() * 4}"/>`).join("")}</g>`;
      break;
    case "spotlight":
      body = `<path d="M360 650L450 260L550 260L640 650Z" fill="#b9244e" opacity=".7"/><g data-sway><path d="M80 30L420 560L740 560Z" fill="${gold}" opacity=".2"/><path d="M920 30L260 560L580 560Z" fill="white" opacity=".16"/></g><g fill="#aa1646"><path data-curtain-left d="M0 0H350Q320 300 0 430Z"/><path data-curtain-right d="M1000 0H650Q680 300 1000 430Z"/></g><g data-grow fill="${gold}">${[260, 740].map((x) => `<path d="M${x - 45} 240L${x} 170L${x + 45} 240L${x + 70} 200L${x + 55} 300H${x - 55}L${x - 70} 200Z"/>`).join("")}</g>`;
      break;
    case "train":
      body = `<path d="M0 520H1000M0 545H1000" stroke="#637588" stroke-width="8"/><g data-train><rect x="200" y="315" width="250" height="145" rx="28" fill="#486c8b"/><rect x="220" y="270" width="90" height="110" rx="12" fill="#9cc5dd"/><rect x="385" y="235" width="35" height="100" rx="8" fill="#9ca7ba"/><path d="M440 400L500 465H440Z" fill="#d5693d"/>${[280, 390, 580, 730].map((x) => `<g data-wheel><circle cx="${x}" cy="470" r="46" fill="#263a4b" stroke="${color}" stroke-width="12"/><path d="M${x - 30} 470H${x + 30}M${x} 440V500" stroke="#eee" stroke-width="5"/></g>`).join("")}<rect x="500" y="350" width="280" height="90" rx="15" fill="${color}"/><g data-smoke fill="#d5e2ee" opacity=".65"><circle cx="400" cy="180" r="38"/><circle cx="350" cy="140" r="50"/><circle cx="285" cy="120" r="65"/></g></g>`;
      break;
    case "arcade":
      body = `<path d="M250 100H750L800 570H200Z" fill="#211b46" fill-opacity=".7" stroke="${color}" stroke-width="9"/><g data-pulse fill="${gold}" stroke="white" stroke-width="5">${[
        [360, 240],
        [630, 270],
        [490, 390],
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="43"/>`)
        .join(
          "",
        )}</g><g data-pinball><circle cx="500" cy="190" r="24" fill="white" stroke="${color}" stroke-width="5"/></g><path d="M340 525L460 550M660 525L540 550" stroke="#ff789c" stroke-width="24" stroke-linecap="round"/>`;
      break;
    case "disco":
      body = `<g data-sway opacity=".3"><path d="M500 70L50 650H400Z" fill="#ff54c2"/><path d="M500 70L950 650H600Z" fill="#54f7dc"/><path d="M500 70L400 650H600Z" fill="#cfff42"/></g><g data-spin>${Array.from(
        { length: 9 },
        (_, row) =>
          Array.from({ length: 9 }, (_, col) => {
            const x = 410 + col * 20,
              y = 150 + row * 20;
            if (Math.hypot(x - 500, y - 240) > 90) return "";
            return `<rect x="${x}" y="${y}" width="17" height="17" fill="${(row + col) % 2 ? color : "#fff"}"/>`;
          }).join(""),
      ).join("")}</g><g data-pulse stroke="${color}" opacity=".7">${rays}</g>`;
      break;
    case "comic":
      body = `<g data-expand stroke="${color}" stroke-width="7">${rays}</g><g data-sway fill="#fff4a0" stroke="#26223a" stroke-width="10"><path d="M500 170L555 270L685 245L620 350L680 450L540 430L485 530L435 420L300 440L365 330L320 230L450 260Z"/></g>`;
      break;
    case "ocean":
      body = `<g data-wave>${[0, 1, 2].map((i) => `<path d="M-100 ${340 + i * 80}Q100 ${250 + i * 80} 300 ${340 + i * 80}T700 ${340 + i * 80}T1100 ${340 + i * 80}V700H-100Z" fill="${i === 0 ? "#65e4f1" : i === 1 ? "#278bd0" : "#1557a2"}" opacity=".55"/>`).join("")}</g><g data-swim>${Array.from({ length: 7 }, (_, i) => `<g transform="translate(${80 + i * 140} ${200 + (i % 3) * 70})"><ellipse rx="40" ry="22" fill="${i % 2 ? "#ffd065" : color}"/><path d="M-35 0L-65 -25V25Z" fill="${color}"/><circle cx="20" cy="-5" r="4" fill="#202d54"/></g>`).join("")}</g>`;
      break;
    case "slash":
      body = `<g data-sway fill="none" stroke-linecap="round"><path data-draw d="M200 530Q500 60 850 210" stroke="${color}" stroke-width="60"/><path data-draw d="M200 530Q500 60 850 210" stroke="white" stroke-width="12"/><path data-draw d="M200 170Q600 260 800 530" stroke="#ff654d" stroke-width="35"/></g><g data-expand stroke="${color}" stroke-width="2" opacity=".5">${rays}</g>`;
      break;
    case "cards":
      body = `<g data-cards>${["#ff6262", "#579bff", "#54d49b", "#ffd55c"].map((c, i) => `<g transform="rotate(${(i - 1.5) * 18} 500 400)"><g data-deal><rect x="425" y="180" width="150" height="220" rx="22" fill="${c}" stroke="white" stroke-width="8"/><ellipse cx="500" cy="290" rx="45" ry="70" fill="none" stroke="white" stroke-width="10" transform="rotate(25 500 290)"/></g></g>`).join("")}</g><g data-expand fill="none" stroke="${color}" stroke-width="5">${ring(230)}</g>`;
      break;
    case "dragon":
      body = `<g data-sway fill="none" stroke-linecap="round"><path data-draw d="M200 510C180 270 750 590 720 290S360 110 530 230S820 200 740 130" stroke="${color}" stroke-width="45"/><path data-draw d="M200 510C180 270 750 590 720 290S360 110 530 230S820 200 740 130" stroke="#fff3a5" stroke-width="9"/></g><path data-pulse d="M720 160L690 95L750 120L795 85L775 150L835 190L770 200Z" fill="${gold}"/><circle cx="767" cy="155" r="8" fill="#e24834"/>`;
      break;
    case "crown":
      body = `<g data-rise><path d="M320 230L400 310L500 180L600 310L680 230L630 440H370Z" fill="${gold}" stroke="#b07428" stroke-width="8"/><path d="M370 450H630" stroke="#fff2b1" stroke-width="24" stroke-linecap="round"/>${[400, 500, 600].map((x, i) => `<path d="M${x} 320L${x + 20} 350L${x} 380L${x - 20} 350Z" fill="${i === 1 ? "#fa5967" : "#6fc9ff"}"/>`).join("")}</g><g data-expand fill="none" stroke="${color}" stroke-width="5">${ring(240)}</g>`;
      break;
    case "harvest":
      body = `<g data-grow fill="${gold}" stroke="#a9b549" stroke-width="6">${Array.from(
        { length: 9 },
        (_, i) => {
          const x = 220 + i * 70;
          return `<g><path data-draw d="M${x} 540L${x} 280"/><ellipse cx="${x - 15}" cy="330" rx="13" ry="28" transform="rotate(-40 ${x - 15} 330)"/><ellipse cx="${x + 15}" cy="370" rx="13" ry="28" transform="rotate(40 ${x + 15} 370)"/><ellipse cx="${x - 15}" cy="410" rx="13" ry="28" transform="rotate(-40 ${x - 15} 410)"/></g>`;
        },
      ).join("")}</g>`;
      break;
    case "gems":
      body = `<g data-spin>${Array.from({ length: 6 }, (_, i) => `<g transform="rotate(${i * 60} 500 330)"><path data-pulse d="M460 120L500 70L540 120L500 220Z" fill="${i % 2 ? "#addcff" : color}" stroke="white" stroke-width="4"/><path d="M460 120H540M500 70V220" stroke="white" stroke-opacity=".5" stroke-width="2"/></g>`).join("")}</g><g data-pulse fill="none" stroke="${color}">${ring(100, 6)}</g>`;
      break;
    case "alchemy":
      body = `<g data-sway><path d="M455 120H545V255L650 470Q660 520 610 530H390Q340 520 350 470L455 255Z" fill="${glass}" stroke="#b4e9ed" stroke-width="9"/><path d="M405 360Q480 320 595 360L635 470Q640 505 605 510H395Q360 505 365 470Z" fill="${color}" opacity=".8"/></g><g data-rise fill="${color}" opacity=".6">${Array.from({ length: 9 }, () => `<circle cx="${390 + random() * 220}" cy="${220 + random() * 220}" r="${10 + random() * 28}"/>`).join("")}</g>`;
      break;
    case "runes":
      body = `<g data-spin fill="none" stroke="${color}" stroke-width="5">${ring(220)}${ring(180)}<path d="M500 100L700 445H300ZM500 560L300 215H700Z"/><path data-draw d="M280 330Q500 80 720 330Q500 580 280 330"/></g><g data-pulse><circle cx="500" cy="330" r="100" fill="${glow}"/></g>`;
      break;
    case "achievementEpic":
      body = `<g data-rise><path d="M380 180H620V300Q620 420 500 470Q380 420 380 300Z" fill="${gold}" stroke="white" stroke-width="8"/><path d="M380 220Q300 230 310 320Q320 400 395 390M620 220Q700 230 690 320Q680 400 605 390" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round"/><path d="M450 470H550V520H450Z" fill="${color}"/><path d="M400 520H600V550H400Z" fill="${gold}" stroke="white" stroke-width="6"/></g><g data-spin fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="14 18"><circle cx="500" cy="320" r="190"/><circle cx="500" cy="320" r="235"/></g><g data-pulse><circle cx="500" cy="315" r="105" fill="${glow}"/></g><g data-expand fill="none" stroke="${color}" stroke-width="4">${ring(275, 3)}${ring(330, 2)}</g><g data-bolt fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round">${Array.from({ length: 6 }, (_, i) => `<path d="M${140 + i * 145} 90L${180 + i * 130} 180L${150 + i * 135} 250"/>`).join("")}</g>`;
      break;
    case "achievementLegendary":
      body = `<g data-sway opacity=".28" fill="${gold}">${Array.from({ length: 14 }, (_, i) => `<path d="M500 330L${500 + Math.cos((i * Math.PI) / 7) * 820} ${330 + Math.sin((i * Math.PI) / 7) * 820}L${500 + Math.cos(((i + 0.16) * Math.PI) / 7) * 820} ${330 + Math.sin(((i + 0.16) * Math.PI) / 7) * 820}Z"/>`).join("")}</g><g data-rise><path d="M300 300Q180 250 140 340Q190 390 315 370L380 340Z" fill="${color}" stroke="#fff" stroke-width="5"/><path d="M700 300Q820 250 860 340Q810 390 685 370L620 340Z" fill="${color}" stroke="#fff" stroke-width="5"/><path d="M320 230L390 310L500 190L610 310L680 230L635 450H365Z" fill="${gold}" stroke="#fff4b0" stroke-width="8"/><path d="M365 455H635" stroke="#fff" stroke-width="20" stroke-linecap="round"/>${[400, 500, 600].map((x, i) => `<path d="M${x} 320L${x + 22} 352L${x} 384L${x - 22} 352Z" fill="${i === 1 ? "#ff5967" : "#6fc9ff"}"/>`).join("")}</g><g data-expand fill="none" stroke="${color}" stroke-width="5">${ring(210, 6)}${ring(285, 3)}</g><g data-fall fill="${gold}">${Array.from({ length: 18 }, () => `<circle cx="${160 + random() * 680}" cy="${80 + random() * 140}" r="${4 + random() * 8}"/>`).join("")}</g>`;
      break;
    case "achievementMythic":
      body = `<circle cx="500" cy="330" r="300" fill="${glow}"/><g data-spin fill="none" stroke="${color}" stroke-width="8"><ellipse cx="500" cy="330" rx="285" ry="118" transform="rotate(18 500 330)"/><ellipse cx="500" cy="330" rx="230" ry="90" transform="rotate(-32 500 330)"/><ellipse cx="500" cy="330" rx="180" ry="62" transform="rotate(64 500 330)"/></g><g data-spin fill="white">${Array.from({ length: 46 }, () => `<circle cx="${60 + random() * 880}" cy="${50 + random() * 560}" r="${1 + random() * 4}"/>`).join("")}</g><g data-rise><path d="M320 260L390 335L500 195L610 335L680 260L635 500H365Z" fill="${gold}" stroke="#fff8cf" stroke-width="8"/><path d="M365 505H635" stroke="#fff" stroke-width="22" stroke-linecap="round"/><circle cx="500" cy="360" r="36" fill="${color}" stroke="#fff" stroke-width="7"/></g><g data-pulse><circle cx="500" cy="330" r="120" fill="${glow}"/><circle cx="500" cy="330" r="62" fill="none" stroke="#fff" stroke-width="7"/></g><g data-bolt fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => `<path d="M${500 + Math.cos((i * Math.PI) / 4) * 250} ${330 + Math.sin((i * Math.PI) / 4) * 250}L${500 + Math.cos((i * Math.PI) / 4) * 330} ${330 + Math.sin((i * Math.PI) / 4) * 330}L${500 + Math.cos(((i + 0.12) * Math.PI) / 4) * 390} ${330 + Math.sin(((i + 0.12) * Math.PI) / 4) * 390}"/>`).join("")}</g><g data-expand fill="none" stroke="${color}" stroke-width="4">${ring(320, 3)}${ring(390, 2)}</g>`;
      break;
  }
  if (!body) body = cinemaProps(scene, color, gold, glass);
  body = body
    .replaceAll(`fill="${color}"`, `fill="url(#${id}-paint)"`)
    .replaceAll('fill="#e8f2ff"', `fill="url(#${id}-pearl)"`);
  return `${defs}<ellipse cx="500" cy="330" rx="430" ry="300" fill="url(#${id}-aura)"/><g data-scene="${scene}">${body}</g>`;
}
