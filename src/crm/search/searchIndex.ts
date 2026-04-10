/**
 * Client-Side Search Index
 * ========================
 * Builds an in-memory index from loaded contacts for instant UI filtering.
 * Heavy/comprehensive searches fall back to Supabase GIN index queries.
 */

import { normalizeForSearch } from './normalizer';
import { lightStem } from './arabicStemmer';
import { expandSearchQuery } from './translitMap';
import type { CrmContact } from '@/types/crm';

interface SearchIndexEntry {
  contactId: string;
  terms: string[];  // normalized, stemmed terms for matching
}

/**
 * Build a search index from a contacts array.
 * Each contact gets indexed by normalized versions of their name fields,
 * email, phone, job title, and tags.
 */
export function buildSearchIndex(contacts: CrmContact[]): SearchIndexEntry[] {
  return contacts.map(contact => {
    const rawTerms = [
      contact.firstName,
      contact.lastName,
      contact.firstNameAr,
      contact.lastNameAr,
      contact.email,
      contact.phone,
      contact.jobTitle,
      contact.jobTitleAr,
      contact.department,
      ...(contact.tags || []),
    ]
      .filter(Boolean)
      .map(t => t as string);

    // Normalize and stem each term
    const terms: string[] = [];
    for (const raw of rawTerms) {
      const normalized = normalizeForSearch(raw);
      terms.push(normalized);
      // Also add stemmed version for Arabic
      const stemmed = lightStem(normalized);
      if (stemmed !== normalized) terms.push(stemmed);
    }

    return { contactId: contact.id, terms };
  });
}

/**
 * Search the index with a query string.
 * Returns matching contact IDs ranked by relevance.
 */
export function searchIndex(
  index: SearchIndexEntry[],
  query: string
): string[] {
  if (!query.trim()) return index.map(e => e.contactId);

  const normalizedQuery = normalizeForSearch(query);
  const stemmedQuery = lightStem(normalizedQuery);

  // Get cross-script expansions
  const expansions = expandSearchQuery(query);
  const normalizedExpansions = expansions.map(normalizeForSearch);

  // All search terms to try (original + stemmed + expansions)
  const searchTerms = [
    normalizedQuery,
    stemmedQuery,
    ...normalizedExpansions,
  ].filter(Boolean);

  // Score each contact
  const scored: { contactId: string; score: number }[] = [];

  for (const entry of index) {
    let score = 0;
    const joinedTerms = entry.terms.join(' ');

    for (const searchTerm of searchTerms) {
      for (const entryTerm of entry.terms) {
        // Exact match → highest score
        if (entryTerm === searchTerm) {
          score += 10;
        }
        // Starts with → high score
        else if (entryTerm.startsWith(searchTerm)) {
          score += 5;
        }
        // Contains → medium score
        else if (entryTerm.includes(searchTerm)) {
          score += 2;
        }
      }

      // Also check joined string for multi-word queries
      if (joinedTerms.includes(searchTerm)) {
        score += 1;
      }
    }

    if (score > 0) {
      scored.push({ contactId: entry.contactId, score });
    }
  }

  // Sort by score descending, then return IDs
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.contactId);
}
