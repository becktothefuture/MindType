# Obsolete Files (v0.6 Migration)

This folder contains files that have been removed or replaced as part of the v0.6 migration to align with the PDF guide requirements.

## Removed Files

### Replaced Transformers
- `contextTransformer.ts` - Replaced by `contextTransformer_v06.ts`
- `toneTransformer.ts` - Replaced by `toneTransformer_v06.ts` 
- Related test files that imported old transformers

### Obsolete Concepts
- `tapestry.ts` / `tapestry.rs` - Legacy concept replaced by Active Region
- `tapestry.spec.ts` - Tests for obsolete tapestry

### Pre-v0.6 Documentation
- `_development/` folder - Contains old v0.4 documentation, replaced by docs/00-index/
- `whats-new-v0.4.md` - Outdated changelog

## Migration Notes

These files were moved here on Nov 1, 2025 as part of the PDF-aligned refactor. 

All imports and references have been updated to use the new v06 transformers.

The system now uses:
- Three-stage pipeline: Noise → Context → Tone
- Deterministic-first approach
- Active Region (not tapestry)
- Living guide documentation in docs/00-index/
