/*
╔══════════════════════════════════════════════════════════════╗
║  ░  T A P E S T R Y   ( S P A N  T R A C K I N G )      ░░░░  ║
║                                                              ║
║                                                              ║
║                                                              ║
║                                                              ║
║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
║                                                              ║
║                                                              ║
║                                                              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Tracks validated, unvalidated, and animated regions
  • WHY  ▸ Basis for band rendering and undo grouping
  • HOW  ▸ Minimal span representation with timestamps
*/

#[derive(Clone, Debug)]
pub struct Span {
    pub start: usize,
    pub end: usize,
    pub applied_at_ms: u64,
}

#[derive(Default)]
pub struct Tapestry {
    pub validated: Vec<Span>,
}

impl Tapestry {
    pub fn new() -> Self { Self { validated: Vec::new() } }
    pub fn push(&mut self, span: Span) { self.validated.push(span); }
}



