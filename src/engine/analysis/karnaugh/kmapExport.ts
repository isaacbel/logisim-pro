/**
 * Karnaugh Map Exporter (SVG & CSV) (2 to 6 variables)
 */

import { KMapStructure } from './kmap';
import { KMapGroupVisual } from './grouping';

export function kmapToCsv(structure: KMapStructure): string {
  const { rowHeaders, colHeaders, planes, rowVarNames, colVarNames } = structure;
  const sections: string[] = [];

  planes.forEach(plane => {
    const title = plane.planeHeader ? `--- Plane: ${plane.planeHeader} ---` : '';
    const headerLine = [`${rowVarNames.join('')}\\${colVarNames.join('')}`, ...colHeaders].join(',');

    const rows = plane.grid.map((row, rIdx) => {
      const rowLabel = rowHeaders[rIdx];
      const cellVals = row.map(c => c.value);
      return [rowLabel, ...cellVals].join(',');
    });

    if (title) sections.push(title);
    sections.push([headerLine, ...rows].join('\n'));
  });

  return sections.join('\n\n');
}

export function kmapToSvgString(
  structure: KMapStructure,
  groups: KMapGroupVisual[] = []
): string {
  const { numPlanes, numRows, numCols, rowHeaders, colHeaders, planes, rowVarNames, colVarNames } = structure;
  const cellW = 55;
  const cellH = 45;
  const headerPadX = 70;
  const headerPadY = 45;
  const planeGap = 30;

  const singlePlaneW = headerPadX + numCols * cellW + 15;
  const totalW = numPlanes === 1 ? singlePlaneW : (singlePlaneW * Math.min(numPlanes, 2)) + (numPlanes > 1 ? planeGap : 0);
  const singlePlaneH = headerPadY + numRows * cellH + 25;
  const totalH = (singlePlaneH * (numPlanes > 2 ? 2 : 1)) + (numPlanes > 2 ? planeGap : 0) + 10;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" style="background:#1e1e2e; font-family:monospace;">\n`;

  planes.forEach((plane, pIdx) => {
    const gridX = (pIdx % 2) * (singlePlaneW + planeGap);
    const gridY = Math.floor(pIdx / 2) * (singlePlaneH + planeGap);

    // Plane Title if multi-plane
    if (plane.planeHeader) {
      svg += `  <text x="${gridX + singlePlaneW / 2}" y="${gridY + 20}" fill="#cba6f7" font-size="13" font-weight="bold" text-anchor="middle">${plane.planeHeader}</text>\n`;
    }

    const offsetY = gridY + (plane.planeHeader ? 20 : 0);

    // Axis label
    svg += `  <text x="${gridX + headerPadX / 2}" y="${offsetY + headerPadY / 2 + 5}" fill="#89b4fa" font-size="12" font-weight="bold" text-anchor="middle">${rowVarNames.join('')} \\ ${colVarNames.join('')}</text>\n`;

    // Column headers
    colHeaders.forEach((ch, cIdx) => {
      const cx = gridX + headerPadX + cIdx * cellW + cellW / 2;
      svg += `  <text x="${cx}" y="${offsetY + headerPadY - 10}" fill="#89b4fa" font-size="11" font-weight="bold" text-anchor="middle">${ch}</text>\n`;
    });

    // Row headers
    rowHeaders.forEach((rh, rIdx) => {
      const ry = offsetY + headerPadY + rIdx * cellH + cellH / 2 + 4;
      svg += `  <text x="${gridX + headerPadX - 12}" y="${ry}" fill="#89b4fa" font-size="11" font-weight="bold" text-anchor="middle">${rh}</text>\n`;
    });

    // Grid cells & values
    plane.grid.forEach((row, rIdx) => {
      row.forEach((cell, cIdx) => {
        const x = gridX + headerPadX + cIdx * cellW;
        const y = offsetY + headerPadY + rIdx * cellH;

        // Cell border
        svg += `  <rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="#181825" stroke="#313244" stroke-width="1.5" />\n`;

        // Value
        const valColor = cell.value === 1 ? '#a6e3a1' : cell.value === 'X' ? '#f9e2af' : '#6c7086';
        svg += `  <text x="${x + cellW / 2}" y="${y + cellH / 2 + 5}" fill="${valColor}" font-size="14" font-weight="bold" text-anchor="middle">${cell.value}</text>\n`;

        // Minterm sub-label
        svg += `  <text x="${x + cellW - 3}" y="${y + cellH - 3}" fill="#45475a" font-size="8" text-anchor="end">m${cell.minterm}</text>\n`;
      });
    });

    // Group overlays for this plane
    groups.forEach(g => {
      g.cells.filter(c => c.plane === pIdx).forEach(c => {
        const x = gridX + headerPadX + c.col * cellW + 2;
        const y = offsetY + headerPadY + c.row * cellH + 2;
        svg += `  <rect x="${x}" y="${y}" width="${cellW - 4}" height="${cellH - 4}" rx="4" fill="${g.color}" fill-opacity="0.25" stroke="${g.color}" stroke-width="2" stroke-dasharray="${g.isEssential ? 'none' : '4,2'}" />\n`;
      });
    });
  });

  svg += `</svg>`;
  return svg;
}
