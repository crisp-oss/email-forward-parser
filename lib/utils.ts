/*
 * This file is part of email-forward-parser
 *
 * Copyright (c) 2026 Crisp IM SAS
 * All rights belong to Crisp IM SAS
 */

/**************************************************************************
 * IMPORTS
 ***************************************************************************/

// NPM
import RE2 from "re2";

/**************************************************************************
 * FUNCTIONS
 ***************************************************************************/

type LoopRegexesMode = "match" | "split" | "replace";
type LoopRegexesResult<Mode extends LoopRegexesMode> = (
  Mode extends "replace" ? string : RegExpMatchArray
);

/**
 * Executes multiple regular expressions until one succeeds
 */
export function loopRegexes<Mode extends LoopRegexesMode = "match">(
  regexes: RegExp[], str: string, mode: Mode = ("match" as Mode), highestPosition: boolean = true
): LoopRegexesResult<Mode> {
  let match: string | RegExpMatchArray | null = null;

  const minLength = (mode === "split") ? 1 : 0;
  const maxLength = str.length;

  for (let i = 0; i < regexes.length; i++) {
    let regex = regexes[i];

    if (typeof regex === "string") {
      // Build the regex
      regex = new RE2(regex);
    }

    const activeMode: LoopRegexesMode = mode;

    const currentMatch = (
      regex[activeMode](str || "", (mode === "replace") ? "" : undefined)
    );

    if (mode === "replace") {
      match = currentMatch;

      // A successfull replace must return a smaller string than the input
      if (match.length < maxLength) {
        break;
      }
    } else if (mode === "split" || mode === "match") {
      // A successfull split must return an array with at least two items
      if ((currentMatch?.length || 0) > minLength) {
        if (highestPosition === true) {
          // No previous match?
          if (!match) {
            // Save match and continue looking for other matches
            match = currentMatch;
          } else {
            let higher = false;

            if (mode === "match") {
              higher = (match as RegExpMatchArray).index > currentMatch.index;
            } else if (mode === "split") {
              higher = match[0].length > currentMatch[0].length;
            }

            // Match positioned higher than previous one?
            if (higher) {
              // Replace match and continue looking for other matches
              match = currentMatch;
            }
          }
        } else {
          // Save match and stop
          match = currentMatch;

          break;
        }
      }
    }
  }

  return (
    (mode === "replace") ? (match || "") : (match || ([] as unknown as RegExpMatchArray))
  ) as LoopRegexesResult<Mode>;
}

/**
 * Reconciliates match substrings after a "split" operation
 */
export function reconciliateSplitMatch(
  match: string[],
  minSubstrings: number,
  defaultSubstrings: number[],
  fnExclude: ((index: number) => boolean) | null = null
): string {
  let currentString = "";

  // Add default substrings
  for (let i = 0; i < defaultSubstrings.length; i++) {
    currentString += match[defaultSubstrings[i]];
  }

  // More substrings than expected?
  if (match.length > minSubstrings) {
    // Reconciliate them
    for (let i = minSubstrings; i < match.length; i++) {
      let exclude = false;

      // Exclude the substring?
      if (typeof fnExclude === "function") {
        exclude = fnExclude(i);
      }

      if (exclude === false) {
        currentString += match[i];
      }
    }
  }

  return currentString;
}

/**
 * Trims a string
 */
export function trimString(str: string | null): string {
  return ((str || "").trim() || "");
}
