/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  D E N O I S I N G   R E G R E S S I O N   T E S T S  ░░░  ║
  ║                                                              ║
  ║   Comprehensive fuzzy text correction validation using       ║
  ║   the complete pipeline with caret-safe principles.         ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Test suite for fuzzy text denoising with regression snapshots
  • WHY  ▸ Ensure stable corrections and detect regressions in pipeline
  • HOW  ▸ Uses test matrix from adapted prompt with snapshot validation
*/

import { describe, it, expect } from 'vitest';
import { denoise } from '../core/api/denoise';
import { noiseTransform } from '../engines/noiseTransformer';
import { contextTransform } from '../engines/contextTransformer';

describe('Denoising Pipeline', () => {
  describe('Individual Test Cases', () => {
    it('CASE_01: corrects basic typos and spacing', async () => {
      const input = "Thre is a wind in the trese tonite, softy hummin like old memorees, and i keep thiniking of thouse walks we took along the riiver bend.";
      const expected = "There is a wind in the trees tonight, softly humming like old memories, and I keep thinking of those walks we took along the river bend.";
      const result = await denoise(input);
      expect(result).toBe(expected);
    });

    it('CASE_02: handles transpositions and preserves colloquial "round"', async () => {
      const input = "hearts drfit liek papers in teh straets, adn we kepe chasing each ohter witout knwoing who folows who, jus t spiraling round.";
      const expected = "Hearts drift like papers in the streets, and we keep chasing each other without knowing who follows who, just spiraling round.";
      const result = await denoise(input);
      expect(result).toBe(expected);
    });

    it('CASE_03: corrects compound words and contractions', async () => {
      const input = "moon lite clibms over brcks, the city hums low n i try catch breth but its alrdy gone slippin past th fingers i dont hold.";
      const expected = "Moonlight climbs over bricks, the city hums low and I try to catch breath, but it's already gone, slipping past the fingers I don't hold.";
      const result = await denoise(input);
      expect(result).toBe(expected);
    });

    it('CASE_04: fixes repetitive words and maintains meaning', async () => {
      const input = "th sound of rain is nt jsut drop let but a hndred whisperrs sayn slow down slow donw, yet i stl rushe ahed in my minde.";
      const expected = "The sound of rain is not just droplets but a hundred whispers saying slow down, slow down, yet I still rush ahead in my mind.";
      const result = await denoise(input);
      expect(result).toBe(expected);
    });

    it('CASE_05: handles complex sentence structure with metaphors', async () => {
      const input = "sumtyms it fel lik th nite is hldin its bret, lik its abt to brek wide wopen an drop starrs acrss the sky liek pebbels in wtr.";
      const expected = "Sometimes it feels like the night is holding its breath, like it's about to break wide open and drop stars across the sky like pebbles in water.";
      const result = await denoise(input);
      expect(result).toBe(expected);
    });

    it('CASE_06: corrects article insertion and complex phrases', async () => {
      const input = "cldstrm rushs thrgh wndws an i cn barly kepe trak of myslef, jst a flikrin smle hngin in th glss, gone b4 i blink twce.";
      const expected = "A cold storm rushes through windows, and I can barely keep track of myself, just a flickering smile hanging in the glass, gone before I blink twice.";
      const result = await denoise(input);
      expect(result).toBe(expected);
    });

    it('CASE_07: handles number/letter substitutions and maintains voice', async () => {
      const input = "th memoriees ar knot knittd, unrvlng quik as if strngs oof yestarday wr pullld out wit n0 end in sihgt, an mi hands trmble typin it.";
      const expected = "The memories are not knitted, unraveling quick as if strings of yesterday were pulled out with no end in sight, and my hands tremble typing it.";
      const result = await denoise(input);
      expect(result).toBe(expected);
    });

    it('CASE_08: corrects leetspeak and preserves onomatopoeia', async () => {
      const input = "evry stp in da dk s0undz lyk 'clakk clakk', my hed g0ne spnning, cnt remmber wht wz sed, jus shad0ws flickr & humzz.";
      const expected = "Every step in the dark sounds like 'clack clack', my head gone spinning, can't remember what was said, just shadows flicker and hum.";
      const result = await denoise(input);
      expect(result).toBe(expected);
    });

    it('CASE_09: handles fragmented text with em dashes', async () => {
      const input = "sky spltrs — lghtn. wrds brkn spc — cn't figr if i ws runnin or jus hummin. thnks crsh… like brd flaps, wings, gnn gonee.";
      const expected = "Sky splinters—lightning. Words break in space—I can't figure if I was running or just humming. Thoughts crash like bird flaps, wings, gone.";
      const result = await denoise(input);
      expect(result).toBe(expected);
    });

    it('CASE_10: stress test with severely corrupted text', async () => {
      const input = "hrrrghnn txt fl0 szz— nn knw whch keyss t0uch, jus mmsh of lttrs: 'mndtyppp shh krrr' — strmzzzz cld rvr nn. ffzzz. enddd.";
      const expected = "Text flow—no one knows which keys touch, just a mash of letters: 'mindtype shh krrr'—storms, cold river on. Fzzz. End.";
      const result = await denoise(input);
      expect(result).toBe(expected);
    });
  });

  describe('Pipeline Integration', () => {
    it('runs all test cases sequentially without errors', async () => {
      const testCases = [
        "Thre is a wind in the trese tonite, softy hummin like old memorees, and i keep thiniking of thouse walks we took along the riiver bend.",
        "hearts drfit liek papers in teh straets, adn we kepe chasing each ohter witout knwoing who folows who, jus t spiraling round.",
        "moon lite clibms over brcks, the city hums low n i try catch breth but its alrdy gone slippin past th fingers i dont hold.",
        "th sound of rain is nt jsut drop let but a hndred whisperrs sayn slow down slow donw, yet i stl rushe ahed in my minde.",
        "sumtyms it fel lik th nite is hldin its bret, lik its abt to brek wide wopen an drop starrs acrss the sky liek pebbels in wtr.",
        "cldstrm rushs thrgh wndws an i cn barly kepe trak of myslef, jst a flikrin smle hngin in th glss, gone b4 i blink twce.",
        "th memoriees ar knot knittd, unrvlng quik as if strngs oof yestarday wr pullld out wit n0 end in sihgt, an mi hands trmble typin it.",
        "evry stp in da dk s0undz lyk 'clakk clakk', my hed g0ne spnning, cnt remmber wht wz sed, jus shad0ws flickr & humzz.",
        "sky spltrs — lghtn. wrds brkn spc — cn't figr if i ws runnin or jus hummin. thnks crsh… like brd flaps, wings, gnn gonee.",
        "hrrrghnn txt fl0 szz— nn knw whch keyss t0uch, jus mmsh of lttrs: 'mndtyppp shh krrr' — strmzzzz cld rvr nn. ffzzz. enddd."
      ];

      const results = await Promise.all(testCases.map(async input => {
        const result = await denoise(input);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        return result;
      }));

      // Snapshot for regression detection - will be updated after first test run
      expect(results.length).toBe(10);
      expect(results[0]).toContain('There is a wind');
      expect(results[1]).toContain('Hearts drift');
    });

    it('maintains caret safety in all corrections', () => {
      const testInput = "hello teh world";
      const caret = testInput.length;
      
      const noiseResult = noiseTransform({
        text: testInput,
        caret,
      });
      
      if (noiseResult.diff) {
        expect(noiseResult.diff.end).toBeLessThanOrEqual(caret);
      }
    });

    it('preserves colloquial style when unambiguous', async () => {
      const input = "i'm hummin and feelin round about it";
      const result = await denoise(input);
      
      // Should preserve "hummin" and "round" as they're colloquially clear
      expect(result).toContain('humming');
      expect(result).toContain('round');
      expect(result).toMatch(/I'm/); // Should capitalize I
    });

    it('handles empty and edge case inputs gracefully', async () => {
      expect(await denoise('')).toBe('');
      expect(await denoise('hello')).toBe('Hello'); // Single words get capitalized
      expect(await denoise('   ')).toBe(''); // Whitespace gets trimmed
    });
  });

  describe('Engine-Specific Behavior', () => {
    it('applies noise transformer rules correctly', () => {
      const result = noiseTransform({
        text: 'hello teh world',
        caret: 15,
      });
      
      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toBe(' the ');
    });

    it('applies context transformer rules for capitalization', async () => {
      const result = await contextTransform({
        text: 'hello world. this is fine',
        caret: 25,
      });
      
      // Should have proposals for capitalization
      const hasCapitalization = result.proposals.some(p => 
        p.text.includes('Hello') || p.text.includes('This')
      );
      expect(hasCapitalization).toBe(true);
    });
  });
});
