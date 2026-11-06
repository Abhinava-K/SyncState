export function humanizeTitle(raw?: string | null): { title: string; slug: string } {
  if (!raw) return { title: 'Untitled Meeting', slug: '#meeting' };
  
  if (raw.includes('_')) {
    const parts = raw.split('_').filter(Boolean);
    if (parts[0]?.toLowerCase() === 'meeting' && parts[1] && !isNaN(Number(parts[1]))) {
      const num = parts[1];
      const rest = parts.slice(2).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return {
        title: `Meeting ${num}: ${rest || 'Sync'}`,
        slug: `#m${num}`,
      };
    } else {
      const title = parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return { title, slug: `#${parts[0].toLowerCase()}` };
    }
  }

  const mMatch = raw.match(/^Meeting\s+(\d+)[:\s]+(.*)/i);
  if (mMatch) {
    return {
      title: `Meeting ${mMatch[1]}: ${mMatch[2]}`,
      slug: `#m${mMatch[1]}`,
    };
  }

  return { title: raw, slug: `#${raw.slice(0, 4).toLowerCase().replace(/\s+/g, '')}` };
}

export function parseSpeaker(speakerStr: string): { name: string; role?: string; monogram: string } {
  if (!speakerStr) return { name: 'Unknown', monogram: 'UN' };
  const match = speakerStr.match(/^(.*?)\s*\((.*?)\)$/);
  let name = speakerStr;
  let role: string | undefined = undefined;
  if (match) {
    name = match[1].trim();
    role = match[2].trim();
  }
  const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  let monogram = 'SP';
  if (parts.length >= 2) {
    monogram = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    monogram = parts[0].substring(0, 2).toUpperCase();
  } else if (parts.length === 1) {
    monogram = parts[0][0].toUpperCase();
  }
  return { name, role, monogram };
}

export function getMonogram(name?: string | null): string {
  if (!name) return 'SP';
  const clean = name.replace(/\(.*\)/, '').replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }
  return 'SP';
}

export function findMatchingTurnIndex(
  item: {
    turn_index?: number | null;
    verbatim_quote?: string | null;
    assignee?: string | null;
    speaker?: string | null;
    task?: string | null;
    statement?: string | null;
  },
  turns?: { turn_index: number; speaker: string; text: string }[] | null
): number | null {
  if (!turns || turns.length === 0) return null;

  // 1. Verbatim quote exact or significant text match
  const quote = (item.verbatim_quote || '').trim().toLowerCase();
  if (quote.length > 5) {
    const exact = turns.find((t) => t.text.toLowerCase().includes(quote));
    if (exact) return exact.turn_index;

    // Word token overlap
    const words = quote.split(/\s+/).filter((w) => w.length > 3);
    if (words.length > 0) {
      let bestTurn = -1;
      let maxMatches = 0;
      for (const t of turns) {
        const textLower = t.text.toLowerCase();
        const matches = words.filter((w) => textLower.includes(w)).length;
        if (matches > maxMatches && matches >= Math.min(2, words.length)) {
          maxMatches = matches;
          bestTurn = t.turn_index;
        }
      }
      if (bestTurn !== -1) return bestTurn;
    }
  }

  // 2. Look for turn where assignee is speaker or where speaker addressed/appointed assignee
  const assignee = (item.assignee || '').trim().toLowerCase();
  const speaker = (item.speaker || '').trim().toLowerCase();

  if (assignee) {
    // Check if a turn's text directly appoints this person (e.g., "Sarah: Alex, can you take ownership...", "Bobby, please take...")
    const appointedTurn = turns.find((t) => {
      const textLower = t.text.toLowerCase();
      return (
        textLower.includes(assignee) &&
        (textLower.includes('can you') ||
          textLower.includes('please take') ||
          textLower.includes('take ownership') ||
          textLower.includes('take responsibility') ||
          textLower.includes('implement') ||
          textLower.includes('work on') ||
          textLower.includes('handle') ||
          textLower.includes('assigned'))
      );
    });
    if (appointedTurn) return appointedTurn.turn_index;

    // Check turn spoken by assignee committing to it (e.g., "Alex: I will take responsibility...")
    const assigneeSpokenTurn = turns.find((t) => {
      const spkLower = t.speaker.toLowerCase();
      return spkLower.includes(assignee);
    });
    if (assigneeSpokenTurn) return assigneeSpokenTurn.turn_index;
  }

  if (speaker) {
    const speakerTurn = turns.find((t) => t.speaker.toLowerCase().includes(speaker));
    if (speakerTurn) return speakerTurn.turn_index;
  }

  // 3. Fallback to valid item.turn_index if within bounds
  if (typeof item.turn_index === 'number' && item.turn_index >= 0 && item.turn_index < turns.length) {
    return item.turn_index;
  }

  return 0;
}


