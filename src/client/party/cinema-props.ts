import type { PartySceneId } from "../../domain/party/stage";
export function cinemaProps(
  scene: PartySceneId,
  color: string,
  gold: string,
  glass: string,
): string {
  switch (scene) {
    case "cash":
      return `<g data-sway>${[0, 1, 2, 3, 4].map((i) => `<g transform="translate(${210 + i * 115} ${250 + (i % 2) * 95}) rotate(${(i - 2) * 12})"><rect width="150" height="82" rx="12" fill="#81c89d" stroke="#d6ffe2" stroke-width="5"/><rect x="12" y="12" width="126" height="58" rx="7" fill="none" stroke="#317450" stroke-width="3"/><ellipse cx="75" cy="41" rx="22" ry="25" fill="#e3f8bd"/></g>`).join("")}</g><g data-pulse>${[320, 500, 680].map((x) => `<circle cx="${x}" cy="470" r="32" fill="${gold}" stroke="#fff5b3" stroke-width="5"/>`).join("")}</g>`;
    case "circus":
      return `<g data-sway>${[0, 1, 2].map((i) => `<g transform="translate(${270 + i * 230} ${280 + (i % 2) * 80})"><path d="M-75 -55L0 -180L75 -55Z" fill="${color}" stroke="#fff" stroke-width="5"/><circle cy="-180" r="16" fill="#ffe790"/><circle r="88" fill="#fff4e5" stroke="#f5b3c8" stroke-width="5"/><path d="M-60 -22L-30 -55L-12 -16M12 -16L30 -55L60 -22" fill="#6bbef9"/><circle cx="-32" cy="-12" r="7" fill="#253244"/><circle cx="32" cy="-12" r="7" fill="#253244"/><circle cy="10" r="21" fill="#f65a73"/><path d="M-40 40Q0 93 40 40" fill="#f65a73" stroke="#fff" stroke-width="7"/></g>`).join("")}</g>`;
    case "shadow":
      return `<g data-sway>${[0, 1, 2].map((i) => `<g transform="translate(${330 + i * 170} 310)" opacity="${0.2 + i * 0.3}"><circle cy="-75" r="38" fill="${color}"/><path d="M-50 -32Q0 -62 50 -32L85 120H-85Z" fill="${color}"/><path d="M-28 -80H28" stroke="#fff" stroke-width="9"/><path d="M-110 30L-25 -10M110 30L25 -10" stroke="${color}" stroke-width="25" stroke-linecap="round"/></g>`).join("")}</g><path data-draw d="M170 470Q460 380 840 190" fill="none" stroke="white" stroke-width="6"/>`;
    case "heal":
      return `<g data-pulse><path d="M500 220C380 130 280 300 365 405Q430 485 500 505Q570 485 635 405C720 300 620 130 500 220Z" fill="#ffacb5" stroke="#ffe3c6" stroke-width="8"/><path d="M500 220Q540 120 625 165Q600 245 500 220" fill="#7bd0a2"/><path d="M500 280V420M430 350H570" stroke="white" stroke-width="35" stroke-linecap="round"/></g><g data-expand fill="none" stroke="#b6f1d3" stroke-width="8"><ellipse cx="500" cy="400" rx="250" ry="100"/></g>`;
    case "tiles":
      return `<g data-cards>${[-1, 0, 1].map((i) => `<g transform="translate(${410 + i * 140} ${230 + Math.abs(i) * 35}) rotate(${i * 10} 65 100)"><rect width="130" height="200" rx="18" fill="#83b7a2"/><rect y="-10" width="130" height="190" rx="18" fill="#fff8de" stroke="#d6b461" stroke-width="5"/>${[0, 1, 2].map((n) => `<circle cx="65" cy="${40 + n * 48}" r="17" fill="${i === 0 ? "#d76a62" : "#33846e"}"/>`).join("")}</g>`).join("")}</g><g data-expand fill="none" stroke="${color}" stroke-width="4"><ellipse cx="500" cy="450" rx="300" ry="90"/></g>`;
    case "graph":
      return `<g stroke="#9fbcd0" opacity=".35" fill="none">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${200 + i * 100} 140V530M180 ${150 + i * 60}H820"/>`).join("")}</g><path d="M180 430H840M320 540V120" stroke="#e8faff" stroke-width="4"/><path data-draw d="M200 470C300 480 360 140 480 260S650 560 820 180" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"/><g data-pulse fill="white"><circle cx="480" cy="260" r="14"/><circle cx="820" cy="180" r="14"/></g>`;
    case "runway":
      return `<path d="M360 570L450 140H550L640 570Z" fill="#24334d" stroke="#99b8d6" stroke-width="4"/><path d="M500 170V580" stroke="white" stroke-width="8" stroke-dasharray="30 26"/><g data-pulse fill="${color}">${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${445 - i * 14}" cy="${180 + i * 65}" r="7"/><circle cx="${555 + i * 14}" cy="${180 + i * 65}" r="7"/>`).join("")}</g><g data-launch><path d="M500 175L530 300L680 395V425L530 380L520 470L565 510V530L500 505L435 530V510L480 470L470 380L320 425V395L470 300Z" fill="#f1f8ff" stroke="#9dbfe0" stroke-width="5"/></g>`;
    case "trail":
      return `<path d="M250 450L375 260L500 450L625 260L750 450" fill="none" stroke="#afffdb" stroke-width="9" stroke-dasharray="12 14"/>${[0, 1, 2, 3, 4].map((i) => `<g transform="translate(${250 + i * 125} ${i % 2 ? 260 : 450})"><ellipse cy="22" rx="43" ry="18" fill="#073c40" opacity=".4"/><circle r="35" fill="${i % 2 ? "#99dfce" : color}" stroke="white" stroke-width="5"/></g>`).join("")}<circle data-pulse cx="500" cy="450" r="65" fill="none" stroke="${color}" stroke-width="7"/>`;
    case "umbrella":
      return `<g data-sway><path d="M230 330Q500 -40 770 330Q685 260 635 330Q560 260 500 330Q440 260 365 330Q315 260 230 330Z" fill="${color}" stroke="#dcefff" stroke-width="7"/><path d="M500 150V490Q500 560 440 535Q410 520 425 495" fill="none" stroke="#f3deb8" stroke-width="17" stroke-linecap="round"/><path d="M365 330Q380 190 500 150Q620 190 635 330" fill="none" stroke="white" stroke-opacity=".6" stroke-width="4"/></g>`;
    case "clock":
      return `<rect x="462" y="65" width="76" height="50" rx="12" fill="${gold}"/><circle cx="500" cy="330" r="215" fill="#17243a" stroke="${gold}" stroke-width="18"/><circle cx="500" cy="330" r="187" fill="none" stroke="#dcecff" stroke-width="3"/>${Array.from({ length: 12 }, (_, i) => `<path d="M500 160V180" stroke="#dfedff" stroke-width="8" transform="rotate(${i * 30} 500 330)"/>`).join("")}<g data-hand><path d="M500 330V205M500 330L590 370" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"/></g><circle cx="500" cy="330" r="14" fill="white"/>`;
    case "speech":
      return `<g data-sway>${[0, 1, 2].map((i) => `<g transform="translate(${180 + i * 180} ${150 + i * 95})"><path d="M0 0H340Q365 0 365 25V125Q365 150 340 150H100L40 195V150H25Q0 150 0 125Z" fill="${i % 2 ? "#e4edff" : color}" stroke="#fff" stroke-width="5"/><path d="M50 50H295M50 95H230" stroke="#34445a" stroke-width="12" stroke-linecap="round"/></g>`).join("")}</g>`;
    case "monster":
      return `<g data-pulse><path d="M300 230L260 100L400 195M600 195L740 100L700 230" fill="#ffcda5" stroke="#ffedbf" stroke-width="5"/><path d="M300 220Q500 100 700 220L735 450Q500 575 265 450Z" fill="${color}" stroke="#fcdbc3" stroke-width="7"/><path d="M330 270L455 300M545 300L670 270" stroke="#243449" stroke-width="16"/><ellipse cx="410" cy="325" rx="26" ry="32" fill="white"/><ellipse cx="590" cy="325" rx="26" ry="32" fill="white"/><circle cx="410" cy="330" r="11" fill="#263345"/><circle cx="590" cy="330" r="11" fill="#263345"/><path d="M380 420Q500 480 620 420L570 470H430Z" fill="#2f2947"/><path d="M420 435L440 468L460 444M540 444L560 468L580 435" fill="white"/></g>`;
    case "wish":
      return `<g data-sway><rect x="450" y="130" width="100" height="65" rx="13" fill="${gold}"/><path d="M455 190H545V235Q655 265 650 400Q645 535 500 540Q355 535 350 400Q345 265 455 235Z" fill="${glass}" stroke="#d6f7ff" stroke-width="7"/><path d="M375 420Q500 360 625 420Q610 510 500 515Q390 510 375 420Z" fill="${color}" opacity=".45"/></g><g data-pulse fill="#fff5b4">${[0, 1, 2, 3, 4].map((i) => `<path d="M${420 + i * 40} ${280 + (i % 2) * 70}l8 20 20 0-16 13 6 20-18-12-18 12 6-20-16-13 20 0Z"/>`).join("")}</g>`;
    case "meteor":
      return `<g data-sway><path d="M210 150L470 260L540 110L635 315L815 275L670 470L450 435Z" fill="#ff9c43" opacity=".75"/><path d="M300 210L520 310L570 200L650 370L750 360L640 440L470 415Z" fill="#ffe29a"/><path d="M500 345L555 290L650 315L695 390L660 465L555 480L485 420Z" fill="#655f6e" stroke="#d9c4b4" stroke-width="7"/><path d="M545 360L600 345L625 390L585 430M640 340L655 375" fill="none" stroke="#aaa0a7" stroke-width="10"/></g>`;
    case "band":
      return `<g data-sway><rect x="400" y="160" width="200" height="260" rx="95" fill="#d4dfef" stroke="white" stroke-width="7"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M430 ${210 + i * 35}H570" stroke="#62738c" stroke-width="10"/>`).join("")}<path d="M365 330V375Q365 470 500 470Q635 470 635 375V330M500 470V550M430 550H570" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round"/></g><g data-pulse fill="none" stroke="${color}" stroke-width="7"><path d="M300 230Q220 330 300 430M700 230Q780 330 700 430M240 180Q125 330 240 480M760 180Q875 330 760 480"/></g>`;
    default:
      return "";
  }
}
